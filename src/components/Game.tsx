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
        if (!lost) flash(data.result === "close" ? "🟨 Quase! O ano é próximo." : "🟥 Não é esse… a cena ficou mais nítida.");
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
      ? "Cena Infinita"
      : `Cena do Dia #${puzzle.number}`
    : "";

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 -mx-4 mb-4 flex items-center justify-between border-b border-white/5 bg-[#07060b]/70 px-4 py-3 backdrop-blur-xl">
        <button id="home-button" onClick={() => setMode({ kind: "daily" })} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-rose-500 text-lg shadow-lg shadow-rose-500/30">🎬</span>
          <h1 className="font-display text-3xl leading-none tracking-wider text-white">
            CENA<span className="text-amber-300">DO</span>DIA
          </h1>
        </button>
        <nav className="flex items-center gap-1">
          <IconBtn id="help-open" label="Como jogar" onClick={() => setModal("help")}>?</IconBtn>
          <IconBtn id="stats-open" label="Estatísticas" onClick={() => setModal("stats")}>📊</IconBtn>
          <button
            id="premium-open"
            onClick={() => setModal("premium")}
            className="ml-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1.5 text-xs font-bold text-black shadow-lg shadow-amber-500/30 transition hover:scale-105"
          >
            {auth.premium ? "📚 Arquivo" : "⭐ Premium"}
          </button>
          {auth.configured &&
            (auth.user ? (
              <IconBtn id="signout" label="Sair" onClick={auth.signOut}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {auth.user.user_metadata?.avatar_url ? <img src={auth.user.user_metadata.avatar_url} alt="" className="h-7 w-7 rounded-full" /> : "👤"}
              </IconBtn>
            ) : (
              <IconBtn id="signin" label="Entrar" onClick={auth.signIn}>👤</IconBtn>
            ))}
        </nav>
      </header>

      {/* Subheader */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
            {puzzle?.mode === "infinite" ? "Modo infinito" : puzzle?.mode === "archive" ? "Arquivo" : "Desafio diário"}
          </div>
          <div className="text-2xl font-bold text-white">
            {label || "Carregando…"}
            {puzzle?.date && <span className="ml-2 text-base font-normal text-white/40">{fmtDate(puzzle.date)}</span>}
          </div>
        </div>
        <Attempts guesses={game?.guesses ?? []} />
      </div>

      {puzzle?.demo && (
        <div className="mb-3 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100/80">
          ⚙️ Modo demonstração offline — adicione <code className="text-amber-200">TMDB_API_KEY</code> no <code>.env.local</code> para usar filmes reais.
        </div>
      )}

      {error && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="mb-3 text-rose-300">{error}</p>
          <button className="btn-primary" onClick={() => load(mode)}>Tentar de novo</button>
        </div>
      )}

      {!puzzle && !error && <div className="scene-frame shimmer" />}

      {puzzle && game && (
        <main className="space-y-4">
          <SceneImage key={puzzle.image} src={puzzle.image} stage={stage} done={done} seed={puzzle.number ?? puzzle.token.length} />

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

          {game.guesses.length > 0 && (
            <ul className="space-y-2">
              {game.guesses.map((g, i) => (
                <li key={g.id} className={`guess-row guess-${g.result} animate-fade-up`} style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="text-lg">{g.result === "correct" ? "🟩" : g.result === "close" ? "🟨" : "🟥"}</span>
                  <span className="flex-1 truncate font-medium">{g.title}</span>
                  {g.year && <span className="text-sm opacity-60">{g.year}</span>}
                </li>
              ))}
            </ul>
          )}

          <HintPanel puzzle={puzzle} stage={stage} done={done} mask={game.reveal > 0 || done ? game.mask : undefined} />

          {!done && game.reveal < 6 && (
            <button
              id="extra-hint"
              onClick={() => (auth.premium && auth.configured ? grantLetter() : ad.show())}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-300/30 py-3 text-sm font-semibold text-amber-200/90 transition hover:border-amber-300/70 hover:bg-amber-300/5"
            >
              <span className="transition group-hover:scale-125">📺</span>
              {auth.premium && auth.configured ? "Revelar uma letra do título" : "Assistir anúncio para revelar uma letra"}
            </button>
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
        <p className="mt-4 text-center text-sm text-white/50">Próxima cena em <span className="font-mono text-amber-200">{countdown}</span></p>
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
  return (
    <div className="flex gap-1.5" aria-label="Tentativas">
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const g = guesses[i];
        const c = !g ? "bg-white/10" : g.result === "correct" ? "bg-emerald-400" : g.result === "close" ? "bg-amber-400" : "bg-rose-500";
        return <span key={i} className={`h-2.5 w-6 rounded-full transition-all duration-500 ${c}`} />;
      })}
    </div>
  );
}
