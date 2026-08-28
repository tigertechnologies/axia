"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Prazos ──────────────────────────────────────────────────
export async function setPrazoStatus(id: string, status: "a_validar" | "confirmado" | "urgente") {
  const supabase = createSupabaseServer();
  await supabase.from("prazos").update({ status }).eq("id", id);
  revalidatePath("/prazos"); revalidatePath("/dashboard"); revalidatePath("/agenda");
}

// ── Honorários: avança para a próxima etapa do pipeline ─────
const NEXT: Record<string, string> = { proposto: "aprovado", aprovado: "depositado", depositado: "recebido" };
export async function advanceHonorario(id: string, current: string) {
  const next = NEXT[current];
  if (!next) return { done: true };
  const supabase = createSupabaseServer();
  const patch: any = { status: next };
  if (next === "recebido") patch.paid_at = new Date().toISOString();
  await supabase.from("honorarios").update(patch).eq("id", id);
  revalidatePath("/honorarios"); revalidatePath("/dashboard");
  return { status: next };
}

export async function setHonorarioStatus(id: string, status: string) {
  const supabase = createSupabaseServer();
  const patch: any = { status };
  if (status === "recebido") patch.paid_at = new Date().toISOString();
  await supabase.from("honorarios").update(patch).eq("id", id);
  revalidatePath("/honorarios"); revalidatePath("/dashboard");
}

// ── Comunicações: arquivar / desarquivar ────────────────────
export async function setArchived(id: string, archived: boolean) {
  const supabase = createSupabaseServer();
  await supabase.from("communications").update({ archived }).eq("id", id);
  revalidatePath("/inbox"); revalidatePath("/dashboard");
}
