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
    <Modal open={open} onClose={onClose} title="📢 Espaço Publicitário" id="ad-modal">
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-950/60 via-purple-900/40 to-black p-4 text-center shadow-inner">
        <span className="absolute left-3 top-3 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/30">
          Anúncio / AD
        </span>
        <div className="text-center">
          <div className="text-5xl animate-bounce">🍿</div>
          <p className="mt-2 font-display text-2xl text-white">Anúncio Patrocinado</p>
          <p className="text-xs text-white/60">Ao término deste anúncio, sua letra bônus será liberada automaticamente.</p>
        </div>
        <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-linear" style={{ width: `${((5 - left) / 5) * 100}%` }} />
      </div>
      <button
        id="claim-reward"
        disabled={left > 0}
        onClick={onDone}
        className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {left > 0 ? `Aguarde ${left}s para resgatar…` : "Resgatar dica bônus 🎁"}
      </button>
    </Modal>
  );
}
