import type { MovieLite } from "../types";
import LOCAL_MOVIES from "../../data/movies.json";

/** Filmes jogáveis com dados completos para uso 100% local e gratuito. */
export type DemoMovie = MovieLite & {
  image: string;
  cast: string[];
  director: string;
  synopsis: string;
};

export const DEMO_PUZZLES: DemoMovie[] = LOCAL_MOVIES as DemoMovie[];

export const DEMO_CATALOG: MovieLite[] = DEMO_PUZZLES.map((m) => ({
  id: m.id,
  title: m.title,
  originalTitle: m.originalTitle,
  year: m.year,
  poster: m.poster,
}));

