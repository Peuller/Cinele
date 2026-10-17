import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { resolveMovieId, getMovieById, verifyRevealKey } from "@/lib/server/game";

const focusPoints = [
  { x: 0.50, y: 0.50 }, // centro
  { x: 0.40, y: 0.40 }, // centro-esquerda
  { x: 0.60, y: 0.45 }, // centro-direita
  { x: 0.50, y: 0.65 }, // inferior central
  { x: 0.30, y: 0.60 }, // inferior esquerdo
  { x: 0.70, y: 0.60 }, // inferior direito
];

const scales = [6.5, 4.8, 3.4, 2.3, 1.5];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const stageParam = searchParams.get("s");
  const revealKey = searchParams.get("k");

  if (!token) {
    return new NextResponse("Token required", { status: 400 });
  }

  const movieId = await resolveMovieId(token);
  if (!movieId) {
    return new NextResponse("Invalid token", { status: 404 });
  }

  const movie = getMovieById(movieId);
  if (!movie) {
    return new NextResponse("Movie not found", { status: 404 });
  }

  const stage = Math.max(0, Math.min(5, parseInt(stageParam ?? "0", 10) || 0));

  // Se for o estágio 5 (revelação total do cartaz), exige a chave de autorização
  if (stage === 5) {
    if (!verifyRevealKey(token, revealKey)) {
      return new NextResponse("Unauthorized", { status: 403 });
    }
  }

  // Caminho do cartaz local em public/posters/[id].jpg
  const relativePath = movie.poster || movie.image || `/posters/${movie.id}.jpg`;
  const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  const filePath = path.join(process.cwd(), "public", cleanPath);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Image not found", { status: 404 });
  }

  try {
    const img = sharp(filePath);
    const meta = await img.metadata();
    const width = meta.width || 780;
    const height = meta.height || 1170;

    let buffer: Buffer;

    if (stage >= 5) {
      // Estágio final: imagem completa otimizada, sem metadados EXIF
      buffer = await sharp(filePath)
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
    } else {
      // Estágios 0 a 4: recorte milimétrico com zoom
      const seed = movie.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const fp = focusPoints[seed % focusPoints.length];
      const scale = scales[stage] || 6.5;

      const cropW = Math.round(width / scale);
      const cropH = Math.round(height / scale);
      const cx = Math.round(fp.x * width);
      const cy = Math.round(fp.y * height);
      const left = Math.max(0, Math.min(width - cropW, Math.round(cx - cropW / 2)));
      const top = Math.max(0, Math.min(height - cropH, Math.round(cy - cropH / 2)));

      buffer = await sharp(filePath)
        .extract({ left, top, width: cropW, height: cropH })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": stage === 5 ? "private, max-age=86400" : "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Frame crop error:", err);
    return new NextResponse("Error generating frame", { status: 500 });
  }
}
