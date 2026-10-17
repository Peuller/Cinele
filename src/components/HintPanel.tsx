"use client";
import { useState, useEffect } from "react";
import type { Puzzle } from "@/lib/types";
import { translations, type Lang } from "@/lib/i18n";

type Props = { puzzle: Puzzle; stage: number; done: boolean; mask?: string; lang?: Lang };

export default function HintPanel({ puzzle, stage, done, mask, lang = "pt" }: Props) {
  const t = translations[lang];
  const show = (n: number) => done || stage >= n;

  // Sanfona aberta por padrão para o usuário acompanhar as pistas
  const [isOpen, setIsOpen] = useState(true);

  // Controle de quais claquetes o usuário abriu especificamente (para ver a pista)
  const [openedTakes, setOpenedTakes] = useState<Record<string, boolean>>({});

  // Efeito sonoro visual / animação da batida da claquete ao clicar
  const [clappingId, setClappingId] = useState<string | null>(null);

  const toggleTake = (id: string) => {
    const nextState = !openedTakes[id];
    setClappingId(id);
    setTimeout(() => {
      setOpenedTakes((prev) => ({ ...prev, [id]: nextState }));
      setClappingId(null);
    }, 380);
  };

  // Se uma nova dica for desbloqueada durante a partida, garante que a sanfona se abra
  useEffect(() => {
    if (stage >= 2 || done) {
      setIsOpen(true);
    }
  }, [stage, done]);

  const currentSynopsis = lang === "en" ? (puzzle.synopsisEn || puzzle.synopsis) : puzzle.synopsis;

  const hints = [
    {
      id: "year",
      at: 2,
      label: t.releaseYear,
      wide: false,
      renderValue: () => (
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-wider text-white font-display">
            {puzzle.year ?? "—"}
          </span>
          <span className="text-[10px] text-white/40">
            {t.officialTheatrical}
          </span>
        </div>
      ),
    },
    {
      id: "cast",
      at: 3,
      label: t.mainCast,
      wide: false,
      renderValue: () => (
        <div className="flex flex-wrap gap-1">
          {puzzle.cast && puzzle.cast.length > 0 ? (
            puzzle.cast.map((actor, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 border border-white/10"
              >
                {actor}
              </span>
            ))
          ) : (
            <span className="text-xs text-white/50">{t.castNotAvailable}</span>
          )}
        </div>
      ),
    },
    {
      id: "director",
      at: 4,
      label: t.director,
      wide: false,
      renderValue: () => (
        <div className="text-sm font-semibold text-white">
          {puzzle.director || "—"}
        </div>
      ),
    },
    {
      id: "synopsis",
      at: 4,
      label: t.officialSynopsis,
      wide: true,
      renderValue: () => (
        <div className="rounded-lg bg-black/40 p-3 border-l-2 border-[#e50914] text-xs leading-relaxed text-white/80 italic font-sans">
          &ldquo;{currentSynopsis || "—"}&rdquo;
        </div>
      ),
    },
  ];

  const unlockedCount = hints.filter((h) => show(h.at)).length;

  return (
    <div className="overflow-visible rounded-2xl border border-white/10 bg-[#121214] transition-all pt-0.5">
      {/* Cabeçalho da Sanfona (Accordion Trigger) */}
      <button
        type="button"
        id="hints-accordion-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.04]"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded bg-white/10 text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              {t.dossierTitle}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70 w-fit">
              {done ? t.allRevealed : t.cluesAvailable(unlockedCount, hints.length)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex gap-1">
            {hints.map((h, i) => (
              <span
                key={i}
                className={`h-1.5 w-3 rounded-full transition-colors ${show(h.at) ? "bg-white" : "bg-white/20"
                  }`}
              />
            ))}
          </div>
          <div className="grid h-6 w-6 place-items-center rounded-full bg-white/5 text-white/70">
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </button>

      {/* Corpo da Sanfona: Componentes dispostos em fila/grid */}
      {isOpen && (
        <div className="border-t border-white/5 p-3.5 pt-5 space-y-4 animate-fade bg-black/25 overflow-visible">
          {/* Letras Reveladas do Título (se ativo) */}
          {mask && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 mb-0.5">
                {t.revealedTitleLetters}
              </div>
              <div className="font-mono text-lg tracking-[0.3em] text-white font-bold break-words">
                {mask}
              </div>
            </div>
          )}

          {/* Fila / Grade de componentes de dicas com 3 claquetes na mesma linha no mobile e desktop */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3.5 pt-2 sm:pt-3 overflow-visible">
            {hints.map((h) => {
              const isUnlocked = show(h.at);
              const isTakeOpen = !!openedTakes[h.id];
              const isClapping = clappingId === h.id;

              const isSynopsis = h.id === "synopsis";

              if (isSynopsis) {
                return (
                  <div
                    key={h.id}
                    onClick={() => isUnlocked && toggleTake(h.id)}
                    className={`group relative flex flex-col rounded-xl border p-2.5 sm:p-3 transition-all duration-300 col-span-3 ${
                      isUnlocked
                        ? "bg-[#161618] border-white/20 hover:border-white/30 cursor-pointer shadow-lg"
                        : "bg-[#0d0d0f]/90 border-white/5 opacity-65"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                      <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-white leading-tight">
                        {h.label}
                      </span>

                      {isUnlocked ? (
                        <span className="text-[9px] sm:text-[10px] text-white/50 group-hover:text-white transition">
                          {isTakeOpen ? t.clickToHide : t.clickToReveal}
                        </span>
                      ) : (
                        <div className="shrink-0 flex items-center gap-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-mono text-white/40">
                          <svg className="h-3 w-3 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span>LOCKED</span>
                        </div>
                      )}
                    </div>

                    {isUnlocked ? (
                      <div className="relative overflow-hidden rounded-lg">
                        <div
                          className={`rounded-lg bg-black/40 p-2.5 sm:p-3 border-l-2 border-[#e50914] text-[11px] sm:text-xs leading-relaxed text-white/90 italic font-sans transition-all duration-300 ${
                            isTakeOpen
                              ? "blur-none select-text"
                              : "blur-md select-none opacity-60"
                          }`}
                        >
                          &ldquo;{currentSynopsis || "—"}&rdquo;
                        </div>

                        {!isTakeOpen && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-white/15 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold tracking-wide text-white border border-white/25 shadow-lg group-hover:bg-[#e50914] group-hover:border-[#e50914] transition">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              </svg>
                              <span>{t.clickToRevealSynopsis}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-black/50 p-2 sm:p-2.5 text-[10px] sm:text-[11px] text-white/40 border border-white/5 font-mono">
                        <svg className="h-3.5 w-3.5 shrink-0 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="leading-snug">{t.unlocksOnAttempt(h.at + 1)}</span>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={h.id}
                  onClick={() => isUnlocked && toggleTake(h.id)}
                  className={`group relative flex flex-col rounded-lg sm:rounded-xl border transition-all duration-300 overflow-visible ${
                    isUnlocked
                      ? isTakeOpen
                        ? "bg-[#18181c] border-white/25 shadow-xl shadow-black/70 ring-1 ring-white/20 cursor-pointer"
                        : "bg-[#141416] border-white/15 hover:border-white/30 hover:bg-[#19191d] shadow-lg cursor-pointer"
                      : "bg-[#0d0d0f]/90 border-white/5 opacity-65"
                  }`}
                >
                  {/* HASTE ARTICULADA DA CLAQUETE */}
                  <div
                    className={`relative w-full rounded-t-lg sm:rounded-t-xl bg-[#0f0f11] px-1 pt-1.5 pb-0.5 sm:px-2.5 sm:pt-3 sm:pb-1.5 border-b border-white/10 overflow-visible select-none`}
                  >
                    <div
                      className={`relative z-10 h-2 sm:h-3.5 w-full rounded pl-2.5 sm:pl-4 shadow-lg transition-transform duration-300 ${isUnlocked
                        ? `clapper-stick-bw ${isClapping
                          ? "clapper-stick-animating"
                          : isTakeOpen
                            ? "clapper-stick-open"
                            : "clapper-stick-closed"
                        }`
                        : "clapper-stick-locked"
                        }`}
                      style={{
                        background: isUnlocked
                          ? "repeating-linear-gradient(-45deg, #000000 0px, #000000 8px, #ffffff 8px, #ffffff 16px)"
                          : "repeating-linear-gradient(-45deg, #18181b 0px, #18181b 8px, #27272a 8px, #27272a 16px)"
                      }}
                    >
                      <div className="absolute -left-0.5 sm:-left-1 top-1/2 -translate-y-1/2 z-20 h-2 w-2 sm:h-3.5 sm:w-3.5 rounded-full bg-zinc-300 border border-zinc-700 shadow-md flex items-center justify-center">
                        <div className="h-1 w-0.5 bg-zinc-800 rotate-45" />
                      </div>
                    </div>
                  </div>

                  {/* CORPO DA CLAQUETE */}
                  <div className="p-1 sm:p-2.5 flex flex-col justify-between flex-1">
                    <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1 sm:pb-1.5 mb-1 sm:mb-1.5">
                      <div className="text-[9px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wide text-white leading-tight truncate">
                        {h.label}
                      </div>

                      {!isUnlocked && (
                        <div className="shrink-0 flex items-center gap-0.5 rounded bg-white/5 border border-white/10 px-1 py-0.2 sm:px-1.5 sm:py-0.5 text-[7px] sm:text-[9px] font-mono text-white/40">
                          <svg className="h-2 w-2 sm:h-3 sm:w-3 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span className="hidden sm:inline">LOCK</span>
                        </div>
                      )}
                    </div>

                    {isUnlocked ? (
                      isTakeOpen ? (
                        <div className="pt-0.5 slate-content-open">
                          {h.renderValue()}
                          <div className="mt-1.5 sm:mt-2 flex justify-end">
                            <span className="text-[8px] sm:text-[10px] text-white/40 hover:text-white/70 underline">
                              {t.clickToCloseTake}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-0.5 sm:py-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTake(h.id);
                            }}
                            className="group/btn w-full flex items-center justify-center gap-0.5 sm:gap-2 rounded-md sm:rounded-lg bg-[#e50914] px-1 py-1 sm:px-4 sm:py-2.5 text-center text-[8px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider text-white shadow-md shadow-[#e50914]/30 transition hover:bg-[#b80710] active:scale-[0.98]"
                          >
                            <svg className="h-2.5 w-2.5 sm:h-4 sm:w-4 shrink-0 transition-transform group-hover/btn:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
                              <polyline points="17 2 12 7 7 2" />
                            </svg>
                            <span className="truncate">BATER TAKE</span>
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1 rounded bg-black/50 p-1 sm:p-2 text-[8px] sm:text-[11px] text-white/40 border border-white/5 font-mono">
                        <svg className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="leading-tight truncate">{t.unlocksOnAttempt(h.at + 1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
