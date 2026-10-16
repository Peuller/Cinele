import type { MovieLite } from "../types";

/** Filmes jogáveis no modo demonstração (sem TMDB_API_KEY). */
export type DemoMovie = MovieLite & {
  image: string;
  cast: string[];
  director: string;
  synopsis: string;
};

export const DEMO_PUZZLES: DemoMovie[] = [
  {
    id: "157336",
    title: "Interestelar",
    originalTitle: "Interstellar",
    year: 2014,
    poster: "https://image.tmdb.org/t/p/w185/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    image: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
    director: "Christopher Nolan",
    synopsis:
      "As reservas naturais da Terra estão chegando ao fim e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial.",
  },
  {
    id: "78",
    title: "Blade Runner: O Caçador de Androides",
    originalTitle: "Blade Runner",
    year: 1982,
    poster: "https://image.tmdb.org/t/p/w185/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg",
    image: "https://image.tmdb.org/t/p/w780/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg",
    cast: ["Harrison Ford", "Rutger Hauer", "Sean Young"],
    director: "Ridley Scott",
    synopsis:
      "No início do século XXI, uma grande corporação desenvolve um robô que é mais forte e ágil que o ser humano.",
  },
  {
    id: "597",
    title: "Titanic",
    originalTitle: "Titanic",
    year: 1997,
    poster: "https://image.tmdb.org/t/p/w185/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
    image: "https://image.tmdb.org/t/p/w780/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
    cast: ["Leonardo DiCaprio", "Kate Winslet", "Billy Zane"],
    director: "James Cameron",
    synopsis:
      "Um artista pobre e uma jovem rica se conhecem e se apaixonam na fatídica viagem inaugural do Titanic em 1912.",
  },
];

/** Catálogo usado pela busca no modo demonstração. */
const EXTRA: [string, string, string, number][] = [
  ["155", "Batman: O Cavaleiro das Trevas", "The Dark Knight", 2008],
  ["27205", "A Origem", "Inception", 2010],
  ["603", "Matrix", "The Matrix", 1999],
  ["680", "Pulp Fiction: Tempo de Violência", "Pulp Fiction", 1994],
  ["13", "Forrest Gump: O Contador de Histórias", "Forrest Gump", 1994],
  ["120", "O Senhor dos Anéis: A Sociedade do Anel", "The Lord of the Rings: The Fellowship of the Ring", 2001],
  ["11", "Star Wars: Episódio IV - Uma Nova Esperança", "Star Wars", 1977],
  ["329", "Jurassic Park: O Parque dos Dinossauros", "Jurassic Park", 1993],
  ["550", "Clube da Luta", "Fight Club", 1999],
  ["238", "O Poderoso Chefão", "The Godfather", 1972],
  ["278", "Um Sonho de Liberdade", "The Shawshank Redemption", 1994],
  ["862", "Toy Story", "Toy Story", 1995],
  ["8587", "O Rei Leão", "The Lion King", 1994],
  ["105", "De Volta para o Futuro", "Back to the Future", 1985],
  ["129", "A Viagem de Chihiro", "Spirited Away", 2001],
  ["496243", "Parasita", "Parasite", 2019],
  ["19995", "Avatar", "Avatar", 2009],
  ["98", "Gladiador", "Gladiator", 2000],
  ["335984", "Blade Runner 2049", "Blade Runner 2049", 2017],
  ["438631", "Duna", "Dune", 2021],
  ["598", "Cidade de Deus", "Cidade de Deus", 2002],
  ["76341", "Mad Max: Estrada da Fúria", "Mad Max: Fury Road", 2015],
  ["475557", "Coringa", "Joker", 2019],
  ["1124", "O Grande Truque", "The Prestige", 2006],
  ["286217", "Perdido em Marte", "The Martian", 2015],
  ["62", "2001: Uma Odisseia no Espaço", "2001: A Space Odyssey", 1968],
  ["10681", "WALL·E", "WALL·E", 2008],
  ["12445", "Harry Potter e as Relíquias da Morte - Parte 2", "Harry Potter and the Deathly Hallows: Part 2", 2011],
  ["1422", "Os Infiltrados", "The Departed", 2006],
  ["4995", "Os Bons Companheiros", "Goodfellas", 1990],
];

export const DEMO_CATALOG: MovieLite[] = [
  ...DEMO_PUZZLES.map(({ id, title, originalTitle, year }) => ({ id, title, originalTitle, year, poster: null })),
  ...EXTRA.map(([id, title, originalTitle, year]) => ({ id, title, originalTitle, year, poster: null })),
];
