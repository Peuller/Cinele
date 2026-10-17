"use client";
import { useState } from "react";

type Props = { src: string; stage: number; done: boolean; seed: number };

/**
 * Cartaz obscurecido estilo Loldle. stage = nº de erros (0..4).
 * Começa num frame com zoom extremo em um detalhe aleatório do cartaz (sem revelar o título de cara).
 * A cada palpite errado, afasta a câmera (zoom diminui progressivamente), revelando mais do cartaz.
 * Quando vence ou perde (done = true), revela o cartaz por completo (1x).
 */
export default function SceneImage({ src, stage, done, seed }: Props) {
  const [loaded, setLoaded] = useState(false);

  // Pontos de foco do cartaz que evitam o topo onde costuma ficar o título principal
  const focusPoints = [
    "50% 50%", // centro
    "40% 40%", // centro-esquerda
    "60% 45%", // centro-direita
    "50% 65%", // inferior central
    "30% 60%", // inferior esquerdo
    "70% 60%", // inferior direito
  ];
  const origin = focusPoints[seed % focusPoints.length];
  const s = done ? 5 : stage;

  // Progressão estilo Loldle com zoom bem mais fechado (revela apenas detalhes mínimos)
  const styles: Record<number, { scale: number; filter: string }> = {
    0: { scale: 6.5, filter: "none" },      // Frame 1: Micro-detalhe extremo (textura, olho, pedaço de roupa)
    1: { scale: 4.8, filter: "none" },      // Frame 2: Pequeno detalhe aproximado
    2: { scale: 3.4, filter: "none" },      // Frame 3: Pedaço um pouco maior
    3: { scale: 2.3, filter: "none" },      // Frame 4: Quase um terço do cartaz
    4: { scale: 1.5, filter: "none" },      // Frame 5: Metade do cartaz
    5: { scale: 1, filter: "none" },        // Revelado: 100% do cartaz
  };

  const st = styles[s] || styles[0];

  return (
    <div className={`scene-frame group transition-all duration-700 ${done ? "!aspect-[2/3] !max-w-[22rem]" : ""}`}>
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Cartaz misterioso do filme"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full select-none object-cover transition-all duration-[1200ms] ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{
            filter: st.filter,
            transform: `scale(${st.scale})`,
            transformOrigin: done ? "50% 50%" : origin,
            opacity: loaded ? 1 : 0,
          }}
        />
        {!loaded && <div className="absolute inset-0 shimmer" />}
        <div className="pointer-events-none absolute inset-0 film-grain" />
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
      </div>
      <div className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur border border-white/10 shadow-lg">
        {done ? "Cartaz revelado" : `Zoom ${stage + 1} / 5`}
      </div>
      {!done && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur border border-white/10 shadow-lg">
          <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Frame do Cartaz</span>
        </div>
      )}
    </div>
  );
}
