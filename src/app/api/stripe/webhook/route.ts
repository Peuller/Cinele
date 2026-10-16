import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook do Stripe (Payment Links). Configure no dashboard do Stripe os eventos:
 *  - checkout.session.completed  → ativa Premium (usa client_reference_id = user.id)
 *  - customer.subscription.deleted → desativa Premium
 */
function verify(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  const sig = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
  return fresh && sig.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !service) return NextResponse.json({ error: "Não configurado" }, { status: 501 });

  const payload = await req.text();
  if (!verify(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }
  const event = JSON.parse(payload);
  const sb = createClient(url, service);
  const obj = event.data.object;

  if (event.type === "checkout.session.completed" && obj.client_reference_id) {
    await sb
      .from("profiles")
      .update({ is_premium: true, stripe_customer_id: obj.customer, updated_at: new Date().toISOString() })
      .eq("id", obj.client_reference_id);
  }
  if (event.type === "customer.subscription.deleted" && obj.customer) {
    await sb.from("profiles").update({ is_premium: false }).eq("stripe_customer_id", obj.customer);
  }
  return NextResponse.json({ received: true });
}
