import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { classifyEmail } from "@/lib/classify";
import { analiseLimit } from "@/lib/plans";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Registra um erro de ingestão (metadado técnico; NUNCA o conteúdo do e-mail).
async function logErro(admin: SupabaseClient, orgId: string | null, stage: string, message: string) {
  try { await admin.from("ingestion_errors").insert({ org_id: orgId, stage, message: message.slice(0, 300) }); } catch { /* best-effort */ }
}

// Recebe e-mails encaminhados via Postmark (Inbound) e os ingere na AXIA.
// Configuração (Vercel → Environment Variables):
//   AXIA_INBOUND_ORG_ID  = id da organização que receberá os e-mails (tabela organizations no Supabase)
//   AXIA_INBOUND_SECRET  = uma senha qualquer; o Postmark chama /api/inbound/email?key=ESSA_SENHA
export async function POST(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!process.env.AXIA_INBOUND_SECRET || key !== process.env.AXIA_INBOUND_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const orgId = process.env.AXIA_INBOUND_ORG_ID;
  if (!orgId) return NextResponse.json({ error: "org_not_configured" }, { status: 500 });

  let payload: any;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  // Formato do Postmark Inbound
  const text: string = (payload.TextBody || payload.StrippedTextReply || payload.HtmlBody || payload.Subject || "").toString();
  const fromName: string | null = payload.FromFull?.Name || payload.From || null;
  if (!text || text.trim().length < 3) return NextResponse.json({ received: true, skipped: "empty" });

  const admin = createSupabaseAdmin();

  // Limite de análises/mês por plano
  const { data: orgRow } = await admin.from("organizations").select("plan_id").eq("id", orgId).maybeSingle();
  const limit = analiseLimit(orgRow?.plan_id ?? null);
  if (limit !== null) {
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
    const { count } = await admin.from("communications").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_demo", false).not("source_hash", "is", null).gte("received_at", inicioMes.toISOString());
    if ((count ?? 0) >= limit) return NextResponse.json({ received: true, skipped: "limit_reached" });
  }

  const c = await classifyEmail(`${payload.Subject ?? ""}\n${text}`);

  const source_hash = createHash("sha256").update(((payload.Subject ?? "") + "\n" + text).trim().toLowerCase()).digest("hex");
  const { error: insComm } = await admin.from("communications").insert({
    org_id: orgId, category: c.category, sender: c.sender || fromName,
    subject: (payload.Subject || c.subject).slice(0, 200), snippet: c.snippet,
    process_ref: c.process_ref, received_at: new Date().toISOString(), validated: false, source_hash,
  });
  if (insComm) {
    if ((insComm as any).code === "23505") return NextResponse.json({ received: true, duplicate: true });
    await logErro(admin, orgId, "insert_communication", (insComm as { message?: string }).message ?? "erro ao inserir comunicação");
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (c.due_date) {  // só quando vencimento explícito e válido (A03/A04)
    await admin.from("prazos").insert({ org_id: orgId, titulo: (payload.Subject || c.subject).slice(0, 60), process_ref: c.process_ref, due_date: c.due_date, status: "a_validar" });
  }
  if (c.amount_cents) {
    await admin.from("honorarios").insert({ org_id: orgId, process_ref: c.process_ref, amount_cents: c.amount_cents, status: "proposto" });
  }

  return NextResponse.json({ received: true, category: c.category, process_ref: c.process_ref });
}

// GET só para você conferir no navegador que a rota existe.
export async function GET() {
  return NextResponse.json({ status: "AXIA inbound endpoint ativo. Use POST (Postmark)." });
}
