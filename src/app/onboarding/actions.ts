"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

// A07: o onboarding NÃO injeta mais demonstração automaticamente.
// A conta nasce vazia (estado honesto). A demonstração é carregada de forma
// explícita e identificada em Configurações (ações loadDemoData/clearDemoData).
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

  return { ok: true };
}
