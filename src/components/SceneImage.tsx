"use client";
import { useState } from "react";

type Props = {
  token: string;
  stage: number;
  done: boolean;
  revealPoster?: string | null;
  seed?: number;
};

/**
 * Cartaz com proteção anti-inspeção.
 * O servidor entrega apenas o recorte milimétrico correspondente ao estágio atual (/api/frame).
 * O usuário é fisicamente incapaz de obter o cartaz completo via DevTools/Network durante o jogo.
 * Quando vence ou perde (done = true), carrega a imagem completa autorizada.
 */
export default function SceneImage({ token, stage, done, revealPoster }: Props) {
  const [loaded, setLoaded] = useState(false);

  // Fonte da imagem baseada no estágio e autorização
  const imageSrc = done
    ? (revealPoster || `/api/frame?token=${encodeURIComponent(token)}&s=5`)
    : `/api/frame?token=${encodeURIComponent(token)}&s=${stage}`;

  return (
    <div
      className={`scene-frame group transition-all duration-700 select-none ${
        done ? "!aspect-[2/3] !max-w-[22rem]" : ""
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={imageSrc}
          src={imageSrc}
          alt="Frame do cartaz"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full select-none object-cover pointer-events-none transition-all duration-500 ease-out"
          style={{
            opacity: loaded ? 1 : 0,
          }}
        />
        {!loaded && <div className="absolute inset-0 shimmer pointer-events-none" />}
        {/* Camadas protetoras visuais sobre a imagem */}
        <div className="pointer-events-none absolute inset-0 film-grain" />
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
      </div>

      {/* Badges de status */}
      <div className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur border border-white/10 shadow-lg pointer-events-none">
        {done ? "Cartaz revelado" : `Zoom ${stage + 1} / 5`}
      </div>
      {!done && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur border border-white/10 shadow-lg pointer-events-none">
          <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>Frame Seguro</span>
        </div>
      )}
    </div>
  );
}
