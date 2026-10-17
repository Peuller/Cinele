#!/usr/bin/env node
/**
 * Baixa metadados atualizados e faz o DOWNLOAD REAL dos cartazes (.jpg)
 * para a pasta local public/posters/, salvando em src/data/movies.json
 * com caminhos locais (/posters/xxx.jpg).
 *
 * Uso:
 *   TMDB_API_KEY=sua_chave node scripts/download-all.mjs [quantidade=100]
 * ou apenas:
 *   node scripts/download-all.mjs
 */

import fs from "fs";
import path from "path";

const POSTERS_DIR = path.join(process.cwd(), "public/posters");
const DATA_FILE = path.join(process.cwd(), "src/data/movies.json");

// Cria diretório de imagens se não existir
fs.mkdirSync(POSTERS_DIR, { recursive: true });

// Obtém a chave do TMDB
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

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function main() {
  if (!tmdbKey || tmdbKey.includes("COLOQUE_SUA_CHAVE")) {
    console.error("\n❌ ATENÇÃO: Nenhuma chave TMDB_API_KEY encontrada!");
    console.error("Coloque sua chave no .env ou execute:");
    console.error("TMDB_API_KEY=sua_chave_aqui node scripts/download-all.mjs\n");
    process.exit(1);
  }

  const limit = Number(process.argv[2] || 100);
  console.log(`🚀 Iniciando download de ${limit} filmes e seus cartazes para /public/posters/...`);

  const movies = [];
  const seenIds = new Set();
  const lists = ["popular", "top_rated"];

  for (const list of lists) {
    for (let page = 1; page <= 10; page++) {
      if (movies.length >= limit) break;
      const url = `https://api.themoviedb.org/3/movie/${list}?api_key=${tmdbKey}&language=pt-BR&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      for (const m of data.results || []) {
        if (movies.length >= limit) break;
        if (!m.poster_path || m.adult || seenIds.has(m.id)) continue;
        seenIds.add(m.id);

        try {
          // Detalhes extras com créditos e imagens alternativas
          const dUrl = `https://api.themoviedb.org/3/movie/${m.id}?api_key=${tmdbKey}&language=pt-BR&append_to_response=credits,images&include_image_language=pt,en,null`;
          const dRes = await fetch(dUrl);
          if (!dRes.ok) continue;
          const detail = await dRes.json();

          const cast = (detail.credits?.cast || []).slice(0, 3).map((c) => c.name);
          const director = detail.credits?.crew?.find((c) => c.job === "Director")?.name || null;
          const year = m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : null;

          // Seleciona o melhor cartaz (prioriza pt ou sem texto)
          const posters = detail.images?.posters || [];
          const pick = posters.find((p) => p.iso_639_1 === "pt") || posters.find((p) => p.iso_639_1 === null) || posters[0];
          const posterPath = pick?.file_path || m.poster_path;

          // Nome do arquivo local
          const localFileName = `${m.id}.jpg`;
          const localDest = path.join(POSTERS_DIR, localFileName);
          const tmdbImageUrl = `https://image.tmdb.org/t/p/w780${posterPath}`;

          // Baixa a imagem fisicamente se ainda não tiver
          if (!fs.existsSync(localDest) || fs.statSync(localDest).size === 0) {
            await downloadFile(tmdbImageUrl, localDest);
          }

          movies.push({
            id: String(m.id),
            title: m.title,
            originalTitle: m.original_title,
            year,
            director: director || "Desconhecido",
            cast: cast.length ? cast : ["Elenco não informado"],
            synopsis: m.overview || "Sinopse não disponível.",
            poster: `/posters/${localFileName}`,
            image: `/posters/${localFileName}`,
          });

          process.stdout.write(`\rBaixado: ${movies.length}/${limit} - ${m.title}                                `);
        } catch (err) {
          // ignora falha individual e continua
        }
      }
    }
  }

  // Salva o JSON com os caminhos 100% locais
  fs.writeFileSync(DATA_FILE, JSON.stringify(movies, null, 2), "utf8");
  console.log(`\n\n🎉 CONCLUÍDO COM SUCESSO!`);
  console.log(`📁 Cartazes salvos localmente em: public/posters/`);
  console.log(`📄 Base de dados salva em: src/data/movies.json`);
  console.log(`🎬 Total de filmes prontos para uso comercial 100% offline: ${movies.length}`);
}

main().catch(console.error);
