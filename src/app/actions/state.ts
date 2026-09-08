"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Todas as ações agora VERIFICAM o erro e retornam { ok } ou { error }.
// O cliente reverte a mudança otimista e avisa se falhar (nunca "sucesso" falso).

export async function setPrazoStatus(id: string, status: "a_validar" | "confirmado" | "urgente") {
  if (!["a_validar", "confirmado", "urgente"].includes(status)) return { error: "status inválido" as const };
  const supabase = createSupabaseServer();
  const { error } = await supabase.from("prazos").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/prazos"); revalidatePath("/dashboard"); revalidatePath("/agenda");
  return { ok: true as const };
}

const NEXT: Record<string, string> = { proposto: "aprovado", aprovado: "depositado", depositado: "recebido" };
export async function advanceHonorario(id: string, current: string) {
  const next = NEXT[current];
  if (!next) return { ok: true as const, done: true };
  const supabase = createSupabaseServer();
  const patch: any = { status: next };
  if (next === "recebido") patch.paid_at = new Date().toISOString();
  const { error } = await supabase.from("honorarios").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/honorarios"); revalidatePath("/dashboard");
  return { ok: true as const, status: next };
}

export async function setHonorarioStatus(id: string, status: string) {
  if (!["proposto", "aprovado", "depositado", "recebido"].includes(status)) return { error: "status inválido" as const };
  const supabase = createSupabaseServer();
  const patch: any = { status };
  if (status === "recebido") patch.paid_at = new Date().toISOString();
  const { error } = await supabase.from("honorarios").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/honorarios"); revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function setArchived(id: string, archived: boolean) {
  const supabase = createSupabaseServer();
  const { error } = await supabase.from("communications").update({ archived }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inbox"); revalidatePath("/dashboard");
  return { ok: true as const };
}
