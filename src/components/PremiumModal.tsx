"use client";
import { useState } from "react";
import Modal from "./Modal";
import type { User } from "@supabase/supabase-js";

type Props = {
  open: boolean;
  onClose: () => void;
  premium: boolean;
  user: User | null;
  configured: boolean;
  today: string;
  onSignIn: () => void;
  onArchive: (date: string) => void;
  onInfinite: () => void;
};

const STRIPE = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
const PIX = process.env.NEXT_PUBLIC_PIX_CHECKOUT_URL;
const EPOCH = "2026-01-01";

export default function PremiumModal({ open, onClose, premium, user, configured, today, onSignIn, onArchive, onInfinite }: Props) {
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
    <Modal open={open} onClose={onClose} title={premium ? "Sala VIP 🎟️" : "Cena Premium"} id="premium-modal">
      {premium ? (
        <div className="space-y-4">
          {!configured && (
            <p className="rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200">Modo demonstração: Premium liberado porque o Supabase não está configurado.</p>
          )}
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="mb-2 font-semibold text-white">📚 Modo Arquivo</div>
            <p className="mb-3 text-sm text-white/60">Jogue qualquer cena do passado.</p>
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
                Jogar
              </button>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="mb-2 font-semibold text-white">♾️ Modo Infinito</div>
            <p className="mb-3 text-sm text-white/60">Filmes aleatórios entre os 500 mais populares do TMDB, sem limite.</p>
            <button id="infinite-play" onClick={onInfinite} className="btn-primary w-full">
              Começar maratona
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2 text-sm text-white/80">
            <li>📚 Modo Arquivo — todas as cenas anteriores</li>
            <li>♾️ Modo Infinito — jogue sem parar</li>
            <li>🚫 Sem anúncios nas dicas extras</li>
          </ul>
          <div className="rounded-2xl bg-gradient-to-br from-amber-400/20 to-fuchsia-500/20 p-4 text-center">
            <div className="font-display text-4xl text-white">R$ 9,90<span className="text-base text-white/60">/mês</span></div>
          </div>
          {!user ? (
            <button id="signin-google" onClick={onSignIn} className="btn-primary w-full">
              Entrar com Google para assinar
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {STRIPE && (
                <button id="checkout-stripe" onClick={() => checkout(STRIPE)} className="btn-primary w-full">
                  Assinar com cartão 💳
                </button>
              )}
              {PIX && (
                <button id="checkout-pix" onClick={() => checkout(PIX)} className="btn-ghost w-full">
                  Pagar com Pix ⚡
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
