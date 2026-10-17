"use client";
import { useState } from "react";
import Modal from "./Modal";
import type { Stats } from "@/lib/storage";
import type { GuessEntry, MovieLite } from "@/lib/types";
import { MAX_ATTEMPTS } from "@/lib/types";
import { translations, type Lang } from "@/lib/i18n";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "cenadodia.com.br";

export function emojiGrid(guesses: GuessEntry[], won: boolean) {
  const cells: string[] = guesses.map((g) => (g.result === "correct" ? "🟩" : g.result === "close" ? "🟨" : "🟥"));
  while (cells.length < MAX_ATTEMPTS) cells.push("⬛");
  return { cells: cells.join(" "), score: won ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}` };
}

export function shareText(label: string, guesses: GuessEntry[], won: boolean, lang: Lang = "pt") {
  const { cells, score } = emojiGrid(guesses, won);
  const playText = lang === "en" ? "Play at" : "Jogue em";
  return `${label} 🎬 ${score}\n${cells}\n${playText}: ${SITE}`;
}

type ResultProps = {
  open: boolean;
  onClose: () => void;
  won: boolean;
  answer?: MovieLite;
  guesses: GuessEntry[];
  label: string;
  stats: Stats | null;
  nextIn?: string;
  lang?: Lang;
  onPlayAgain?: () => void;
};

export function ResultModal({ open, onClose, won, answer, guesses, label, stats, nextIn, lang = "pt", onPlayAgain }: ResultProps) {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);
  const text = shareText(label, guesses, won, lang);

  const share = async () => {
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({ text });
        return;
      }
    } catch {}
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayTitle = answer ? (lang === "en" ? (answer.titleEn || answer.originalTitle || answer.title) : answer.title) : "";

  return (
    <Modal open={open} onClose={onClose} title={won ? t.wonTitle : t.lostTitle} id="result-modal">
      {answer && (
        <div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/5 p-3 border border-white/5">
          {answer.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={answer.poster.replace("/w92", "/w185")} alt="" className="h-20 w-14 rounded-lg object-cover" />
          ) : (
            <div className="grid h-20 w-14 place-items-center rounded-lg bg-white/10 text-white/50">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/></svg>
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">{won ? t.youGuessed : t.theMovieWas}</div>
            <div className="text-lg font-semibold text-white">{displayTitle}</div>
            <div className="text-sm text-white/50">{answer.year}</div>
          </div>
        </div>
      )}

      <div className="mb-5 rounded-2xl bg-black/40 p-4 text-center border border-white/5">
        <div className="text-sm text-white/50">{label}</div>
        <div className="mt-2 text-2xl tracking-[0.2em]">{emojiGrid(guesses, won).cells}</div>
      </div>

      {stats && <StatsBlock stats={stats} lang={lang} highlight={won ? guesses.length : undefined} />}

      <div className="mt-5 flex gap-2">
        <button id="share-button" onClick={share} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
          <span>{copied ? t.copied : t.share}</span>
        </button>
        {onPlayAgain && (
          <button id="play-again" onClick={onPlayAgain} className="btn-ghost flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>{t.playAnother}</span>
          </button>
        )}
      </div>
      {nextIn && <p className="mt-4 text-center text-sm text-white/50">{t.nextPosterIn} <span className="font-mono text-white">{nextIn}</span></p>}
    </Modal>
  );
}

export function StatsBlock({ stats, highlight, lang = "pt" }: { stats: Stats; highlight?: number; lang?: Lang }) {
  const t = translations[lang];
  const max = Math.max(1, ...stats.dist);
  const items = [
    [t.gamesPlayed, stats.played],
    [t.winRate, stats.played ? Math.round((stats.wins / stats.played) * 100) : 0],
    [t.streak, stats.streak],
    [t.bestStreak, stats.maxStreak],
  ];
  return (
    <div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {items.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-white/5 py-2">
            <div className="text-2xl font-bold text-white">{v}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        {stats.dist.map((n, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-white/50">{i + 1}</span>
            <div
              className={`flex h-5 min-w-6 items-center justify-end rounded px-2 font-semibold transition-all duration-700 ${highlight === i + 1 ? "bg-emerald-500 text-white" : "bg-white/15 text-white/80"}`}
              style={{ width: `${(n / max) * 100}%` }}
            >
              {n}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HelpModal({ open, onClose, lang = "pt" }: { open: boolean; onClose: () => void; lang?: Lang }) {
  const t = translations[lang];
  return (
    <Modal open={open} onClose={onClose} title={t.helpTitle} id="help-modal">
      <p className="mb-4 text-sm text-white/70">
        {t.helpDesc}
      </p>
      <ol className="space-y-2">
        {t.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl bg-white/5 p-2.5 text-sm text-white/80 border border-white/5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500 inline-block"/> {t.legendCorrect}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-400 inline-block"/> {t.legendClose}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-500 inline-block"/> {t.legendWrong}</span>
      </div>
      <button id="help-start" onClick={onClose} className="btn-primary mt-5 w-full">
        {t.startBtn}
      </button>
    </Modal>
  );
}
