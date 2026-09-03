import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { classifyEmail } from "@/lib/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const c = await classifyEmail(`${payload.Subject ?? ""}\n${text}`);

  await admin.from("communications").insert({
    org_id: orgId, category: c.category, sender: c.sender || fromName,
    subject: (payload.Subject || c.subject).slice(0, 200), snippet: c.snippet,
    process_ref: c.process_ref, received_at: new Date().toISOString(), validated: false,
  });

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
