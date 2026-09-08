"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function ownOrg() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  return org?.id ?? null;
}

// Carrega dados de DEMONSTRAÇÃO, claramente marcados (is_demo=true), sem tocar
// em dados reais. Reversível por clearDemoData.
export async function loadDemoData() {
  const orgId = await ownOrg();
  if (!orgId) return { error: "no_org" as const };
  const admin = createSupabaseAdmin();

  const { count } = await admin.from("communications").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_demo", true);
  if ((count ?? 0) > 0) return { ok: true as const, already: true };

  const now = Date.now();
  const h = (n: number) => new Date(now - n * 3600_000).toISOString();
  const d = (n: number) => new Date(now + n * 86400_000).toISOString().slice(0, 10);

  await admin.from("communications").insert([
    { org_id: orgId, is_demo: true, category: "nomeacao", sender: "TJSP · 2ª Vara Cível", subject: "[DEMO] Nomeação para perícia médica no processo 1002345-67.2025", snippet: "Exemplo de demonstração.", process_ref: "1002345", received_at: h(2) },
    { org_id: orgId, is_demo: true, category: "prazo", sender: "Adv. João Mendes", subject: "[DEMO] Prazo para entrega de laudo", snippet: "Exemplo de demonstração.", process_ref: "1002345", received_at: h(5) },
    { org_id: orgId, is_demo: true, category: "pericia", sender: "Vara do Trabalho · SP", subject: "[DEMO] Agendamento de perícia", snippet: "Exemplo de demonstração.", process_ref: "0012", received_at: h(26) },
    { org_id: orgId, is_demo: true, category: "honorarios", sender: "TJMG", subject: "[DEMO] Honorários periciais: R$ 2.400,00", snippet: "Exemplo de demonstração.", process_ref: "0034521", received_at: h(28) },
  ]);
  await admin.from("pericias").insert([
    { org_id: orgId, is_demo: true, titulo: "[DEMO] Perícia médica", local: "Vara do Trabalho", process_ref: "0012", scheduled_at: d(17) + "T14:00:00Z" },
  ]);
  await admin.from("prazos").insert([
    { org_id: orgId, is_demo: true, titulo: "[DEMO] Entrega de laudo", process_ref: "1002345", due_date: d(1), status: "urgente" },
    { org_id: orgId, is_demo: true, titulo: "[DEMO] Manifestação", process_ref: "0034521", due_date: d(15), status: "confirmado" },
  ]);
  await admin.from("honorarios").insert([
    { org_id: orgId, is_demo: true, process_ref: "1002345", amount_cents: 240000, status: "aprovado" },
    { org_id: orgId, is_demo: true, process_ref: "0034521", amount_cents: 180000, status: "depositado" },
  ]);

  revalidatePath("/dashboard"); revalidatePath("/inbox"); revalidatePath("/prazos"); revalidatePath("/pericias"); revalidatePath("/honorarios"); revalidatePath("/processos");
  return { ok: true as const };
}

// Remove SOMENTE os dados de demonstração (is_demo=true). Não toca em dados reais.
export async function clearDemoData() {
  const orgId = await ownOrg();
  if (!orgId) return { error: "no_org" as const };
  const admin = createSupabaseAdmin();
  for (const t of ["communications", "pericias", "prazos", "honorarios"]) {
    await admin.from(t).delete().eq("org_id", orgId).eq("is_demo", true);
  }
  revalidatePath("/dashboard"); revalidatePath("/inbox"); revalidatePath("/prazos"); revalidatePath("/pericias"); revalidatePath("/honorarios"); revalidatePath("/processos");
  return { ok: true as const };
}
