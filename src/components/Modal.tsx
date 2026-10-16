"use client";
import { useEffect, type ReactNode } from "react";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; id?: string };

export default function Modal({ open, onClose, title, children, id }: Props) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title} id={id}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl p-6 shadow-2xl animate-pop">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-3xl tracking-wide text-white">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
