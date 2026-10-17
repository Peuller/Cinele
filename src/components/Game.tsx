"use client";
import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import SceneImage from "./SceneImage";
import GuessInput from "./GuessInput";
import HintPanel from "./HintPanel";
import PremiumModal from "./PremiumModal";
import { HelpModal, ResultModal, StatsBlock } from "./Modals";
import Modal from "./Modal";
import { useRewardedAd } from "./RewardedAd";
import { authHeaders, useAuth } from "@/lib/useAuth";
import { loadGame, loadStats, markHelp, recordDaily, saveGame, seenHelp, type GameState, type Stats } from "@/lib/storage";
import { MAX_ATTEMPTS, type GuessEntry, type GuessResponse, type MovieLite, type Puzzle } from "@/lib/types";

type Mode = { kind: "daily" } | { kind: "archive"; date: string } | { kind: "infinite" };

const todayBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

function useCountdown() {
  const [s, setS] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const br = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const left = 86400 - (br.getHours() * 3600 + br.getMinutes() * 60 + br.getSeconds());
      const p = (n: number) => String(n).padStart(2, "0");
      setS(`${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return s;
}

const fresh = (p: Puzzle): GameState => ({ guesses: [], status: "playing", reveal: 0, mask: p.mask });

export default function Game() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>({ kind: "daily" });
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [modal, setModal] = useState<null | "help" | "result" | "stats" | "premium">(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const countdown = useCountdown();
  const [today, setToday] = useState("");

  const storageKey = (p: Puzzle) => (p.mode === "infinite" ? `inf:${p.token}` : p.date!);

  const load = useCallback(
    async (m: Mode) => {
      setError(null);
      setPuzzle(null);
      setGame(null);
      const qs = m.kind === "archive" ? `?date=${m.date}` : m.kind === "infinite" ? "?random=1" : "";
      try {
        const res = await fetch(`/api/puzzle${qs}`, { headers: authHeaders(auth.session) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar");
        const p = data as Puzzle;
        setPuzzle(p);
        const saved = loadGame(storageKey(p));
        setGame(saved ?? fresh(p));
        if (saved && saved.status !== "playing") setTimeout(() => setModal("result"), 600);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [auth.session],
  );

  useEffect(() => {
    if (auth.loading) return;
    load(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, auth.loading]);

  useEffect(() => {
    setToday(todayBR());
    setStats(loadStats());
    if (!seenHelp()) setModal("help");
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const update = (g: GameState) => {
    setGame(g);
    if (puzzle) saveGame(storageKey(puzzle), g);
  };

  const submit = async (m: MovieLite | null) => {
    if (!puzzle || !game || game.status !== "playing" || busy) return;
    setBusy(true);
    const attempt = game.guesses.length + 1;
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: puzzle.token, guessId: m?.id ?? "skip", guessYear: m?.year ?? null, attempt }),
      });
      const data = (await res.json()) as GuessResponse;
      if (!res.ok) throw new Error();
      const entry: GuessEntry = m
        ? { id: m.id, title: m.title, year: m.year, result: data.result }
        : { id: `skip-${attempt}`, title: "Pulou", year: null, result: "wrong" };
      const guesses = [...game.guesses, entry];
      const won = data.result === "correct";
      const lost = !won && attempt >= MAX_ATTEMPTS;
      const next: GameState = { ...game, guesses, status: won ? "won" : lost ? "lost" : "playing", answer: data.answer };
      update(next);

      if (!won) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        if (!lost) flash(data.result === "close" ? "🟨 Quase! O ano é próximo." : "🟥 Não é esse… o cartaz abriu mais!");
      }
      if (won) celebrate();
      if (won || lost) {
        if (puzzle.mode === "daily") setStats(recordDaily(puzzle.date!, won, attempt));
        setTimeout(() => setModal("result"), won ? 1600 : 1200);
      }
    } catch {
      flash("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const celebrate = () => {
    const end = Date.now() + 1200;
    const colors = ["#fbbf24", "#f472b6", "#a78bfa", "#ffffff"];
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const grantLetter = async () => {
    if (!puzzle || !game) return;
    const res = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: puzzle.token, reveal: game.reveal + 1 }),
    });
    const { mask } = await res.json();
    update({ ...game, reveal: game.reveal + 1, mask });
    flash("🎁 Letra revelada!");
  };
  const ad = useRewardedAd(grantLetter);

  const wrong = game ? game.guesses.filter((g) => g.result !== "correct").length : 0;
  const done = game?.status !== "playing";
  const stage = Math.min(wrong, MAX_ATTEMPTS - 1);
  const label = puzzle
    ? puzzle.mode === "infinite"
      ? "Cartaz Infinito"
      : `Cartaz do Dia #${puzzle.number}`
    : "";

  const ordinalLabels = ["1º", "2º", "3º", "4º", "5º"];

  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-1 justify-center px-4 pb-6">
      {/* Banner Lateral Esquerdo (Desktop / Skyscraper) */}
      {!auth.premium && (
        <aside className="sticky top-16 hidden h-[600px] w-40 xl:flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-center text-white/40 mr-6 mt-4 backdrop-blur-sm shrink-0">
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/30 mb-2">
            AD · Publicidade
          </span>
          <div className="text-3xl mb-1">📢</div>
          <span className="text-xs font-semibold text-white/60">Espaço de Anúncio</span>
          <span className="text-[10px] text-white/30 mt-1">160 x 600</span>
          <div className="mt-4 border-t border-white/5 pt-3 w-full">
            <button
              onClick={() => setModal("premium")}
              className="text-[10px] text-amber-300/80 hover:text-amber-200 underline"
            >
              Remover anúncios com VIP 👑
            </button>
          </div>
        </aside>
      )}

      {/* Conteúdo Central do Jogo */}
      <div className="relative flex w-full max-w-3xl flex-1 flex-col">
      {/* Header Compacto */}
      <header className="sticky top-0 z-40 -mx-4 mb-2 flex items-center justify-between border-b border-white/5 bg-[#07060b]/85 px-4 py-1.5 backdrop-blur-xl">
        <button id="home-button" onClick={() => setMode({ kind: "daily" })} className="group flex items-center gap-2 transition">
          <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 shadow-md shadow-rose-500/20 transition duration-300 group-hover:scale-105">
            <span className="text-base">🎞️</span>
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" />
          </div>
          <div className="flex items-baseline gap-1.5 text-left">
            <h1 className="font-display text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-rose-400">
              CINELE
            </h1>
            <span className="hidden sm:inline-block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Diário
            </span>
          </div>
        </button>

        <nav className="flex items-center gap-1.5">
          <button
            id="help-open"
            onClick={() => setModal("help")}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            title="Como jogar"
          >
            <span className="text-xs">❓</span>
            <span className="hidden sm:inline text-xs">Ajuda</span>
          </button>

          <button
            id="stats-open"
            onClick={() => setModal("stats")}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            title="Estatísticas"
          >
            <span className="text-xs">📊</span>
            <span className="hidden sm:inline text-xs">Stats</span>
          </button>

          <button
            id="premium-open"
            onClick={() => setModal("premium")}
            className="relative group overflow-hidden rounded-lg bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 p-[1px] shadow-[0_0_15px_-3px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_1px_rgba(251,191,36,0.7)]"
          >
            <div className="relative flex items-center gap-1 rounded-[7px] bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 px-2.5 py-1 text-[11px] font-black tracking-wider text-black sm:text-xs">
              <span className="text-xs animate-bounce">👑</span>
              <span>{auth.premium ? "ÁREA VIP" : "VIRAR VIP"}</span>
            </div>
            {/* Efeito shimmer metálico */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </button>

          {auth.configured &&
            (auth.user ? (
              <button
                id="signout"
                onClick={auth.signOut}
                title="Sair"
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {auth.user.user_metadata?.avatar_url ? (
                  <img src={auth.user.user_metadata.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                ) : (
                  <span>👤</span>
                )}
                <span className="hidden md:inline">Sair</span>
              </button>
            ) : (
              <button
                id="signin"
                onClick={auth.signIn}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span>👤</span>
                <span className="hidden md:inline">Entrar</span>
              </button>
            ))}
        </nav>
      </header>

      {/* Subheader Compacto */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/80 mr-2">
            {puzzle?.mode === "infinite" ? "Infinito" : puzzle?.mode === "archive" ? "Arquivo" : "Diário"}
          </span>
          <span className="text-base font-bold text-white">
            {label || "Carregando…"}
            {puzzle?.date && <span className="ml-1.5 text-xs font-normal text-white/40">({fmtDate(puzzle.date)})</span>}
          </span>
        </div>
        <Attempts guesses={game?.guesses ?? []} />
      </div>

      {error && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="mb-3 text-rose-300">{error}</p>
          <button className="btn-primary" onClick={() => load(mode)}>Tentar de novo</button>
        </div>
      )}

      {!puzzle && !error && <div className="scene-frame shimmer" />}

      {puzzle && game && (
        <main className="space-y-3">
          {/* Chamada intuitiva do jogo */}
          <div className="text-center pt-0.5">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
              De qual filme é este cartaz?
            </h2>
            <p className="text-[11px] font-medium text-amber-200/70">
              O zoom se afasta e revela mais detalhes a cada tentativa incorreta.
            </p>
          </div>

          <SceneImage key={puzzle.image} src={puzzle.image} stage={stage} done={done} seed={puzzle.number ?? puzzle.token.length} />

          <div className="pt-3">
            {done ? (
              <div className="glass flex items-center justify-between gap-3 rounded-2xl p-4 animate-fade-up">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">{game.status === "won" ? "Você acertou!" : "Era…"}</div>
                  <div className="text-lg font-semibold text-white">{game.answer?.title} <span className="text-white/40">({game.answer?.year})</span></div>
                </div>
                <button id="show-result" className="btn-primary" onClick={() => setModal("result")}>Resultado</button>
              </div>
            ) : (
              <GuessInput disabled={busy} shake={shake} excluded={game.guesses.map((g) => g.id)} onGuess={submit} onSkip={() => submit(null)} />
            )}
          </div>

          {game.guesses.length > 0 && (
            <ul className="space-y-2">
              {game.guesses.map((g, i) => (
                <li key={g.id} className={`guess-row guess-${g.result} animate-fade-up`} style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="flex items-center gap-1.5 font-semibold text-xs text-white/60 bg-black/30 px-2 py-1 rounded-md border border-white/5">
                    {ordinalLabels[i] || `${i + 1}º`}
                  </span>
                  <span className="text-lg">{g.result === "correct" ? "🟩" : g.result === "close" ? "🟨" : "🟥"}</span>
                  <span className="flex-1 truncate font-medium">{g.title}</span>
                  {g.year && <span className="text-sm opacity-60">({g.year})</span>}
                </li>
              ))}
            </ul>
          )}

          <HintPanel puzzle={puzzle} stage={stage} done={done} mask={game.reveal > 0 || done ? game.mask : undefined} />

          {!done && game.reveal < 6 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300/60">
                  <span className="rounded bg-amber-400/20 px-1 py-0.2 border border-amber-400/30 text-[9px] text-amber-200">AD</span>
                  Espaço Publicitário
                </span>
                <span className="text-[10px] text-white/40">Dica bônus</span>
              </div>
              <button
                id="extra-hint"
                onClick={() => (auth.premium && auth.configured ? grantLetter() : ad.show())}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/5 py-3 text-sm font-semibold text-amber-200 transition hover:border-amber-400/80 hover:bg-amber-400/10 shadow-sm"
              >
                <span className="transition group-hover:scale-125">📺</span>
                <span>{auth.premium && auth.configured ? "Revelar uma letra do título (VIP)" : "Assistir Anúncio Patrocinado para Revelar Letra"}</span>
              </button>
            </div>
          )}
        </main>
      )}

      <footer className="mt-10 text-center text-xs text-white/30">
        Dados e imagens: <a className="underline hover:text-white/60" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>. Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-2xl animate-pop">{toast}</div>
      )}

      <HelpModal open={modal === "help"} onClose={() => (markHelp(), setModal(null))} />
      <Modal open={modal === "stats"} onClose={() => setModal(null)} title="Estatísticas" id="stats-modal">
        {stats && <StatsBlock stats={stats} />}
        <p className="mt-4 text-center text-sm text-white/50">Próximo cartaz em <span className="font-mono text-amber-200">{countdown}</span></p>
      </Modal>
      {game && puzzle && (
        <ResultModal
          open={modal === "result"}
          onClose={() => setModal(null)}
          won={game.status === "won"}
          answer={game.answer}
          guesses={game.guesses}
          label={label}
          stats={puzzle.mode === "daily" ? stats : null}
          nextIn={puzzle.mode === "daily" ? countdown : undefined}
          onPlayAgain={puzzle.mode === "infinite" ? () => (setModal(null), load({ kind: "infinite" })) : undefined}
        />
      )}
      <PremiumModal
        key={today}
        open={modal === "premium" && !!today}
        onClose={() => setModal(null)}
        premium={auth.premium}
        user={auth.user}
        configured={auth.configured}
        today={today}
        onSignIn={auth.signIn}
        onArchive={(d) => (setModal(null), setMode({ kind: "archive", date: d }))}
        onInfinite={() => (setModal(null), mode.kind === "infinite" ? load(mode) : setMode({ kind: "infinite" }))}
      />
      {ad.modal}
      </div>

      {/* Banner Lateral Direito (Desktop / Skyscraper) */}
      {!auth.premium && (
        <aside className="sticky top-16 hidden h-[600px] w-40 xl:flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-center text-white/40 ml-6 mt-4 backdrop-blur-sm shrink-0">
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/30 mb-2">
            AD · Publicidade
          </span>
          <div className="text-3xl mb-1">🍿</div>
          <span className="text-xs font-semibold text-white/60">Espaço de Anúncio</span>
          <span className="text-[10px] text-white/30 mt-1">160 x 600</span>
          <div className="mt-4 border-t border-white/5 pt-3 w-full">
            <button
              onClick={() => setModal("premium")}
              className="text-[10px] text-amber-300/80 hover:text-amber-200 underline"
            >
              Remover anúncios com VIP 👑
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

function IconBtn({ id, label, onClick, children }: { id: string; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button id={id} aria-label={label} title={label} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}

function Attempts({ guesses }: { guesses: GuessEntry[] }) {
  const count = guesses.length;
  return (
    <div className="flex flex-col items-end gap-1" aria-label="Tentativas">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
        <span>🎯</span>
        <span>Tentativas</span>
        <span className="font-mono text-amber-300 font-bold">
          {count}/{MAX_ATTEMPTS}
        </span>
      </div>
      <div className="flex gap-1.5 p-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
          const g = guesses[i];
          const c = !g
            ? "bg-white/10"
            : g.result === "correct"
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              : g.result === "close"
                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
          return <span key={i} className={`h-2 w-5 rounded-full transition-all duration-500 ${c}`} />;
        })}
      </div>
    </div>
  );
}
