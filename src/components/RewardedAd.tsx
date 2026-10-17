"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import Modal from "./Modal";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (o: Record<string, unknown>) => void;
    adConfig?: (o: Record<string, unknown>) => void;
  }
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/** Carrega o SDK H5 Games Ads (AdSense for Games), se configurado. */
export function AdsScript() {
  if (!CLIENT) return null;
  return (
    <>
      <Script
        id="adsense-h5"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
        data-ad-frequency-hint="30s"
        {...(process.env.NODE_ENV !== "production" ? { "data-adbreak-test": "on" } : {})}
        crossOrigin="anonymous"
      />
      <Script id="adsense-h5-init" strategy="afterInteractive">
        {`window.adsbygoogle = window.adsbygoogle || [];
          window.adBreak = window.adConfig = function(o){ window.adsbygoogle.push(o); };
          window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });`}
      </Script>
    </>
  );
}

/**
 * Anúncio recompensado. Usa adBreak({type:'reward'}) do H5 Games Ads;
 * sem AdSense configurado (ou sem inventário), mostra um anúncio simulado de 5s.
 */
export function useRewardedAd(onReward: () => void) {
  const [simOpen, setSimOpen] = useState(false);

  const show = () => {
    if (CLIENT && window.adBreak) {
      let rewarded = false;
      window.adBreak({
        type: "reward",
        name: "dica-extra",
        beforeReward: (showAdFn: () => void) => showAdFn(),
        adViewed: () => {
          rewarded = true;
          onReward();
        },
        adDismissed: () => {},
        adBreakDone: (info: { breakStatus: string }) => {
          // sem anúncio disponível → fallback simulado
          if (!rewarded && info?.breakStatus !== "dismissed" && info?.breakStatus !== "viewed") setSimOpen(true);
        },
      });
    } else setSimOpen(true);
  };

  const modal = simOpen && <SimulatedAd open onClose={() => setSimOpen(false)} onDone={() => (setSimOpen(false), onReward())} />;
  return { show, modal };
}

function SimulatedAd({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [left, setLeft] = useState(5);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Modal open={open} onClose={onClose} title="Espaço Publicitário" id="ad-modal">
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[#16161a] p-4 text-center shadow-inner">
        <span className="absolute left-3 top-3 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80 border border-white/20">
          Anúncio / AD
        </span>
        <div className="text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          </div>
          <p className="mt-2 font-display text-2xl text-white">Anúncio Patrocinado</p>
          <p className="text-xs text-white/60">Ao término deste anúncio, sua letra bônus será liberada automaticamente.</p>
        </div>
        <div className="absolute bottom-0 left-0 h-1.5 bg-white transition-all duration-1000 ease-linear" style={{ width: `${((5 - left) / 5) * 100}%` }} />
      </div>
      <button
        id="claim-reward"
        disabled={left > 0}
        onClick={onDone}
        className="btn-primary mt-4 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        <span>{left > 0 ? `Aguarde ${left}s para resgatar…` : "Resgatar dica bônus"}</span>
      </button>
    </Modal>
  );
}
