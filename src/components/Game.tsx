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
        if (!lost) flash(data.result === "close" ? "Quase! O ano é próximo." : "Não é esse… o cartaz abriu mais!");
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
    flash("Letra revelada!");
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
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 border border-white/10 mb-2">
            AD · Publicidade
          </span>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/50">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </div>
          <span className="text-xs font-semibold text-white/70">Espaço de Anúncio</span>
          <span className="text-[10px] text-white/30 mt-1">160 x 600</span>
          <div className="mt-4 border-t border-white/5 pt-3 w-full">
            <button
              onClick={() => setModal("premium")}
              className="text-[10px] text-white/70 hover:text-white underline"
            >
              Remover anúncios com VIP
            </button>
          </div>
        </aside>
      )}

      {/* Conteúdo Central do Jogo */}
      <div className="relative flex w-full max-w-3xl flex-1 flex-col">
      {/* Header Compacto Estilo Cinema */}
      <header className="sticky top-0 z-40 -mx-4 mb-3 flex items-center justify-between border-b border-white/10 bg-black/90 px-4 py-2.5 backdrop-blur-md">
        <button id="home-button" onClick={() => setMode({ kind: "daily" })} className="group flex items-center gap-2.5 transition">
          <div className="grid h-8 w-8 place-items-center rounded bg-[#e50914] text-white font-black shadow-md shadow-[#e50914]/20 transition group-hover:scale-105">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 3v2h2V7H4zm0 4v2h2v-2H4zm0 4v2h2v-2H4zm14-8v2h2V7h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2zM8 7h8v10H8V7z"/></svg>
          </div>
          <div className="flex items-baseline gap-2 text-left">
            <h1 className="font-display text-3xl font-black tracking-widest text-[#e50914] uppercase drop-shadow-sm">
              CINELE
            </h1>
            <span className="hidden sm:inline-block text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase">
              Cinema Daily
            </span>
          </div>
        </button>

        <nav className="flex items-center gap-1.5">
          <button
            id="help-open"
            onClick={() => setModal("help")}
            className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            title="Como jogar"
          >
            <svg className="h-3.5 w-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            <span className="hidden sm:inline text-xs">Ajuda</span>
          </button>

          <button
            id="stats-open"
            onClick={() => setModal("stats")}
            className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            title="Estatísticas"
          >
            <svg className="h-3.5 w-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
            <span className="hidden sm:inline text-xs">Stats</span>
          </button>

          <button
            id="premium-open"
            onClick={() => setModal("premium")}
            className="flex items-center gap-1.5 rounded bg-[#e50914] px-3 py-1 text-[11px] font-black tracking-wider text-white transition hover:bg-[#b80710] sm:text-xs"
          >
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>{auth.premium ? "ÁREA VIP" : "ASSINAR VIP"}</span>
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
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
                <span className="hidden md:inline">Sair</span>
              </button>
            ) : (
              <button
                id="signin"
                onClick={auth.signIn}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="hidden md:inline">Entrar</span>
              </button>
            ))}
        </nav>
      </header>

      {/* Subheader Compacto */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mr-2">
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
            <p className="text-[11px] font-medium text-white/50">
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
                  <span className="flex items-center gap-1.5 font-semibold text-xs text-white/60 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                    {ordinalLabels[i] || `${i + 1}º`}
                  </span>
                  <span className="flex-1 truncate font-medium text-white">{g.title}</span>
                  {g.year && <span className="text-sm opacity-60">({g.year})</span>}
                </li>
              ))}
            </ul>
          )}

          <HintPanel puzzle={puzzle} stage={stage} done={done} mask={game.reveal > 0 || done ? game.mask : undefined} />

          {!done && game.reveal < 6 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                  <span className="rounded bg-white/10 px-1 py-0.2 border border-white/20 text-[9px] text-white">AD</span>
                  Espaço Publicitário
                </span>
                <span className="text-[10px] text-white/40">Dica bônus</span>
              </div>
              <button
                id="extra-hint"
                onClick={() => (auth.premium && auth.configured ? grantLetter() : ad.show())}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/10 shadow-sm"
              >
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                <span>{auth.premium && auth.configured ? "Revelar uma letra do título (VIP)" : "Assistir Anúncio Patrocinado para Revelar Letra"}</span>
              </button>
            </div>
          )}
        </main>
      )}

      <footer className="mt-10 text-center text-xs text-white/30">
        Dados e imagens locais. Todos os direitos reservados.
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-2xl animate-pop">{toast}</div>
      )}

      <HelpModal open={modal === "help"} onClose={() => (markHelp(), setModal(null))} />
      <Modal open={modal === "stats"} onClose={() => setModal(null)} title="Estatísticas" id="stats-modal">
        {stats && <StatsBlock stats={stats} />}
        <p className="mt-4 text-center text-sm text-white/50">Próximo cartaz em <span className="font-mono text-white font-bold">{countdown}</span></p>
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
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 border border-white/10 mb-2">
            AD · Publicidade
          </span>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/50">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </div>
          <span className="text-xs font-semibold text-white/70">Espaço de Anúncio</span>
          <span className="text-[10px] text-white/30 mt-1">160 x 600</span>
          <div className="mt-4 border-t border-white/5 pt-3 w-full">
            <button
              onClick={() => setModal("premium")}
              className="text-[10px] text-white/70 hover:text-white underline"
            >
              Remover anúncios com VIP
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
        <svg className="h-3.5 w-3.5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <span>Tentativas</span>
        <span className="font-mono text-white font-bold">
          {count}/{MAX_ATTEMPTS}
        </span>
      </div>
      <div className="flex gap-1.5 p-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
          const g = guesses[i];
          const c = !g
            ? "bg-white/10"
            : g.result === "correct"
              ? "bg-emerald-400"
              : g.result === "close"
                ? "bg-amber-400"
                : "bg-rose-500";
          return <span key={i} className={`h-2 w-5 rounded-full transition-all duration-300 ${c}`} />;
        })}
      </div>
    </div>
  );
}
