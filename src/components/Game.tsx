"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { translations, type Lang } from "@/lib/i18n";
import LOCAL_MOVIES from "@/data/movies.json";

const MOVIE_TITLES: Record<string, { pt: string; en: string }> = {};
LOCAL_MOVIES.forEach((m: { id: string; title: string; originalTitle?: string; titleEn?: string }) => {
  MOVIE_TITLES[m.id] = {
    pt: m.title,
    en: m.titleEn || m.originalTitle || m.title,
  };
});

type Mode = { kind: "daily" } | { kind: "archive"; date: string } | { kind: "infinite" };

const todayBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const fmtDate = (d: string, l: Lang) =>
  new Date(d + "T12:00:00").toLocaleDateString(l === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "long" });

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

const fresh = (p: Puzzle): GameState => ({
  guesses: [],
  status: "playing",
  reveal: 0,
  mask: p.mask,
  maskEn: p.maskEn,
});

export default function Game() {
  const auth = useAuth();
  const [lang, setLangState] = useState<Lang>("pt");
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
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cinele_lang") as Lang | null;
      if (saved === "pt" || saved === "en") {
        setLangState(saved);
      }
    } catch {}
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    setLangMenuOpen(false);
    try {
      localStorage.setItem("cinele_lang", newLang);
    } catch {}
  };

  const t = translations[lang];
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
      const isSkip = !m;
      const ptTitle = isSkip ? "Pulou" : m.title;
      const enTitle = isSkip ? "Skipped" : (m.titleEn || m.originalTitle || m.title);
      const entry: GuessEntry = isSkip
        ? { id: `skip-${attempt}`, title: ptTitle, titleEn: enTitle, year: null, result: "wrong" }
        : { id: m.id, title: ptTitle, titleEn: enTitle, year: m.year, result: data.result };
      const guesses = [...game.guesses, entry];
      const won = data.result === "correct";
      const lost = !won && attempt >= MAX_ATTEMPTS;
      const next: GameState = { ...game, guesses, status: won ? "won" : lost ? "lost" : "playing", answer: data.answer };
      update(next);

      if (!won) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        if (!lost) flash(data.result === "close" ? t.closeHint : t.wrongHint);
      }
      if (won) celebrate();
      if (won || lost) {
        if (puzzle.mode === "daily") setStats(recordDaily(puzzle.date!, won, attempt));
        setTimeout(() => setModal("result"), won ? 1600 : 1200);
      }
    } catch {
      flash(t.connectionError);
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
    const { mask, maskEn } = await res.json();
    update({ ...game, reveal: game.reveal + 1, mask, maskEn });
    flash(t.letterRevealed);
  };
  const ad = useRewardedAd(grantLetter, lang);

  const wrong = game ? game.guesses.filter((g) => g.result !== "correct").length : 0;
  const done = game?.status !== "playing";
  const stage = Math.min(wrong, MAX_ATTEMPTS - 1);
  const label = puzzle
    ? puzzle.mode === "infinite"
      ? t.infinitePoster
      : t.dailyPoster(puzzle.number ?? 1)
    : "";

  const ordinalLabels = lang === "en" ? ["1st", "2nd", "3rd", "4th", "5th"] : ["1º", "2º", "3º", "4º", "5º"];

  return (
    <div className="min-h-screen flex flex-col w-full bg-black text-white selection:bg-[#e50914] selection:text-white">
      {/* Top Navbar / Header Full Width (Estilo Streaming / Cinema Profissional) */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Botão Hamburger (Apenas Mobile - Esquerda) */}
          <div className="flex sm:hidden items-center">
            <button
              id="mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/90 transition hover:bg-white/10 active:scale-95"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>

          {/* Brand / Logo (Centralizado no Mobile, à Esquerda no Desktop) */}
          <div className="flex flex-1 sm:flex-initial items-center justify-center sm:justify-start">
            <button
              id="home-button"
              onClick={() => { setMode({ kind: "daily" }); setMobileMenuOpen(false); }}
              className="group flex items-center gap-2 sm:gap-3 transition text-left"
            >
              <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded bg-[#e50914] text-white font-black shadow-md shadow-[#e50914]/25 transition group-hover:scale-105">
                <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 3v2h2V7H4zm0 4v2h2v-2H4zm0 4v2h2v-2H4zm14-8v2h2V7h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2zM8 7h8v10H8V7z" />
                </svg>
              </div>
              <div className="flex flex-col text-center sm:text-left">
                <span className="font-display text-2xl sm:text-3xl font-black tracking-widest text-[#e50914] leading-none uppercase drop-shadow-sm">
                  CINELE
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase">
                  {t.brandSubtitle}
                </span>
              </div>
            </button>
          </div>

          {/* Botão VIP Rápido no Mobile para equilibrar a centralização (Apenas Mobile - Direita) */}
          <div className="flex sm:hidden items-center">
            <button
              id="mobile-quick-vip"
              onClick={() => setModal("premium")}
              className="flex h-9 items-center gap-1 rounded-xl bg-[#e50914] px-2.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm shadow-[#e50914]/25"
            >
              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>VIP</span>
            </button>
          </div>

          {/* Navigation & Controls Desktop */}
          <nav className="hidden sm:flex items-center gap-2 sm:gap-3">
            {/* Dropdown Seletor de Idioma com Bandeiras */}
            <div ref={langMenuRef} className="relative">
              <button
                id="lang-toggle"
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/90 transition hover:border-white/30 hover:bg-white/10"
                title={t.switchLang}
                aria-expanded={langMenuOpen}
              >
                {lang === "pt" ? (
                  // Bandeira do Brasil
                  <svg className="h-3.5 w-5 rounded-[2px] shadow-sm" viewBox="0 0 720 504" fill="none">
                    <rect width="720" height="504" fill="#009c3b" />
                    <polygon points="360,42 678,252 360,462 42,252" fill="#ffdf00" />
                    <circle cx="360" cy="252" r="126" fill="#002776" />
                    <path d="M234,252 a126,126 0 0,0 248,32" stroke="#ffffff" strokeWidth="18" fill="none" />
                  </svg>
                ) : (
                  // Bandeira do Reino Unido (Union Jack)
                  <svg className="h-3.5 w-5 rounded-[2px] shadow-sm" viewBox="0 0 60 30" fill="none">
                    <clipPath id="uk-clip"><rect width="60" height="30" /></clipPath>
                    <g clipPath="url(#uk-clip)">
                      <rect width="60" height="30" fill="#012169" />
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                      <path d="M0,0 L60,30" stroke="#C8102E" strokeWidth="2" />
                      <path d="M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
                      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                    </g>
                  </svg>
                )}
                <span className="font-bold tracking-wider">{lang === "pt" ? "PT-BR" : "EN-UK"}</span>
                <svg className={`h-3 w-3 text-white/50 transition-transform ${langMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-white/15 bg-[#141416] p-1 shadow-2xl z-50 animate-pop">
                  <button
                    type="button"
                    onClick={() => setLang("pt")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${
                      lang === "pt"
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <svg className="h-3.5 w-5 shrink-0 rounded-[2px] shadow-sm" viewBox="0 0 720 504" fill="none">
                      <rect width="720" height="504" fill="#009c3b" />
                      <polygon points="360,42 678,252 360,462 42,252" fill="#ffdf00" />
                      <circle cx="360" cy="252" r="126" fill="#002776" />
                      <path d="M234,252 a126,126 0 0,0 248,32" stroke="#ffffff" strokeWidth="18" fill="none" />
                    </svg>
                    <span>Português</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${
                      lang === "en"
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <svg className="h-3.5 w-5 shrink-0 rounded-[2px] shadow-sm" viewBox="0 0 60 30" fill="none">
                      <rect width="60" height="30" fill="#012169" />
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                      <path d="M0,0 L60,30" stroke="#C8102E" strokeWidth="2" />
                      <path d="M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
                      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                    </svg>
                    <span>English</span>
                  </button>
                </div>
              )}
            </div>

            <button
              id="help-open"
              onClick={() => setModal("help")}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              title={t.howToPlay}
            >
              <svg className="h-3.5 w-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
              <span className="hidden sm:inline">{t.howToPlay}</span>
            </button>

            <button
              id="stats-open"
              onClick={() => setModal("stats")}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              title={t.stats}
            >
              <svg className="h-3.5 w-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" x2="18" y1="20" y2="10" />
                <line x1="12" x2="12" y1="20" y2="4" />
                <line x1="6" x2="6" y1="20" y2="14" />
              </svg>
              <span className="hidden sm:inline">{t.stats}</span>
            </button>

            <button
              id="premium-open"
              onClick={() => setModal("premium")}
              className="flex items-center gap-1.5 rounded-lg bg-[#e50914] px-3.5 py-1.5 text-xs font-black tracking-wider text-white shadow-md shadow-[#e50914]/25 transition hover:bg-[#b80710]"
            >
              <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{auth.premium ? t.vipArea : t.becomeVip}</span>
            </button>

            {auth.configured &&
              (auth.user ? (
                <button
                  id="signout"
                  onClick={auth.signOut}
                  title={t.signOut}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  {auth.user.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={auth.user.user_metadata.avatar_url} alt="" className="h-4.5 w-4.5 rounded-full" />
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                  <span className="hidden md:inline">{t.signOut}</span>
                </button>
              ) : (
                <button
                  id="signin"
                  onClick={auth.signIn}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="hidden md:inline">{t.signIn}</span>
                </button>
              ))}
          </nav>
        </div>

        {/* Menu Hambúrguer Drawer Dropdown no Mobile */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-[#0d0d10] px-4 py-3.5 space-y-2.5 animate-fade-down shadow-2xl">
            {/* Seletor de Idioma em linha cheia */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2">
              <span className="text-xs font-semibold text-white/70">{t.switchLang}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setLang("pt"); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    lang === "pt" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  <svg className="h-3 w-4 rounded-[2px]" viewBox="0 0 720 504" fill="none">
                    <rect width="720" height="504" fill="#009c3b" />
                    <polygon points="360,42 678,252 360,462 42,252" fill="#ffdf00" />
                    <circle cx="360" cy="252" r="126" fill="#002776" />
                    <path d="M234,252 a126,126 0 0,0 248,32" stroke="#ffffff" strokeWidth="18" fill="none" />
                  </svg>
                  <span>PT</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLang("en"); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    lang === "en" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  <svg className="h-3 w-4 rounded-[2px]" viewBox="0 0 60 30" fill="none">
                    <clipPath id="uk-clip-mob"><rect width="60" height="30" /></clipPath>
                    <g clipPath="url(#uk-clip-mob)">
                      <rect width="60" height="30" fill="#012169" />
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                      <path d="M0,0 L60,30" stroke="#C8102E" strokeWidth="2" />
                      <path d="M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
                      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                    </g>
                  </svg>
                  <span>EN</span>
                </button>
              </div>
            </div>

            {/* Como Jogar */}
            <button
              onClick={() => { setModal("help"); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10"
            >
              <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
              <span>{t.howToPlay}</span>
            </button>

            {/* Estatísticas */}
            <button
              onClick={() => { setModal("stats"); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10"
            >
              <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" x2="18" y1="20" y2="10" />
                <line x1="12" x2="12" y1="20" y2="4" />
                <line x1="6" x2="6" y1="20" y2="14" />
              </svg>
              <span>{t.stats}</span>
            </button>

            {/* Seja VIP / Área VIP */}
            <button
              onClick={() => { setModal("premium"); setMobileMenuOpen(false); }}
              className="flex w-full items-center justify-between rounded-xl bg-[#e50914] px-3.5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#e50914]/25 transition hover:bg-[#b80710]"
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>{auth.premium ? t.vipArea : t.becomeVip}</span>
              </div>
              <span className="text-[10px] text-white/70">PRO</span>
            </button>

            {/* Login / Logout */}
            {auth.configured && (
              auth.user ? (
                <button
                  onClick={() => { auth.signOut(); setMobileMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                >
                  <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{t.signOut}</span>
                </button>
              ) : (
                <button
                  onClick={() => { auth.signIn(); setMobileMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                >
                  <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{t.signIn}</span>
                </button>
              )
            )}
          </div>
        )}
      </header>

      {/* Main Body below Header */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 justify-center px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
        {/* Banner Lateral Esquerdo (Desktop / Skyscraper) */}
        {!auth.premium && (
          <aside className="sticky top-20 hidden h-[600px] w-40 xl:flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-center text-white/40 mr-6 backdrop-blur-sm shrink-0">
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 border border-white/10 mb-2">
              {t.adPublicidade}
            </span>
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/50">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </div>
            <span className="text-xs font-semibold text-white/70">{t.adSpace}</span>
            <span className="text-[10px] text-white/30 mt-1">160 x 600</span>
            <div className="mt-4 border-t border-white/5 pt-3 w-full">
              <button
                onClick={() => setModal("premium")}
                className="text-[10px] text-white/70 hover:text-white underline"
              >
                {t.removeAdsWithVip}
              </button>
            </div>
          </aside>
        )}

        {/* Conteúdo Central do Jogo (Centralizado no mobile e desktop) */}
        <div className="relative flex w-full max-w-md sm:max-w-xl flex-1 flex-col mx-auto items-stretch">
          {/* Barra de Status da Sessão */}
          <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#e50914]/20 border border-[#e50914]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e50914]">
                {puzzle?.mode === "infinite" ? t.infinite : puzzle?.mode === "archive" ? t.archive : t.daily}
              </span>
              <span className="text-sm font-bold text-white">
                {label || t.loading}
              </span>
              {puzzle?.date && (
                <span className="text-xs text-white/40 hidden sm:inline">
                  · {fmtDate(puzzle.date, lang)}
                </span>
              )}
            </div>
            <Attempts guesses={game?.guesses ?? []} lang={lang} />
          </div>

      {error && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="mb-3 text-rose-300">{error}</p>
          <button className="btn-primary" onClick={() => load(mode)}>{t.tryAgain}</button>
        </div>
      )}

      {!puzzle && !error && <div className="scene-frame shimmer" />}

      {puzzle && game && (
        <main className="space-y-3">
          {/* Chamada intuitiva do jogo */}
          <div className="text-center pt-0.5">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
              {t.guessQuestion}
            </h2>
            <p className="text-[11px] font-medium text-white/50">
              {t.guessSubtitle}
            </p>
          </div>

          <SceneImage
            key={puzzle.token}
            token={puzzle.token}
            stage={stage}
            done={done}
            revealPoster={game.answer?.poster}
            seed={puzzle.number ?? puzzle.token.length}
          />

          <div className="pt-3">
            {done ? (
              <div className="glass flex items-center justify-between gap-3 rounded-2xl p-4 animate-fade-up">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">{game.status === "won" ? t.correctBanner : t.eraBanner}</div>
                  <div className="text-lg font-semibold text-white">
                    {lang === "en" ? (game.answer?.titleEn || game.answer?.originalTitle || game.answer?.title) : game.answer?.title}{" "}
                    <span className="text-white/40">({game.answer?.year})</span>
                  </div>
                </div>
                <button id="show-result" className="btn-primary" onClick={() => setModal("result")}>{t.resultBtn}</button>
              </div>
            ) : (
              <GuessInput disabled={busy} shake={shake} excluded={game.guesses.map((g) => g.id)} lang={lang} onGuess={submit} onSkip={() => submit(null)} />
            )}
          </div>

          {game.guesses.length > 0 && (
            <ul className="space-y-2">
              {game.guesses.map((g, i) => {
                const isSkip = g.id.startsWith("skip");
                const dict = MOVIE_TITLES[g.id];
                const guessTitle = isSkip
                  ? (lang === "en" ? "Skipped" : "Pulou")
                  : (lang === "en"
                      ? (dict?.en || g.titleEn || g.title)
                      : (dict?.pt || g.title));

                return (
                  <li key={g.id} className={`guess-row guess-${g.result} animate-fade-up`} style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="flex items-center gap-1.5 font-semibold text-xs text-white/60 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                      {ordinalLabels[i] || `${i + 1}º`}
                    </span>
                    <span className="flex-1 truncate font-medium text-white">{guessTitle}</span>
                    {g.year && <span className="text-sm opacity-60">({g.year})</span>}
                  </li>
                );
              })}
            </ul>
          )}

          <HintPanel
            puzzle={puzzle}
            stage={stage}
            done={done}
            lang={lang}
            mask={game.reveal > 0 || done ? (lang === "en" ? (game.maskEn || puzzle.maskEn || game.mask) : game.mask) : undefined}
          />

          {!done && game.reveal < 6 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                  <span className="rounded bg-white/10 px-1 py-0.2 border border-white/20 text-[9px] text-white">AD</span>
                  {t.adSponsored}
                </span>
                <span className="text-[10px] text-white/40">{t.bonusClue}</span>
              </div>
              <button
                id="extra-hint"
                onClick={() => (auth.premium && auth.configured ? grantLetter() : ad.show())}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/10 shadow-sm"
              >
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                <span>{auth.premium && auth.configured ? t.vipRevealLetter : t.watchAdToReveal}</span>
              </button>
            </div>
          )}
        </main>
      )}

      <footer className="mt-10 text-center text-xs text-white/30">
        {t.footerRights}
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-2xl animate-pop">{toast}</div>
      )}

      <HelpModal open={modal === "help"} onClose={() => (markHelp(), setModal(null))} lang={lang} />
      <Modal open={modal === "stats"} onClose={() => setModal(null)} title={t.stats} id="stats-modal">
        {stats && <StatsBlock stats={stats} lang={lang} />}
        <p className="mt-4 text-center text-sm text-white/50">{t.nextPosterIn} <span className="font-mono text-white font-bold">{countdown}</span></p>
      </Modal>
      {game && puzzle && (
        <ResultModal
          open={modal === "result"}
          onClose={() => setModal(null)}
          won={game.status === "won"}
          answer={game.answer}
          guesses={game.guesses}
          label={label}
          lang={lang}
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
        lang={lang}
        onSignIn={auth.signIn}
        onArchive={(d) => (setModal(null), setMode({ kind: "archive", date: d }))}
        onInfinite={() => (setModal(null), mode.kind === "infinite" ? load(mode) : setMode({ kind: "infinite" }))}
      />
      {ad.modal}
      </div>

      {/* Banner Lateral Direito (Desktop / Skyscraper) */}
      {!auth.premium && (
        <aside className="sticky top-20 hidden h-[600px] w-40 xl:flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-center text-white/40 ml-6 backdrop-blur-sm shrink-0">
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 border border-white/10 mb-2">
            {t.adPublicidade}
          </span>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/50">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </div>
          <span className="text-xs font-semibold text-white/70">{t.adSpace}</span>
          <span className="text-[10px] text-white/30 mt-1">160 x 600</span>
          <div className="mt-4 border-t border-white/5 pt-3 w-full">
            <button
              onClick={() => setModal("premium")}
              className="text-[10px] text-white/70 hover:text-white underline"
            >
              {t.removeAdsWithVip}
            </button>
          </div>
        </aside>
      )}
      </div>
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

function Attempts({ guesses, lang = "pt" }: { guesses: GuessEntry[]; lang?: Lang }) {
  const t = translations[lang];
  const count = guesses.length;
  return (
    <div className="flex flex-col items-end gap-1" aria-label={t.attempts}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
        <svg className="h-3.5 w-3.5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <span>{t.attempts}</span>
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
