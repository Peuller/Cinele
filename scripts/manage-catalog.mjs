/**
 * Script para popular ou expandir o catálogo local de filmes (src/data/movies.json)
 * Pode ser executado com: node scripts/add-movie.js "Nome do Filme" ou lendo uma lista.
 */
import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "src/data/movies.json");

export function loadCatalog() {
  if (!fs.existsSync(FILE_PATH)) return [];
  const raw = fs.readFileSync(FILE_PATH, "utf8");
  return JSON.parse(raw);
}

export function saveCatalog(movies) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(movies, null, 2), "utf8");
  console.log(`✅ Catálogo atualizado com sucesso! Total: ${movies.length} filmes.`);
}

console.log("Gerenciador de filmes locais carregado.");
