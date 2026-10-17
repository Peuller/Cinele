"use client";
import type { Puzzle } from "@/lib/types";

type Props = { puzzle: Puzzle; stage: number; done: boolean; mask?: string };

export default function HintPanel({ puzzle, stage, done, mask }: Props) {
  const show = (n: number) => done || stage >= n;
  const hints = [
    { at: 2, label: "Ano de lançamento", value: puzzle.year ?? "Desconhecido" },
    { at: 3, label: "Elenco principal", value: puzzle.cast.join(" · ") || "—" },
    { at: 4, label: "Direção", value: puzzle.director ?? "—" },
    { at: 4, label: "Sinopse", value: puzzle.synopsis ?? "—", wide: true },
  ];

  return (
    <div className="space-y-4 pt-4">
      {/* Divisor e cabeçalho bem evidente da seção de dicas */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-dashed border-white/10" />
        </div>
        <div className="relative flex items-center gap-2 rounded-full border border-white/10 bg-[#121215] px-4 py-1.5 shadow-lg">
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">
            Dicas Desbloqueáveis
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
            {done ? "Reveladas" : `${Math.max(0, stage)} / 4 abertas`}
          </span>
        </div>
      </div>
      {mask && (
        <div className="glass rounded-2xl px-4 py-3 text-center">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/40">Título</div>
          <div className="font-mono text-lg tracking-[0.3em] text-white break-words">{mask}</div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {hints.map((h, i) => (
          <div
            key={i}
            className={`hint-card ${h.wide ? "sm:col-span-3" : ""} ${show(h.at) ? "hint-open" : ""}`}
          >
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
              <span className="grid h-4 w-4 place-items-center text-white/70">
                {h.label.includes("Ano") && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                )}
                {h.label.includes("Elenco") && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                )}
                {h.label.includes("Direção") && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/></svg>
                )}
                {h.label.includes("Sinopse") && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10M6 14h6"/></svg>
                )}
              </span>
              {h.label}
            </div>
            {show(h.at) ? (
              <div className="mt-1.5 text-sm font-medium leading-relaxed text-white animate-fade-up">{h.value}</div>
            ) : (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/30">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Libera no {h.at + 1}º palpite
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
