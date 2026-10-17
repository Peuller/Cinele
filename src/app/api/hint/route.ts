import { NextResponse } from "next/server";
import { getAnswer, maskTitle } from "@/lib/server/game";

/** Dica extra (recompensa de anúncio): revela N letras do título. body: { token, reveal } */
export async function POST(req: Request) {
  const { token, reveal } = await req.json();
  const answer = token ? await getAnswer(token) : null;
  if (!answer) return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  const n = Math.max(0, Math.min(Number(reveal) || 0, 6));
  const titleEn = answer.titleEn || answer.originalTitle || answer.title;
  return NextResponse.json({
    mask: maskTitle(answer.title, n),
    maskEn: maskTitle(titleEn, n),
  });
}
