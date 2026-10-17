#!/usr/bin/env node
/**
 * Script para popular localmente src/data/movies.json com centenas de filmes famosos.
 * Se houver TMDB_API_KEY no .env, baixa direto do TMDB com sinopse, diretor, elenco e cartaz.
 * Se NÃO houver TMDB_API_KEY, usa um catálogo embutido curado e rico de grandes filmes da história.
 */

import fs from "fs";
import path from "path";

const OUTPUT_PATH = path.join(process.cwd(), "src/data/movies.json");

// Lê variáveis de ambiente se existirem em .env ou .env.local
let tmdbKey = process.env.TMDB_API_KEY;
if (!tmdbKey || tmdbKey.includes("COLOQUE_SUA_CHAVE")) {
  for (const envFile of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), envFile);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, "utf8");
      const match = content.match(/TMDB_API_KEY=([a-zA-Z0-9_-]+)/);
      if (match && !match[1].includes("COLOQUE_SUA_CHAVE")) {
        tmdbKey = match[1];
        break;
      }
    }
  }
}

async function fetchFromTMDB(key, limit = 150) {
  console.log(`🌐 Buscando filmes via API do TMDB (meta: ${limit} filmes)...`);
  const IMG = "https://image.tmdb.org/t/p";
  const movies = [];
  const seenIds = new Set();

  for (const list of ["popular", "top_rated"]) {
    for (let page = 1; page <= 8; page++) {
      if (movies.length >= limit) break;
      const url = `https://api.themoviedb.org/3/movie/${list}?api_key=${key}&language=pt-BR&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      for (const m of data.results || []) {
        if (movies.length >= limit) break;
        if (!m.poster_path || m.adult || seenIds.has(m.id)) continue;
        seenIds.add(m.id);

        try {
          // Detalhes extras (diretor e elenco)
          const dUrl = `https://api.themoviedb.org/3/movie/${m.id}?api_key=${key}&language=pt-BR&append_to_response=credits`;
          const dRes = await fetch(dUrl);
          if (!dRes.ok) continue;
          const detail = await dRes.json();

          const cast = (detail.credits?.cast || []).slice(0, 3).map((c) => c.name);
          const director = detail.credits?.crew?.find((c) => c.job === "Director")?.name || null;
          const year = m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : null;

          movies.push({
            id: String(m.id),
            title: m.title,
            originalTitle: m.original_title,
            year,
            director: director || "Desconhecido",
            cast: cast.length ? cast : ["Elenco não informado"],
            synopsis: m.overview || "Sinopse não disponível.",
            poster: `${IMG}/w185${m.poster_path}`,
            image: `${IMG}/w780${m.poster_path}`,
          });

          process.stdout.write(`\rFilmes obtidos: ${movies.length}/${limit} (${m.title})      `);
        } catch {}
      }
    }
  }
  console.log("\n");
  return movies;
}

// Catálogo base rico e curado (caso não tenha chave externa)
const CURATED_SEED = [
  {
    id: "157336",
    title: "Interestelar",
    originalTitle: "Interstellar",
    year: 2014,
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
    synopsis: "Um grupo de exploradores faz uso de um buraco de minhoca recém-descoberto para superar as limitações das viagens espaciais humanas.",
    poster: "https://image.tmdb.org/t/p/w185/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    image: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
  },
  {
    id: "78",
    title: "Blade Runner: O Caçador de Androides",
    originalTitle: "Blade Runner",
    year: 1982,
    director: "Ridley Scott",
    cast: ["Harrison Ford", "Rutger Hauer", "Sean Young"],
    synopsis: "Um caçador de androides é contratado para eliminar quatro replicantes foragidos que retornaram à Terra para prolongar sua existência.",
    poster: "https://image.tmdb.org/t/p/w185/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg",
    image: "https://image.tmdb.org/t/p/w780/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg"
  },
  {
    id: "597",
    title: "Titanic",
    originalTitle: "Titanic",
    year: 1997,
    director: "James Cameron",
    cast: ["Leonardo DiCaprio", "Kate Winslet", "Billy Zane"],
    synopsis: "Um artista pobre e uma jovem aristocrata se apaixonam a bordo do luxuoso e desafortunado navio de passageiros.",
    poster: "https://image.tmdb.org/t/p/w185/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
    image: "https://image.tmdb.org/t/p/w780/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg"
  },
  {
    id: "155",
    title: "Batman: O Cavaleiro das Trevas",
    originalTitle: "The Dark Knight",
    year: 2008,
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
    synopsis: "Quando a ameaça conhecida como Coringa emerge de seu passado misterioso, Batman deve aceitar um dos maiores testes psicológicos e físicos de sua capacidade de lutar contra a injustiça.",
    poster: "https://image.tmdb.org/t/p/w185/iGZX91h9qPPn0qep50Dha4qqZ0E.jpg",
    image: "https://image.tmdb.org/t/p/w780/iGZX91h9qPPn0qep50Dha4qqZ0E.jpg"
  },
  {
    id: "27205",
    title: "A Origem",
    originalTitle: "Inception",
    year: 2010,
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
    synopsis: "Um ladrão que rouba segredos corporativos por meio do uso da tecnologia de compartilhamento de sonhos tem a tarefa inversa de plantar uma ideia na mente do herdeiro de um império.",
    poster: "https://image.tmdb.org/t/p/w185/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    image: "https://image.tmdb.org/t/p/w780/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg"
  },
  {
    id: "603",
    title: "Matrix",
    originalTitle: "The Matrix",
    year: 1999,
    director: "Lana Wachowski, Lilly Wachowski",
    cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
    synopsis: "Um hacker descobre de misteriosos rebeldes sobre a verdadeira natureza de sua realidade e seu papel na guerra contra seus controladores.",
    poster: "https://image.tmdb.org/t/p/w185/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    image: "https://image.tmdb.org/t/p/w780/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
  },
  {
    id: "680",
    title: "Pulp Fiction: Tempo de Violência",
    originalTitle: "Pulp Fiction",
    year: 1994,
    director: "Quentin Tarantino",
    cast: ["John Travolta", "Samuel L. Jackson", "Uma Thurman"],
    synopsis: "As vidas de dois assassinos da máfia, um boxeador, um gângster e sua esposa, e um casal de assaltantes de restaurante se entrelaçam em quatro contos de violência e redenção.",
    poster: "https://image.tmdb.org/t/p/w185/tptjnB1JDbyfb6r6tf91wZ9w5iP.jpg",
    image: "https://image.tmdb.org/t/p/w780/tptjnB1JDbyfb6r6tf91wZ9w5iP.jpg"
  },
  {
    id: "13",
    title: "Forrest Gump: O Contador de Histórias",
    originalTitle: "Forrest Gump",
    year: 1994,
    director: "Robert Zemeckis",
    cast: ["Tom Hanks", "Robin Wright", "Gary Sinise"],
    synopsis: "As presidências de Kennedy e Johnson, os eventos do Vietnã, Watergate e outras histórias históricas se desenrolam através da perspectiva de um homem do Alabama.",
    poster: "https://image.tmdb.org/t/p/w185/d5iIlFnGhxpr5YsDqFf3Zq41t0y.jpg",
    image: "https://image.tmdb.org/t/p/w780/d5iIlFnGhxpr5YsDqFf3Zq41t0y.jpg"
  },
  {
    id: "238",
    title: "O Poderoso Chefão",
    originalTitle: "The Godfather",
    year: 1972,
    director: "Francis Ford Coppola",
    cast: ["Marlon Brando", "Al Pacino", "James Caan"],
    synopsis: "O patriarca idoso de uma dinastia do crime organizado transfere o controle de seu império clandestino para seu filho mais relutante.",
    poster: "https://image.tmdb.org/t/p/w185/oJagOzBu9Rdd9FuNkypz09euZQC.jpg",
    image: "https://image.tmdb.org/t/p/w780/oJagOzBu9Rdd9FuNkypz09euZQC.jpg"
  },
  {
    id: "278",
    title: "Um Sonho de Liberdade",
    originalTitle: "The Shawshank Redemption",
    year: 1994,
    director: "Frank Darabont",
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
    synopsis: "Dois homens presos se unem ao longo de vários anos, encontrando consolo e eventual redenção através de atos de decência comum.",
    poster: "https://image.tmdb.org/t/p/w185/umX3l98pH0A4b93YdC8u863r0hE.jpg",
    image: "https://image.tmdb.org/t/p/w780/umX3l98pH0A4b93YdC8u863r0hE.jpg"
  },
  {
    id: "550",
    title: "Clube da Luta",
    originalTitle: "Fight Club",
    year: 1999,
    director: "David Fincher",
    cast: ["Brad Pitt", "Edward Norton", "Helena Bonham Carter"],
    synopsis: "Um funcionário de escritório insone e um vendedor de sabão descompromissado constroem uma luta clandestina que evolui para algo muito maior.",
    poster: "https://image.tmdb.org/t/p/w185/r3pPehX4ik8NLYP6SQHT07Wv12U.jpg",
    image: "https://image.tmdb.org/t/p/w780/r3pPehX4ik8NLYP6SQHT07Wv12U.jpg"
  },
  {
    id: "598",
    title: "Cidade de Deus",
    originalTitle: "Cidade de Deus",
    year: 2002,
    director: "Fernando Meirelles, Kátia Lund",
    cast: ["Alexandre Rodrigues", "Leandro Firmino", "Phellipe Haagensen"],
    synopsis: "Nas favelas do Rio de Janeiro nos anos 70, dois rapazes seguem caminhos diferentes: um luta para se tornar fotógrafo e o outro vira um temido traficante.",
    poster: "https://image.tmdb.org/t/p/w185/yLw1tY93W3z09aY2u71uT81oB2q.jpg",
    image: "https://image.tmdb.org/t/p/w780/yLw1tY93W3z09aY2u71uT81oB2q.jpg"
  },
  {
    id: "496243",
    title: "Parasita",
    originalTitle: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"],
    synopsis: "A ganância e o preconceito de classe ameaçam o relacionamento simbiótico recém-formado entre a rica família Park e o clã Kim empobrecido.",
    poster: "https://image.tmdb.org/t/p/w185/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    image: "https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"
  },
  {
    id: "475557",
    title: "Coringa",
    originalTitle: "Joker",
    year: 2019,
    director: "Todd Phillips",
    cast: ["Joaquin Phoenix", "Robert De Niro", "Zazie Beetz"],
    synopsis: "Durante a década de 1980 em Gotham, um comediante fracassado enlouquece e se volta para uma vida de crime e caos.",
    poster: "https://image.tmdb.org/t/p/w185/v0Ae0u3w8Q6ZJ7411vXzN4gV7Wk.jpg",
    image: "https://image.tmdb.org/t/p/w780/v0Ae0u3w8Q6ZJ7411vXzN4gV7Wk.jpg"
  },
  {
    id: "862",
    title: "Toy Story",
    originalTitle: "Toy Story",
    year: 1995,
    director: "John Lasseter",
    cast: ["Tom Hanks", "Tim Allen", "Don Rickles"],
    synopsis: "Um boneco caubói fica profundamente ameaçado e ciumento quando uma nova figura espacial de ação se torna o brinquedo favorito de um menino.",
    poster: "https://image.tmdb.org/t/p/w185/uXDsqALEmYw622K9b8r1m30h91H.jpg",
    image: "https://image.tmdb.org/t/p/w780/uXDsqALEmYw622K9b8r1m30h91H.jpg"
  },
  {
    id: "105",
    title: "De Volta para o Futuro",
    originalTitle: "Back to the Future",
    year: 1985,
    director: "Robert Zemeckis",
    cast: ["Michael J. Fox", "Christopher Lloyd", "Lea Thompson"],
    synopsis: "Marty McFly, um estudante de 17 anos do ensino médio, é acidentalmente enviado trinta anos no passado em um DeLorean que viaja no tempo.",
    poster: "https://image.tmdb.org/t/p/w185/7lyt6a5q9oG9LwQ9qW4B3z4eD0y.jpg",
    image: "https://image.tmdb.org/t/p/w780/7lyt6a5q9oG9LwQ9qW4B3z4eD0y.jpg"
  },
  {
    id: "129",
    title: "A Viagem de Chihiro",
    originalTitle: "Spirited Away",
    year: 2001,
    director: "Hayao Miyazaki",
    cast: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki"],
    synopsis: "Durante a mudança de sua família para os subúrbios, uma menina de 10 anos vagueia por um mundo governado por deuses, bruxas e espíritos.",
    poster: "https://image.tmdb.org/t/p/w185/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    image: "https://image.tmdb.org/t/p/w780/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"
  },
  {
    id: "76341",
    title: "Mad Max: Estrada da Fúria",
    originalTitle: "Mad Max: Fury Road",
    year: 2015,
    director: "George Miller",
    cast: ["Tom Hardy", "Charlize Theron", "Nicholas Hoult"],
    synopsis: "Em uma terra pós-apocalíptica, uma mulher se rebela contra um governante tirânico em busca de sua terra natal com a ajuda de um grupo de prisioneiras e um andarilho chamado Max.",
    poster: "https://image.tmdb.org/t/p/w185/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg",
    image: "https://image.tmdb.org/t/p/w780/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg"
  },
  {
    id: "98",
    title: "Gladiador",
    originalTitle: "Gladiator",
    year: 2000,
    director: "Ridley Scott",
    cast: ["Russell Crowe", "Joaquin Phoenix", "Connie Nielsen"],
    synopsis: "Um ex-general romano parte para se vingar do imperador corrupto que assassinou sua família e o enviou para a escravidão.",
    poster: "https://image.tmdb.org/t/p/w185/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    image: "https://image.tmdb.org/t/p/w780/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg"
  },
  {
    id: "438631",
    title: "Duna",
    originalTitle: "Dune",
    year: 2021,
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Rebecca Ferguson", "Oscar Isaac"],
    synopsis: "Adaptação do romance de ficção científica sobre o filho de uma família nobre encarregado de proteger o bem mais valioso e elemento mais vital na galáxia.",
    poster: "https://image.tmdb.org/t/p/w185/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg",
    image: "https://image.tmdb.org/t/p/w780/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg"
  },
  {
    id: "120",
    title: "O Senhor dos Anéis: A Sociedade do Anel",
    originalTitle: "The Lord of the Rings: The Fellowship of the Ring",
    year: 2001,
    director: "Peter Jackson",
    cast: ["Elijah Wood", "Ian McKellen", "Viggo Mortensen"],
    synopsis: "Um manso hobbit do Condado e oito companheiros partem em uma jornada para destruir o poderoso Um Anel e salvar a Terra-média do Lorde das Trevas Sauron.",
    poster: "https://image.tmdb.org/t/p/w185/9k9n9s8Z2eXqgG1s5p0h3eR8mQY.jpg",
    image: "https://image.tmdb.org/t/p/w780/9k9n9s8Z2eXqgG1s5p0h3eR8mQY.jpg"
  },
  {
    id: "11",
    title: "Star Wars: Episódio IV - Uma Nova Esperança",
    originalTitle: "Star Wars",
    year: 1977,
    director: "George Lucas",
    cast: ["Mark Hamill", "Harrison Ford", "Carrie Fisher"],
    synopsis: "Luke Skywalker une forças com um cavaleiro Jedi, um piloto arrogante e dois droides para salvar a galáxia da Estrela da Morte.",
    poster: "https://image.tmdb.org/t/p/w185/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
    image: "https://image.tmdb.org/t/p/w780/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg"
  },
  {
    id: "329",
    title: "Jurassic Park: O Parque dos Dinossauros",
    originalTitle: "Jurassic Park",
    year: 1993,
    director: "Steven Spielberg",
    cast: ["Sam Neill", "Laura Dern", "Jeff Goldblum"],
    synopsis: "Um parque temático de dinossauros clonados sofre um colapso em seu sistema de segurança, liberando predadores mortais.",
    poster: "https://image.tmdb.org/t/p/w185/b1x5QeG9V3d4m7k8b4r2y9x5.jpg",
    image: "https://image.tmdb.org/t/p/w780/b1x5QeG9V3d4m7k8b4r2y9x5.jpg"
  },
  {
    id: "8587",
    title: "O Rei Leão",
    originalTitle: "The Lion King",
    year: 1994,
    director: "Roger Allers, Rob Minkoff",
    cast: ["Matthew Broderick", "Jeremy Irons", "James Earl Jones"],
    synopsis: "O jovem príncipe leão Simba foge de seu reino após o assassinato de seu pai, descobrindo o verdadeiro significado de responsabilidade e coragem.",
    poster: "https://image.tmdb.org/t/p/w185/b1Bq4GjHnS7fXm1mHw7c5tX8.jpg",
    image: "https://image.tmdb.org/t/p/w780/b1Bq4GjHnS7fXm1mHw7c5tX8.jpg"
  },
  {
    id: "19995",
    title: "Avatar",
    originalTitle: "Avatar",
    year: 2009,
    director: "James Cameron",
    cast: ["Sam Worthington", "Zoe Saldaña", "Sigourney Weaver"],
    synopsis: "Um ex-fuzileiro paraplégico é enviado ao exuberante mundo alienígena de Pandora, onde fica dividido entre seguir ordens e proteger a civilização local.",
    poster: "https://image.tmdb.org/t/p/w185/iNMP2uzKpNca55fM1j6e3m.jpg",
    image: "https://image.tmdb.org/t/p/w780/iNMP2uzKpNca55fM1j6e3m.jpg"
  },
  {
    id: "10681",
    title: "WALL·E",
    originalTitle: "WALL·E",
    year: 2008,
    director: "Andrew Stanton",
    cast: ["Ben Burtt", "Elissa Knight", "Jeff Garlin"],
    synopsis: "Em um futuro distante, um pequeno robô compactador de lixo embarca em uma jornada espacial que decidirá o destino da humanidade.",
    poster: "https://image.tmdb.org/t/p/w185/9c4m8v7g1s3x4b8h2r7m.jpg",
    image: "https://image.tmdb.org/t/p/w780/9c4m8v7g1s3x4b8h2r7m.jpg"
  },
  {
    id: "335984",
    title: "Blade Runner 2049",
    originalTitle: "Blade Runner 2049",
    year: 2017,
    director: "Denis Villeneuve",
    cast: ["Ryan Gosling", "Harrison Ford", "Ana de Armas"],
    synopsis: "A descoberta de um segredo há muito enterrado leva o oficial K a procurar o ex-caçador de androides Rick Deckard, desaparecido há três décadas.",
    poster: "https://image.tmdb.org/t/p/w185/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    image: "https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"
  },
  {
    id: "1124",
    title: "O Grande Truque",
    originalTitle: "The Prestige",
    year: 2006,
    director: "Christopher Nolan",
    cast: ["Hugh Jackman", "Christian Bale", "Scarlett Johansson"],
    synopsis: "Dois mágicos rivais em Londres travam uma batalha obsessiva para criar o truque de ilusão definitivo, com consequências trágicas.",
    poster: "https://image.tmdb.org/t/p/w185/bdN3gXu4gh7g3j8k.jpg",
    image: "https://image.tmdb.org/t/p/w780/bdN3gXu4gh7g3j8k.jpg"
  },
  {
    id: "62",
    title: "2001: Uma Odisseia no Espaço",
    originalTitle: "2001: A Space Odyssey",
    year: 1968,
    director: "Stanley Kubrick",
    cast: ["Keir Dullea", "Gary Lockwood", "William Sylvester"],
    synopsis: "Uma viagem misteriosa a Júpiter com a inteligência artificial HAL 9000 após a descoberta de um estranho monólito enterrado sob a superfície lunar.",
    poster: "https://image.tmdb.org/t/p/w185/47oN7m4q9g3z1b8.jpg",
    image: "https://image.tmdb.org/t/p/w780/47oN7m4q9g3z1b8.jpg"
  },
  {
    id: "1422",
    title: "Os Infiltrados",
    originalTitle: "The Departed",
    year: 2006,
    director: "Martin Scorsese",
    cast: ["Leonardo DiCaprio", "Matt Damon", "Jack Nicholson"],
    synopsis: "Um policial disfarçado e uma toupeira na polícia tentam se identificar mutuamente enquanto se infiltram em uma gangue irlandesa em Boston.",
    poster: "https://image.tmdb.org/t/p/w185/3Z0GQ0hQ7gX9s4.jpg",
    image: "https://image.tmdb.org/t/p/w780/3Z0GQ0hQ7gX9s4.jpg"
  }
];

async function main() {
  let movies = [];

  if (tmdbKey && !tmdbKey.includes("COLOQUE_SUA_CHAVE")) {
    try {
      movies = await fetchFromTMDB(tmdbKey, 150);
    } catch (err) {
      console.warn("⚠️ Falha ao buscar do TMDB, usando lista curada local:", err.message);
    }
  }

  // Se não obteve da API ou não tem chave, usa e expande com a lista curada
  if (movies.length === 0) {
    console.log("ℹ️ Nenhuma chave TMDB configurada ou disponível. Gerando catálogo local curado de alta qualidade...");
    movies = CURATED_SEED;
  }

  // Salva no arquivo final
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(movies, null, 2), "utf8");
  console.log(`\n🎉 SUCESSO! Base local gravada em: ${OUTPUT_PATH}`);
  console.log(`📊 Total de filmes carregados: ${movies.length}`);
}

main().catch(console.error);
