#!/usr/bin/env node
/**
 * Curadoria semanal: puxa os 500 filmes mais populares do TMDB, escolhe N
 * filmes ainda não usados e grava em daily_movies a partir da próxima data livre.
 *
 * Uso:  node --env-file=.env.local scripts/curate.mjs [dias=7]
 * Cron: 0 3 * * 1  (toda segunda, 03:00) — ou GitHub Actions / Supabase cron.
 *
 * Requer: TMDB_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const DAYS = Number(process.argv[2] || 7);
const { TMDB_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!TMDB_API_KEY || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Defina TMDB_API_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function tmdb(path, params = {}) {
  const url = new URL("https://api.themoviedb.org/3" + path);
  url.search = new URLSearchParams({ api_key: TMDB_API_KEY, language: "pt-BR", ...params });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

// 1) Pool: top 500 (25 páginas) — usamos "top_rated" + "popular" para equilibrar clássicos e atuais
const pool = new Map();
for (const list of ["popular", "top_rated"]) {
  for (let page = 1; page <= 25; page++) {
    const { results } = await tmdb(`/movie/${list}`, { page: String(page) });
    for (const m of results) {
      // filtros de jogabilidade: tem backdrop, bastante votos, não é adulto
      if (m.backdrop_path && !m.adult && m.vote_count > 3000) pool.set(m.id, m);
    }
  }
}

// 2) Remove já usados
const { data: used } = await sb.from("daily_movies").select("tmdb_id, date").order("date", { ascending: false });
const usedIds = new Set((used ?? []).map((u) => u.tmdb_id));
const candidates = [...pool.values()].filter((m) => !usedIds.has(m.id));
if (candidates.length < DAYS) throw new Error("Poucos candidatos restantes no pool.");

// 3) Embaralha e escolhe
for (let i = candidates.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
}
const picks = candidates.slice(0, DAYS);

// 4) Próxima data livre
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const last = used?.[0]?.date;
let start = new Date((last && last >= today ? last : today) + "T12:00:00Z");
if (last && last >= today) start.setUTCDate(start.getUTCDate() + 1);

const rows = picks.map((m, i) => {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + i);
  return { date: d.toISOString().slice(0, 10), tmdb_id: m.id, title: m.title };
});

const { error } = await sb.from("daily_movies").upsert(rows);
if (error) throw error;
console.table(rows);
