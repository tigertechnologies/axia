"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function orgId() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, org: null as string | null };
  const { data } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  return { supabase, org: data?.id ?? null };
}

export async function createPrazo(input: { titulo: string; process_ref: string; due_date: string; status?: string }) {
  const { supabase, org } = await orgId();
  if (!org) return { error: "no_org" as const };
  const { error } = await supabase.from("prazos").insert({
    org_id: org, titulo: input.titulo, process_ref: input.process_ref || null,
    due_date: input.due_date, status: input.status || "a_validar",
  });
  if (error) return { error: error.message };
  revalidatePath("/prazos"); revalidatePath("/dashboard"); revalidatePath("/agenda");
  return { ok: true as const };
}

export async function createPericia(input: { titulo: string; local: string; process_ref: string; scheduled_at: string }) {
  const { supabase, org } = await orgId();
  if (!org) return { error: "no_org" as const };
  const { error } = await supabase.from("pericias").insert({
    org_id: org, titulo: input.titulo, local: input.local || null,
    process_ref: input.process_ref || null, scheduled_at: input.scheduled_at,
  });
  if (error) return { error: error.message };
  revalidatePath("/pericias"); revalidatePath("/dashboard"); revalidatePath("/agenda");
  return { ok: true as const };
}

export async function createHonorario(input: { process_ref: string; amount_reais: string; status?: string }) {
  const { supabase, org } = await orgId();
  if (!org) return { error: "no_org" as const };
  const cents = Math.round(parseFloat(String(input.amount_reais).replace(/\./g, "").replace(",", ".")) * 100);
  if (!cents || cents < 0) return { error: "valor inválido" };
  const { error } = await supabase.from("honorarios").insert({
    org_id: org, process_ref: input.process_ref || null, amount_cents: cents, status: input.status || "proposto",
  });
  if (error) return { error: error.message };
  revalidatePath("/honorarios"); revalidatePath("/dashboard");
  return { ok: true as const };
}

// "Novo processo" = registra uma nomeação inicial vinculada ao número do processo
export async function createProcesso(input: { process_ref: string; vara: string; subject?: string }) {
  const { supabase, org } = await orgId();
  if (!org) return { error: "no_org" as const };
  const { error } = await supabase.from("communications").insert({
    org_id: org, category: "nomeacao", sender: input.vara || null, process_ref: input.process_ref || null,
    subject: input.subject || `Processo ${input.process_ref} cadastrado manualmente`,
    snippet: "Cadastro manual pelo perito.", received_at: new Date().toISOString(), validated: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/processos"); revalidatePath("/inbox"); revalidatePath("/dashboard");
  return { ok: true as const };
}
