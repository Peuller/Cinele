"use client";
import { useState } from "react";

type Props = { src: string; stage: number; done: boolean; seed: number };

/**
 * Cena obscurecida. stage = nº de erros (0..4).
 * 0: blur 50 + P&B · 1: blur 30 colorido · 2: sem blur, zoom forte num canto
 * 3: zoom médio · 4: zoom leve · done: imagem completa
 */
export default function SceneImage({ src, stage, done, seed }: Props) {
  const [loaded, setLoaded] = useState(false); // parent usa key={src} para reiniciar

  const corners = ["15% 20%", "85% 20%", "20% 80%", "80% 75%"];
  const origin = corners[seed % corners.length];
  const s = done ? 5 : stage;
  const styles: Record<number, { filter: string; scale: number }> = {
    0: { filter: "blur(50px) grayscale(1) brightness(0.75)", scale: 1.15 },
    1: { filter: "blur(30px) saturate(1.1)", scale: 1.1 },
    2: { filter: "none", scale: 2.8 },
    3: { filter: "none", scale: 1.9 },
    4: { filter: "none", scale: 1.35 },
    5: { filter: "none", scale: 1 },
  };
  const st = styles[s];

  return (
    <div className="scene-frame group">
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Cena misteriosa do filme"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full select-none object-cover transition-all duration-[1400ms] ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ filter: st.filter, transform: `scale(${st.scale})`, transformOrigin: origin, opacity: loaded ? 1 : 0 }}
        />
        {!loaded && <div className="absolute inset-0 shimmer" />}
        <div className="pointer-events-none absolute inset-0 film-grain" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      </div>
      <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200 backdrop-blur">
        {done ? "Cena revelada" : `Nível ${stage + 1} / 5`}
      </div>
    </div>
  );
}
