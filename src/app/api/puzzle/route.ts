import { NextResponse } from "next/server";
import { buildPuzzle, isValidDate, todayBR } from "@/lib/server/game";
import { isPremiumRequest } from "@/lib/server/premium";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const random = searchParams.get("random") === "1";
  const date = searchParams.get("date");
  const today = todayBR();

  if (date && (!isValidDate(date) || date > today)) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }
  const needsPremium = random || (date && date !== today);
  if (needsPremium && !(await isPremiumRequest(req))) {
    return NextResponse.json({ error: "Recurso exclusivo Premium" }, { status: 402 });
  }
  try {
    const puzzle = await buildPuzzle({ date: date ?? today, random });
    return NextResponse.json(puzzle);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Não foi possível carregar a cena" }, { status: 502 });
  }
}
