import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { GuessResult, MovieLite, Puzzle } from "../types";
import { DEMO_CATALOG, DEMO_PUZZLES, type DemoMovie } from "./demo";

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

export const isDemo = !TMDB_KEY;

/** Data de lançamento do jogo (Cena #1). */
export const EPOCH = "2026-01-01";

/** Lista curada de reserva caso o Supabase não esteja configurado. */
const FALLBACK_IDS = [
  155, 27205, 157336, 603, 680, 13, 597, 120, 11, 329, 550, 238, 278, 862, 8587, 105, 129,
  496243, 299534, 19995, 424, 769, 807, 274, 98, 122, 1891, 578, 85, 218, 10681, 12, 598,
  475557, 76341, 244786, 313369, 1124, 438631, 335984, 286217, 62, 4995, 1422, 37165, 49026,
];

// ---------- datas ----------
export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
export function dayNumber(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(EPOCH)) / 86_400_000) + 1;
}
export function isValidDate(d: string | null): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}

// ---------- token (identifica o desafio sem expor o filme) ----------
const SECRET = process.env.PUZZLE_SECRET || "cena-do-dia";
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
  } catch {}
  return null;
}

// ---------- TMDB ----------
async function tmdb<T>(path: string, params: Record<string, string> = {}, revalidate = 86400): Promise<T> {
  const url = new URL(TMDB + path);
  url.searchParams.set("api_key", TMDB_KEY!);
  url.searchParams.set("language", "pt-BR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB ${res.status} em ${path}`);
  return res.json();
}

type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
};

const yearOf = (d?: string) => (d ? Number(d.slice(0, 4)) || null : null);
const lite = (m: TmdbMovie): MovieLite => ({
  id: String(m.id),
  title: m.title,
  originalTitle: m.original_title,
  year: yearOf(m.release_date),
  poster: m.poster_path ? `${IMG}/w92${m.poster_path}` : null,
});

type FullMovie = MovieLite & { image: string; cast: string[]; director: string | null; synopsis: string | null };

async function getFullMovie(id: string): Promise<FullMovie> {
  if (isDemo) {
    const d = DEMO_PUZZLES.find((m) => m.id === id) ?? DEMO_PUZZLES[0];
    return d as DemoMovie;
  }
  const m = await tmdb<
    TmdbMovie & {
      credits: { cast: { name: string }[]; crew: { job: string; name: string }[] };
      images: { posters: { file_path: string; iso_639_1: string | null; vote_average: number }[] };
    }
  >(`/movie/${id}`, { append_to_response: "credits,images", include_image_language: "pt,en,null" });

  // Prioriza cartaz em português ou neutro/sem texto, ou o poster_path oficial
  const posters = m.images?.posters ?? [];
  const pick = posters.find((p) => p.iso_639_1 === "pt") ?? posters.find((p) => p.iso_639_1 === null) ?? posters[0];
  const path = pick?.file_path ?? m.poster_path;
  const firstSentence = m.overview?.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? m.overview ?? null;

  return {
    ...lite(m),
    image: path ? `${IMG}/w780${path}` : "",
    cast: m.credits.cast.slice(0, 3).map((c) => c.name),
    director: m.credits.crew.find((c) => c.job === "Director")?.name ?? null,
    synopsis: firstSentence ? redact(firstSentence, m.title) : null,
  };
}

/** Remove o título da sinopse para não entregar a resposta. */
function redact(text: string, title: string) {
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(esc, "gi"), "█████");
}

export function maskTitle(title: string, reveal = 0): string {
  const chars = Array.from(title);
  const letterIdx = chars.map((c, i) => (/[\p{L}\p{N}]/u.test(c) ? i : -1)).filter((i) => i >= 0);
  // Revela de forma determinística: primeira letra de cada palavra primeiro
  const order = [
    ...letterIdx.filter((i) => i === 0 || chars[i - 1] === " "),
    ...letterIdx.filter((i) => !(i === 0 || chars[i - 1] === " ")),
  ];
  const shown = new Set(order.slice(0, reveal));
  return chars.map((c, i) => (letterIdx.includes(i) && !shown.has(i) ? "_" : c)).join("");
}

// ---------- filme do dia ----------
async function dailyId(date: string): Promise<string> {
  const n = dayNumber(date);
  if (isDemo) return DEMO_PUZZLES[(((n - 1) % DEMO_PUZZLES.length) + DEMO_PUZZLES.length) % DEMO_PUZZLES.length].id;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const sb = createClient(url, key);
      const { data } = await sb.from("daily_movies").select("tmdb_id").eq("date", date).maybeSingle();
      if (data?.tmdb_id) return String(data.tmdb_id);
    } catch (e) {
      console.error("Supabase indisponível, usando lista de reserva", e);
    }
  }
  return String(FALLBACK_IDS[(((n - 1) % FALLBACK_IDS.length) + FALLBACK_IDS.length) % FALLBACK_IDS.length]);
}

async function randomId(): Promise<string> {
  if (isDemo) return DEMO_PUZZLES[Math.floor(Math.random() * DEMO_PUZZLES.length)].id;
  const page = 1 + Math.floor(Math.random() * 25); // top 500 populares
  const data = await tmdb<{ results: TmdbMovie[] }>("/movie/popular", { page: String(page), region: "BR" }, 3600);
  const pool = data.results.filter((m) => m.poster_path);
  return String(pool[Math.floor(Math.random() * pool.length)].id);
}

export async function resolveMovieId(token: string): Promise<string | null> {
  const t = decodeToken(token);
  if (!t) return null;
  return t.kind === "d" ? dailyId(t.value) : t.value;
}

export async function buildPuzzle(opts: { date?: string; random?: boolean }): Promise<Puzzle> {
  let id: string, token: string, mode: Puzzle["mode"], date: string | null = null;
  if (opts.random) {
    id = await randomId();
    token = encodeToken("r", id);
    mode = "infinite";
  } else {
    date = opts.date ?? todayBR();
    id = await dailyId(date);
    token = encodeToken("d", date);
    mode = date === todayBR() ? "daily" : "archive";
  }
  const m = await getFullMovie(id);
  return {
    token,
    mode,
    date,
    number: date ? dayNumber(date) : null,
    image: m.image,
    year: m.year,
    cast: m.cast,
    director: m.director,
    synopsis: m.synopsis,
    mask: maskTitle(m.title),
    demo: isDemo,
  };
}

export async function getAnswer(token: string): Promise<MovieLite | null> {
  const id = await resolveMovieId(token);
  if (!id) return null;
  const m = await getFullMovie(id);
  return { id: m.id, title: m.title, originalTitle: m.originalTitle, year: m.year, poster: m.poster };
}

export async function checkGuess(token: string, guessId: string, guessYear: number | null): Promise<GuessResult> {
  const answer = await getAnswer(token);
  if (!answer) throw new Error("token inválido");
  if (answer.id === guessId) return "correct";
  if (guessYear && answer.year && Math.abs(guessYear - answer.year) <= 3) return "close";
  return "wrong";
}

export async function searchMovies(q: string): Promise<MovieLite[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  if (isDemo) {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const nq = norm(query);
    return DEMO_CATALOG.filter((m) => norm(m.title).includes(nq) || norm(m.originalTitle ?? "").includes(nq)).slice(0, 8);
  }
  const data = await tmdb<{ results: TmdbMovie[] }>("/search/movie", { query, include_adult: "false" }, 3600);
  return data.results.slice(0, 8).map(lite);
}
