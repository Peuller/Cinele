"use client";
import { useEffect, useRef, useState } from "react";
import type { MovieLite } from "@/lib/types";
import { translations, type Lang } from "@/lib/i18n";

type Props = {
  disabled: boolean;
  shake: boolean;
  excluded: string[];
  lang?: Lang;
  onGuess: (m: MovieLite) => void;
  onSkip: () => void;
};

export default function GuessInput({ disabled, shake, excluded, lang = "pt", onGuess, onSkip }: Props) {
  const t = translations[lang];
  const [q, setQ] = useState("");
  const [rawResults, setResults] = useState<MovieLite[]>([]);
  const results = q.trim().length < 2 ? [] : rawResults;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: MovieLite[]) => {
          setResults(data.filter((m) => !excluded.includes(m.id)));
          setActive(0);
          setOpen(true);
        })
        .catch(() => { })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, excluded]);

  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (m: MovieLite) => {
    onGuess(m);
    setQ("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={`relative ${shake ? "animate-shake" : ""}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="guess-input"
            value={q}
            disabled={disabled}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onKeyDown={(e) => {
              if (!open || !results.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => (a + 1) % results.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a - 1 + results.length) % results.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(results[active]);
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder={disabled ? t.gameOver : t.inputPlaceholder}
            autoComplete="off"
            className="glass h-14 w-full rounded-2xl pl-12 pr-10 text-base text-white placeholder:text-white/35 outline-none transition focus:ring-2 focus:ring-[#e50914] disabled:opacity-50"
          />
          {loading && <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#e50914] border-t-transparent" />}
        </div>
        <button
          id="skip-button"
          onClick={onSkip}
          disabled={disabled}
          className="glass h-14 rounded-2xl px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          title={t.skipTitle}
        >
          {t.skip}
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="glass-strong absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl p-1.5 shadow-2xl animate-pop">
          {results.map((m, i) => {
            const primaryTitle = lang === "en" ? (m.titleEn || m.originalTitle || m.title) : m.title;
            const secondaryTitle = lang === "en"
              ? (m.title !== primaryTitle ? m.title : undefined)
              : (m.originalTitle && m.originalTitle !== m.title ? m.originalTitle : undefined);

            return (
              <li key={m.id}>
                <button
                  id={`result-${m.id}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(m)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left transition ${i === active ? "bg-white/10 text-white border-l-2 border-[#e50914]" : "text-white/90 hover:bg-white/5"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-white">{primaryTitle}</div>
                    {secondaryTitle && (
                      <div className="truncate text-xs text-white/40">
                        {secondaryTitle}
                      </div>
                    )}
                  </div>

                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && !loading && q.trim().length >= 2 && results.length === 0 && (
        <div className="glass-strong absolute z-30 mt-2 w-full rounded-2xl p-4 text-sm text-white/50">{t.noMovieFound}</div>
      )}
    </div>
  );
}
