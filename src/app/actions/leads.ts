"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { LEAD_STATUS } from "./leads-const";
import { revalidatePath } from "next/cache";

export interface Lead {
  id: string; nome: string | null; email: string; telefone: string | null;
  source: string; status: string; mensagem: string | null; notes: string | null;
  org_id: string | null; created_at: string; updated_at: string;
}

// Lista todos os leads (RLS permite admin). Sincroniza os cadastros antes.
export async function adminListLeads(): Promise<{ error?: string; data?: Lead[] }> {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" };
  const supabase = createSupabaseServer();
  try { await supabase.rpc("admin_sync_signup_leads"); } catch { /* best-effort */ }
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) return { error: error.message };
  return { data: (data ?? []) as Lead[] };
}

export async function adminUpdateLead(id: string, patch: { status?: string; notes?: string }) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  if (patch.status && !LEAD_STATUS.includes(patch.status)) return { error: "status inválido" as const };
  const supabase = createSupabaseServer();

  const { data: antes } = await supabase.from("leads").select("email, status").eq("id", id).maybeSingle();
  const { error } = await supabase.from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };

  if (patch.status && antes && patch.status !== antes.status) {
    try {
      await supabase.rpc("admin_log_action", {
        p_action: "lead_status", p_target_org: null, p_target_email: antes.email,
        p_detail: { de: antes.status, para: patch.status },
      });
    } catch { /* log best-effort */ }
  }
  revalidatePath("/admin");
  return { ok: true as const };
}

// Importa uma lista de leads (source='import'). Upsert por e-mail. Só admin.
export async function adminImportLeads(rows: { nome?: string; email: string; telefone?: string }[]) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const limpos = rows
    .map((r) => ({
      nome: (r.nome ?? "").trim() || null,
      email: (r.email ?? "").trim().toLowerCase(),
      telefone: (r.telefone ?? "").trim() || null,
      source: "import", status: "novo",
    }))
    .filter((r) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email));

  if (limpos.length === 0) return { error: "nenhum e-mail válido na planilha" as const };

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("leads").upsert(limpos, { onConflict: "email", ignoreDuplicates: true });
  if (error) return { error: error.message };

  try {
    const supabase = createSupabaseServer();
    await supabase.rpc("admin_log_action", {
      p_action: "leads_import", p_target_org: null, p_target_email: null,
      p_detail: { quantidade: limpos.length },
    });
  } catch { /* best-effort */ }

  revalidatePath("/admin");
  return { ok: true as const, importados: limpos.length };
}
