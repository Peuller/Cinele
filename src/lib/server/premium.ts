import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Verifica se a requisição pertence a um assinante Premium.
 * Sem Supabase configurado (modo demonstração), o Premium fica liberado.
 */
export async function isPremiumRequest(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return true;

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return false;
  const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: user } = await sb.auth.getUser(jwt);
  if (!user.user) return false;
  const { data } = await sb.from("profiles").select("is_premium").eq("id", user.user.id).maybeSingle();
  return !!data?.is_premium;
}
