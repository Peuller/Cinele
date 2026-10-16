import { NextResponse } from "next/server";
import { checkGuess, getAnswer } from "@/lib/server/game";
import { MAX_ATTEMPTS, type GuessResponse } from "@/lib/types";

/** body: { token, guessId, guessYear, attempt } — attempt é 1-based */
export async function POST(req: Request) {
  const { token, guessId, guessYear, attempt } = await req.json();
  if (!token || !guessId) return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  try {
    const result = await checkGuess(token, String(guessId), guessYear ?? null);
    const over = result === "correct" || Number(attempt) >= MAX_ATTEMPTS;
    const body: GuessResponse = { result };
    if (over) body.answer = (await getAnswer(token)) ?? undefined;
    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao verificar palpite" }, { status: 400 });
  }
}
