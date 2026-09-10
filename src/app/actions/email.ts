"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { createHash } from "crypto";
import { revalidatePath } from "next/cache";

export interface EmailCampaign {
  id: string; assunto: string; publico: string; destinatarios: number;
  enviados: number; falhas: number; status: string; created_at: string; sent_at: string | null;
}

export async function adminListEmailCampaigns(): Promise<EmailCampaign[]> {
  if (!(await isCurrentUserAdmin())) return [];
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("email_campaigns").select("id,assunto,publico,destinatarios,enviados,falhas,status,created_at,sent_at").order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as EmailCampaign[];
}

export async function adminEmailContagem(publico: string): Promise<number> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_email_contagem", { p_publico: publico });
  return typeof data === "number" ? data : 0;
}

// Token estável de descadastro por e-mail (não precisa guardar antes de enviar).
function unsubToken(email: string): string {
  const segredo = process.env.AXIA_UNSUB_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "axia";
  return createHash("sha256").update(email.toLowerCase() + "|" + segredo).digest("hex").slice(0, 32);
}

function linkDescadastro(email: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://axia.tigertechnology.com.br";
  const e = encodeURIComponent(email.toLowerCase());
  return `${site}/descadastrar?e=${e}&t=${unsubToken(email)}`;
}

// Envia o e-mail em massa. Requer Postmark de ENVIO configurado:
//   POSTMARK_SERVER_TOKEN   = token do Server de envio
//   POSTMARK_FROM           = remetente verificado (ex.: contato@tigertechnology.com.br)
//   POSTMARK_BROADCAST_STREAM = id do message stream de broadcast (ex.: "broadcast")
export async function adminEnviarEmail(assunto: string, corpo: string, publico: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  if (!assunto.trim() || !corpo.trim()) return { error: "Preencha assunto e mensagem." as const };
  if (!["leads", "assinantes", "ambos"].includes(publico)) return { error: "público inválido" as const };

  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.POSTMARK_FROM;
  const stream = process.env.POSTMARK_BROADCAST_STREAM;
  if (!token || !from || !stream) {
    return { error: "Envio não configurado. Falta configurar o Postmark de envio (token, remetente e stream de broadcast) nas variáveis de ambiente." as const };
  }

  const supabase = createSupabaseServer();
  const { data: dests } = await supabase.rpc("admin_email_destinatarios", { p_publico: publico });
  const lista = (dests ?? []) as { email: string; nome: string }[];
  if (lista.length === 0) return { error: "Nenhum destinatário para este público." as const };

  // Envia em lotes com a API de batch do Postmark (até 500 por chamada).
  let enviados = 0, falhas = 0;
  const lotes: typeof lista[] = [];
  for (let i = 0; i < lista.length; i += 500) lotes.push(lista.slice(i, i + 500));

  for (const lote of lotes) {
    const mensagens = lote.map((d) => {
      const link = linkDescadastro(d.email);
      const rodape = `\n\n—\nVocê recebeu este e-mail da AXIA. Para não receber mais, descadastre-se: ${link}`;
      const htmlRodape = `<hr style="margin-top:24px"/><p style="font-size:12px;color:#6B7C93">Você recebeu este e-mail da AXIA. <a href="${link}">Descadastrar</a>.</p>`;
      return {
        From: from,
        To: d.email,
        Subject: assunto,
        TextBody: corpo + rodape,
        HtmlBody: corpo.replace(/\n/g, "<br/>") + htmlRodape,
        MessageStream: stream,
      };
    });

    try {
      const res = await fetch("https://api.postmarkapp.com/email/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Postmark-Server-Token": token },
        body: JSON.stringify(mensagens),
      });
      const results = await res.json();
      if (Array.isArray(results)) {
        results.forEach((r: { ErrorCode?: number }) => { if (r.ErrorCode === 0) enviados++; else falhas++; });
      } else { falhas += lote.length; }
    } catch { falhas += lote.length; }
  }

  const status = falhas === 0 ? "enviado" : enviados > 0 ? "enviado" : "erro";
  await supabase.rpc("admin_email_registrar", {
    p_assunto: assunto.slice(0, 200), p_corpo: corpo.slice(0, 5000), p_publico: publico,
    p_dest: lista.length, p_env: enviados, p_falhas: falhas, p_status: status,
  });
  try {
    await supabase.rpc("admin_log_action", { p_action: "email_broadcast", p_target_org: null, p_target_email: null, p_detail: { publico, enviados, falhas } });
  } catch { /* best-effort */ }

  revalidatePath("/admin");
  return { ok: true as const, enviados, falhas, total: lista.length };
}
