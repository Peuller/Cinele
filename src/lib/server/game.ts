import "server-only";
import type { GuessResult, MovieLite, Puzzle } from "../types";
import LOCAL_MOVIES from "../../data/movies.json";

export type MovieEntry = {
  id: string;
  title: string;
  originalTitle: string;
  titleEn?: string;
  year: number | null;
  director: string | null;
  cast: string[];
  synopsis: string | null;
  synopsisEn?: string | null;
  poster: string | null;
  image: string;
};

// Base 100% autônoma e local carregada de src/data/movies.json
const MOVIES: MovieEntry[] = LOCAL_MOVIES as MovieEntry[];

/** Data de início do jogo */
export const EPOCH = "2026-01-01";

// ---------- Datas ----------
export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function dayNumber(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(EPOCH)) / 86_400_000) + 1;
}

export function isValidDate(d: string | null): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}

// ---------- Tokens Criptografados do Desafio ----------
const SECRET = process.env.PUZZLE_SECRET || "cinele-secret-local";

function xor(s: string) {
  return Array.from(s, (c, i) => String.fromCharCode(c.charCodeAt(0) ^ SECRET.charCodeAt(i % SECRET.length))).join("");
}

export function encodeToken(kind: "d" | "r", value: string) {
  return Buffer.from(xor(`${kind}:${value}`), "binary").toString("base64url");
}

export function decodeToken(token: string): { kind: "d" | "r"; value: string } | null {
  try {
    const [kind, value] = xor(Buffer.from(token, "base64url").toString("binary")).split(":");
    if ((kind === "d" || kind === "r") && value) return { kind, value };
  } catch { }
  return null;
}

// ---------- Seleção de Filmes (100% Local) ----------
export function getMovieById(id: string): MovieEntry {
  const found = MOVIES.find((m) => m.id === id);
  return found || MOVIES[0];
}

export function dailyId(date: string): string {
  const n = dayNumber(date);
  const idx = (((n - 1) % MOVIES.length) + MOVIES.length) % MOVIES.length;
  return MOVIES[idx].id;
}

export function randomId(): string {
  const idx = Math.floor(Math.random() * MOVIES.length);
  return MOVIES[idx].id;
}

export async function resolveMovieId(token: string): Promise<string | null> {
  const t = decodeToken(token);
  if (!t) return null;
  return t.kind === "d" ? dailyId(t.value) : t.value;
}

// ---------- Máscara de Dica de Título ----------
export function maskTitle(title: string, reveal = 0): string {
  const chars = Array.from(title);
  const letterIdx = chars.map((c, i) => (/[\p{L}\p{N}]/u.test(c) ? i : -1)).filter((i) => i >= 0);
  const order = [
    ...letterIdx.filter((i) => i === 0 || chars[i - 1] === " "),
    ...letterIdx.filter((i) => !(i === 0 || chars[i - 1] === " ")),
  ];
  const shown = new Set(order.slice(0, reveal));
  return chars.map((c, i) => (letterIdx.includes(i) && !shown.has(i) ? "_" : c)).join("");
}

// ---------- Reveal Key para Proteção do Cartaz Completo ----------
import crypto from "crypto";

export function getRevealKey(token: string): string {
  return crypto.createHmac("sha256", SECRET).update(`reveal:${token}`).digest("hex").slice(0, 16);
}

export function verifyRevealKey(token: string, key?: string | null): boolean {
  if (!key) return false;
  return getRevealKey(token) === key;
}

// ---------- Montagem do Desafio ----------
export async function buildPuzzle(opts: { date?: string; random?: boolean }): Promise<Puzzle> {
  let id: string, token: string, mode: Puzzle["mode"], date: string | null = null;
  if (opts.random) {
    id = randomId();
    token = encodeToken("r", id);
    mode = "infinite";
  } else {
    date = opts.date ?? todayBR();
    id = dailyId(date);
    token = encodeToken("d", date);
    mode = date === todayBR() ? "daily" : "archive";
  }

  const m = getMovieById(id);
  const titleEn = m.titleEn || m.originalTitle || m.title;
  return {
    token,
    mode,
    date,
    number: date ? dayNumber(date) : null,
    image: `/api/frame?token=${token}&s=0`,
    year: m.year,
    cast: m.cast,
    director: m.director,
    synopsis: m.synopsis,
    synopsisEn: m.synopsisEn || m.synopsis,
    mask: maskTitle(m.title),
    maskEn: maskTitle(titleEn),
    demo: false,
  };
}

// ---------- Validação de Palpites ----------
export async function getAnswer(token: string): Promise<MovieLite | null> {
  const id = await resolveMovieId(token);
  if (!id) return null;
  const m = getMovieById(id);
  const rKey = getRevealKey(token);
  return {
    id: m.id,
    title: m.title,
    originalTitle: m.originalTitle,
    titleEn: m.titleEn || m.originalTitle || m.title,
    year: m.year,
    poster: `/api/frame?token=${token}&s=5&k=${rKey}`,
  };
}

export async function checkGuess(token: string, guessId: string, guessYear: number | null): Promise<GuessResult> {
  const answer = await getAnswer(token);
  if (!answer) throw new Error("token inválido");
  if (answer.id === guessId) return "correct";
  if (guessYear && answer.year && Math.abs(guessYear - answer.year) <= 3) return "close";
  return "wrong";
}

// ---------- Busca em Tempo Real (100% Offline / Local) ----------
export async function searchMovies(q: string): Promise<MovieLite[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();

  const nq = norm(query);

  const matched = MOVIES.filter(
    (m) =>
      norm(m.title).includes(nq) ||
      norm(m.originalTitle || "").includes(nq) ||
      norm(m.titleEn || "").includes(nq)
  );

  return matched.slice(0, 8).map((m) => ({
    id: m.id,
    title: m.title,
    originalTitle: m.originalTitle,
    titleEn: m.titleEn || m.originalTitle || m.title,
    year: m.year,
    poster: m.poster,
  }));
}
