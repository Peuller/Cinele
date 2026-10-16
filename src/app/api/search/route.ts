import { NextResponse } from "next/server";
import { searchMovies } from "@/lib/server/game";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await searchMovies(q));
  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 502 });
  }
}
