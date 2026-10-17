export type MovieLite = {
  id: string;
  title: string;
  originalTitle?: string;
  titleEn?: string;
  year: number | null;
  poster: string | null;
};

/** Dados enviados ao cliente para montar o desafio (sem o título!). */
export type Puzzle = {
  token: string;
  mode: "daily" | "archive" | "infinite";
  number: number | null;
  date: string | null;
  image: string;
  year: number | null;
  cast: string[];
  director: string | null;
  synopsis: string | null;
  synopsisEn?: string | null;
  mask: string; // título com letras ocultas: "O _______ __ ______"
  maskEn?: string; // título com letras ocultas em inglês
  demo: boolean;
};

export type GuessResult = "correct" | "close" | "wrong";

export type GuessEntry = {
  id: string;
  title: string;
  titleEn?: string;
  year: number | null;
  result: GuessResult;
};

export type GuessResponse = {
  result: GuessResult;
  answer?: MovieLite; // enviado apenas quando o jogo termina
};

export const MAX_ATTEMPTS = 5;
