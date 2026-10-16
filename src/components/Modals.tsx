"use client";
import { useState } from "react";
import Modal from "./Modal";
import type { Stats } from "@/lib/storage";
import type { GuessEntry, MovieLite } from "@/lib/types";
import { MAX_ATTEMPTS } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "cenadodia.com.br";

export function emojiGrid(guesses: GuessEntry[], won: boolean) {
  const cells: string[] = guesses.map((g) => (g.result === "correct" ? "🟩" : g.result === "close" ? "🟨" : "🟥"));
  while (cells.length < MAX_ATTEMPTS) cells.push("⬛");
  return { cells: cells.join(" "), score: won ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}` };
}

export function shareText(label: string, guesses: GuessEntry[], won: boolean) {
  const { cells, score } = emojiGrid(guesses, won);
  return `${label} 🎬 ${score}\n${cells}\nJogue em: ${SITE}`;
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
  onPlayAgain?: () => void;
};

export function ResultModal({ open, onClose, won, answer, guesses, label, stats, nextIn, onPlayAgain }: ResultProps) {
  const [copied, setCopied] = useState(false);
  const text = shareText(label, guesses, won);

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

  return (
    <Modal open={open} onClose={onClose} title={won ? "Corta! 🎉" : "Fim da sessão"} id="result-modal">
      {answer && (
        <div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/5 p-3">
          {answer.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={answer.poster.replace("/w92", "/w185")} alt="" className="h-20 w-14 rounded-lg object-cover" />
          ) : (
            <div className="grid h-20 w-14 place-items-center rounded-lg bg-white/10 text-2xl">🎞️</div>
          )}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">{won ? "Você acertou" : "O filme era"}</div>
            <div className="text-lg font-semibold text-white">{answer.title}</div>
            <div className="text-sm text-white/50">{answer.year}</div>
          </div>
        </div>
      )}

      <div className="mb-5 rounded-2xl bg-black/30 p-4 text-center">
        <div className="text-sm text-white/50">{label}</div>
        <div className="mt-1 text-3xl tracking-[0.15em]">{emojiGrid(guesses, won).cells}</div>
      </div>

      {stats && <StatsBlock stats={stats} highlight={won ? guesses.length : undefined} />}

      <div className="mt-5 flex gap-2">
        <button id="share-button" onClick={share} className="btn-primary flex-1">
          {copied ? "Copiado! ✓" : "Compartilhar 📤"}
        </button>
        {onPlayAgain && (
          <button id="play-again" onClick={onPlayAgain} className="btn-ghost">
            Outro ♾️
          </button>
        )}
      </div>
      {nextIn && <p className="mt-4 text-center text-sm text-white/50">Próxima cena em <span className="font-mono text-amber-200">{nextIn}</span></p>}
    </Modal>
  );
}

export function StatsBlock({ stats, highlight }: { stats: Stats; highlight?: number }) {
  const max = Math.max(1, ...stats.dist);
  const items = [
    ["Jogos", stats.played],
    ["% Vitórias", stats.played ? Math.round((stats.wins / stats.played) * 100) : 0],
    ["Sequência", stats.streak],
    ["Recorde", stats.maxStreak],
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

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    ["🌫️", "Cena desfocada e em preto e branco."],
    ["🎨", "Desfoque menor, cores ativadas."],
    ["🔍", "Sem desfoque, zoom num canto + ano de lançamento."],
    ["🎭", "Os 3 atores principais."],
    ["🎬", "Diretor e a primeira frase da sinopse. Última chance!"],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Como jogar" id="help-modal">
      <p className="mb-4 text-sm text-white/70">
        Descubra o <b className="text-amber-200">filme do dia</b> em até 5 palpites. A cada erro, a cena fica mais nítida e novas dicas aparecem.
      </p>
      <ol className="space-y-2">
        {steps.map(([icon, t], i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl bg-white/5 p-2.5 text-sm text-white/80">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-200">{i + 1}</span>
            <span>
              {icon} {t}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
        <span>🟩 Acertou</span>
        <span>🟨 Errou, mas o ano está a até 3 anos</span>
        <span>🟥 Errou</span>
        <span>⬛ Não usado</span>
      </div>
      <button id="help-start" onClick={onClose} className="btn-primary mt-5 w-full">
        Ação! 🎬
      </button>
    </Modal>
  );
}
