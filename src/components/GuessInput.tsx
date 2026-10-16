"use client";
import { useEffect, useRef, useState } from "react";
import type { MovieLite } from "@/lib/types";

type Props = {
  disabled: boolean;
  shake: boolean;
  excluded: string[];
  onGuess: (m: MovieLite) => void;
  onSkip: () => void;
};

export default function GuessInput({ disabled, shake, excluded, onGuess, onSkip }: Props) {
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
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: MovieLite[]) => {
          setResults(data.filter((m) => !excluded.includes(m.id)));
          setActive(0);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
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
            placeholder={disabled ? "Fim de jogo" : "Qual é o filme? Digite para buscar…"}
            autoComplete="off"
            className="glass h-14 w-full rounded-2xl pl-12 pr-10 text-base text-white placeholder:text-white/35 outline-none transition focus:ring-2 focus:ring-amber-400/60 disabled:opacity-50"
          />
          {loading && <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />}
        </div>
        <button
          id="skip-button"
          onClick={onSkip}
          disabled={disabled}
          className="glass h-14 rounded-2xl px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          title="Pular (conta como erro e revela mais)"
        >
          Pular
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="glass-strong absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl p-1.5 shadow-2xl animate-pop">
          {results.map((m, i) => (
            <li key={m.id}>
              <button
                id={`result-${m.id}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(m)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${i === active ? "bg-amber-400/15" : ""}`}
              >
                {m.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.poster} alt="" className="h-12 w-8 rounded object-cover" />
                ) : (
                  <div className="grid h-12 w-8 place-items-center rounded bg-white/10 text-sm">🎬</div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{m.title}</div>
                  <div className="truncate text-xs text-white/45">
                    {m.year ?? "—"}
                    {m.originalTitle && m.originalTitle !== m.title ? ` · ${m.originalTitle}` : ""}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && q.trim().length >= 2 && results.length === 0 && (
        <div className="glass-strong absolute z-30 mt-2 w-full rounded-2xl p-4 text-sm text-white/50">Nenhum filme encontrado.</div>
      )}
    </div>
  );
}
