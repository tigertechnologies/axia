"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseBRLToCents } from "@/lib/money";

const PRAZO_STATUS = ["a_validar", "confirmado", "urgente"];
const HON_STATUS = ["proposto", "aprovado", "depositado", "recebido"];

// Validações de entrada em runtime (Etapa 3): não confiar na interface.
function clean(s: string | undefined, max: number): string | null {
  const v = (s ?? "").trim();
  return v ? v.slice(0, max) : null;
}
function isYMD(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

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
  const titulo = clean(input.titulo, 200);
  if (!titulo) return { error: "Informe o tipo do prazo." };
  if (!isYMD(input.due_date)) return { error: "Data de vencimento inválida." };
  const status = PRAZO_STATUS.includes(input.status ?? "") ? input.status! : "a_validar";
  const { error } = await supabase.from("prazos").insert({
    org_id: org, titulo, process_ref: clean(input.process_ref, 100), due_date: input.due_date, status,
  });
  if (error) return { error: error.message };
  revalidatePath("/prazos"); revalidatePath("/dashboard"); revalidatePath("/agenda");
  return { ok: true as const };
}

export async function createPericia(input: { titulo: string; local: string; process_ref: string; scheduled_at: string }) {
  const { supabase, org } = await orgId();
  if (!org) return { error: "no_org" as const };
  const titulo = clean(input.titulo, 200);
  if (!titulo) return { error: "Informe o título da perícia." };
  const when = new Date(input.scheduled_at);
  if (isNaN(when.getTime())) return { error: "Data/hora inválida." };
  const { error } = await supabase.from("pericias").insert({
    org_id: org, titulo, local: clean(input.local, 120), process_ref: clean(input.process_ref, 100), scheduled_at: when.toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/pericias"); revalidatePath("/dashboard"); revalidatePath("/agenda");
  return { ok: true as const };
}

export async function createHonorario(input: { process_ref: string; amount_reais: string; status?: string }) {
  const { supabase, org } = await orgId();
  if (!org) return { error: "no_org" as const };
  const cents = parseBRLToCents(input.amount_reais);
  if (cents === null || cents <= 0) return { error: "Informe um valor válido maior que zero." };
  const status = HON_STATUS.includes(input.status ?? "") ? input.status! : "proposto";
  const { error } = await supabase.from("honorarios").insert({
    org_id: org, process_ref: clean(input.process_ref, 100), amount_cents: cents, status,
  });
  if (error) return { error: error.message };
  revalidatePath("/honorarios"); revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function createProcesso(input: { process_ref: string; vara: string; subject?: string }) {
  const { supabase, org } = await orgId();
  if (!org) return { error: "no_org" as const };
  const ref = clean(input.process_ref, 100);
  if (!ref) return { error: "Informe o número do processo." };
  const { error } = await supabase.from("communications").insert({
    org_id: org, category: "nomeacao", sender: clean(input.vara, 120), process_ref: ref,
    subject: clean(input.subject, 200) || `Processo ${ref} cadastrado manualmente`,
    snippet: "Cadastro manual pelo perito.", received_at: new Date().toISOString(), validated: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/processos"); revalidatePath("/inbox"); revalidatePath("/dashboard");
  return { ok: true as const };
}
