"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";

export async function completeOnboarding(profile: { crm?: string; uf?: string; especialidade?: string }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).single();
  if (!org) return { error: "no_org" };

  await supabase.from("profiles").update({
    crm: profile.crm, uf: profile.uf, especialidade: profile.especialidade,
    onboarding_completed: true,
  }).eq("id", user.id);

  await seedDemoData(org.id);
  return { ok: true };
}

// Popula a dashboard com dados de demonstração para o primeiro acesso não
// nascer vazio. Substituível pela ingestão real de e-mail + classificação IA.
async function seedDemoData(orgId: string) {
  const admin = createSupabaseAdmin();
  const { count } = await admin.from("communications").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((count ?? 0) > 0) return;

  const now = Date.now();
  const h = (n: number) => new Date(now - n * 3600_000).toISOString();
  const d = (n: number) => new Date(now + n * 86400_000).toISOString().slice(0, 10);

  await admin.from("communications").insert([
    { org_id: orgId, category: "nomeacao", sender: "TJSP · 2ª Vara Cível", subject: "Nomeação para perícia médica no processo 1002345-67.2025", snippet: "A AXIA sugere validar a nomeação e criar o processo.", process_ref: "1002345", received_at: h(2) },
    { org_id: orgId, category: "prazo", sender: "Adv. João Mendes", subject: "Prazo para entrega de laudo — 15 dias corridos", snippet: "Data sugerida: confirme no sistema oficial.", process_ref: "1002345", received_at: h(5) },
    { org_id: orgId, category: "pericia", sender: "Vara do Trabalho · SP", subject: "Agendamento de perícia — 14h00", snippet: "A AXIA adicionou uma sugestão à sua agenda.", process_ref: "0012", received_at: h(26) },
    { org_id: orgId, category: "honorarios", sender: "TJMG", subject: "Honorários periciais arbitrados: R$ 2.400,00", snippet: "Status atualizado para aprovado.", process_ref: "0034521", received_at: h(28) },
    { org_id: orgId, category: "intimacao", sender: "TRF3", subject: "Intimação para prestar esclarecimentos complementares", snippet: "Possível novo prazo identificado.", process_ref: "0087654", received_at: h(50) },
    { org_id: orgId, category: "esclarecimento", sender: "Adv. Marina Lopes", subject: "Pedido de esclarecimento sobre laudo entregue", snippet: "Relacionado ao processo 0087654-21.2024.", process_ref: "0087654", received_at: h(72) },
  ]);

  await admin.from("pericias").insert([
    { org_id: orgId, titulo: "Perícia médica · 14h00", local: "Vara do Trabalho", process_ref: "0012", scheduled_at: d(17) + "T14:00:00Z" },
    { org_id: orgId, titulo: "Perícia · 09h30", local: "2ª Vara Cível", process_ref: "1002", scheduled_at: d(23) + "T09:30:00Z" },
  ]);

  await admin.from("prazos").insert([
    { org_id: orgId, titulo: "Entrega de laudo", process_ref: "1002345", due_date: d(1), status: "urgente" },
    { org_id: orgId, titulo: "Esclarecimentos", process_ref: "0087654", due_date: d(7), status: "a_validar" },
    { org_id: orgId, titulo: "Manifestação", process_ref: "0034521", due_date: d(15), status: "confirmado" },
  ]);

  await admin.from("honorarios").insert([
    { org_id: orgId, process_ref: "1002345", amount_cents: 240000, status: "aprovado" },
    { org_id: orgId, process_ref: "0034521", amount_cents: 180000, status: "depositado" },
    { org_id: orgId, process_ref: "0087654", amount_cents: 320000, status: "proposto" },
  ]);
}
