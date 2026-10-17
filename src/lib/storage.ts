"use client";
import type { GuessEntry, MovieLite } from "./types";

export type GameState = {
  guesses: GuessEntry[];
  status: "playing" | "won" | "lost";
  answer?: MovieLite;
  reveal: number; // letras reveladas via anúncio
  mask?: string;
  maskEn?: string;
};

export type Stats = {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  lastDate: string | null;
  dist: number[]; // vitórias por tentativa (1..5)
};

const EMPTY_STATS: Stats = { played: 0, wins: 0, streak: 0, maxStreak: 0, lastDate: null, dist: [0, 0, 0, 0, 0] };

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const loadGame = (key: string): GameState | null =>
  safe(() => JSON.parse(localStorage.getItem(`cena:game:${key}`) || "null"), null);

export const saveGame = (key: string, s: GameState) =>
  safe(() => localStorage.setItem(`cena:game:${key}`, JSON.stringify(s)), undefined);

export const loadStats = (): Stats => safe(() => ({ ...EMPTY_STATS, ...JSON.parse(localStorage.getItem("cena:stats") || "{}") }), EMPTY_STATS);

/** Registra o resultado de um desafio diário nas estatísticas. */
export function recordDaily(date: string, won: boolean, attempts: number): Stats {
  const s = loadStats();
  if (s.lastDate === date) return s;
  const yesterday = new Date(Date.parse(date) - 86_400_000).toISOString().slice(0, 10);
  s.played++;
  if (won) {
    s.wins++;
    s.streak = s.lastDate === yesterday ? s.streak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    s.dist[attempts - 1]++;
  } else s.streak = 0;
  s.lastDate = date;
  safe(() => localStorage.setItem("cena:stats", JSON.stringify(s)), undefined);
  return s;
}

export const seenHelp = () => safe(() => localStorage.getItem("cena:help") === "1", true);
export const markHelp = () => safe(() => localStorage.setItem("cena:help", "1"), undefined);
