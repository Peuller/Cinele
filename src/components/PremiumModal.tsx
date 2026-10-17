"use client";
import { useState } from "react";
import Modal from "./Modal";
import type { User } from "@supabase/supabase-js";
import { translations, type Lang } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  premium: boolean;
  user: User | null;
  configured: boolean;
  today: string;
  lang?: Lang;
  onSignIn: () => void;
  onArchive: (date: string) => void;
  onInfinite: () => void;
};

const STRIPE = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
const PIX = process.env.NEXT_PUBLIC_PIX_CHECKOUT_URL;
const EPOCH = "2026-01-01";

export default function PremiumModal({ open, onClose, premium, user, configured, today, lang = "pt", onSignIn, onArchive, onInfinite }: Props) {
  const t = translations[lang];
  const yesterday = today ? new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10) : EPOCH;
  const [date, setDate] = useState(yesterday);

  const checkout = (base: string) => {
    const url = new URL(base);
    if (user) {
      url.searchParams.set("client_reference_id", user.id);
      if (user.email) url.searchParams.set("prefilled_email", user.email);
    }
    window.location.href = url.toString();
  };

  return (
    <Modal open={open} onClose={onClose} title={premium ? t.vipRoom : t.premiumScene} id="premium-modal">
      {premium ? (
        <div className="space-y-4">
          {!configured && (
            <p className="rounded-xl bg-white/10 p-3 text-xs text-white/70 border border-white/10">{t.demoModeNotice}</p>
          )}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="mb-2 font-semibold text-white flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
              <span>{t.archiveTitle}</span>
            </div>
            <p className="mb-3 text-sm text-white/60">{t.archiveDesc}</p>
            <div className="flex gap-2">
              <input
                id="archive-date"
                type="date"
                min={EPOCH}
                max={yesterday}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass h-11 flex-1 rounded-xl px-3 text-white [color-scheme:dark]"
              />
              <button id="archive-play" onClick={() => onArchive(date)} className="btn-primary">
                {t.playBtn}
              </button>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="mb-2 font-semibold text-white flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z"/></svg>
              <span>{t.infiniteTitle}</span>
            </div>
            <p className="mb-3 text-sm text-white/60">{t.infiniteDesc}</p>
            <button id="infinite-play" onClick={onInfinite} className="btn-primary w-full">
              {t.startMarathon}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2.5 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{t.benefitArchive}</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{t.benefitInfinite}</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{t.benefitNoAds}</span>
            </li>
          </ul>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
            <div className="font-display text-4xl text-white">R$ 9,90<span className="text-base text-white/50">{t.perMonth}</span></div>
          </div>
          {!user ? (
            <button id="signin-google" onClick={onSignIn} className="btn-primary w-full">
              {t.signInWithGoogle}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {STRIPE && (
                <button id="checkout-stripe" onClick={() => checkout(STRIPE)} className="btn-primary w-full">
                  {t.subscribeCard}
                </button>
              )}
              {PIX && (
                <button id="checkout-pix" onClick={() => checkout(PIX)} className="btn-ghost w-full">
                  {t.payPix}
                </button>
              )}
              {!STRIPE && !PIX && <p className="text-center text-xs text-white/50">Configure NEXT_PUBLIC_STRIPE_PAYMENT_LINK no .env.</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
