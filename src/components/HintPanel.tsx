"use client";
import type { Puzzle } from "@/lib/types";

type Props = { puzzle: Puzzle; stage: number; done: boolean; mask?: string };

export default function HintPanel({ puzzle, stage, done, mask }: Props) {
  const show = (n: number) => done || stage >= n;
  const hints = [
    { at: 2, icon: "📅", label: "Ano de lançamento", value: puzzle.year ?? "Desconhecido" },
    { at: 3, icon: "🎭", label: "Elenco principal", value: puzzle.cast.join(" · ") || "—" },
    { at: 4, icon: "🎬", label: "Direção", value: puzzle.director ?? "—" },
    { at: 4, icon: "📜", label: "Sinopse", value: puzzle.synopsis ?? "—", wide: true },
  ];

  return (
    <div className="space-y-3">
      {mask && (
        <div className="glass rounded-2xl px-4 py-3 text-center">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/40">Título</div>
          <div className="font-mono text-lg tracking-[0.3em] text-amber-200 break-words">{mask}</div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {hints.map((h, i) => (
          <div
            key={i}
            className={`hint-card ${h.wide ? "sm:col-span-3" : ""} ${show(h.at) ? "hint-open" : ""}`}
          >
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              <span className="text-base">{h.icon}</span>
              {h.label}
            </div>
            {show(h.at) ? (
              <div className="mt-1.5 text-sm font-medium leading-relaxed text-white animate-fade-up">{h.value}</div>
            ) : (
              <div className="mt-1.5 flex items-center gap-2 text-sm text-white/30">
                <span>🔒</span> Libera no {h.at + 1}º palpite
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
