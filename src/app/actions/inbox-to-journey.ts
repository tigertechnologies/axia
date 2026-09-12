"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { autoCriarCardNomeacao } from "./journey-auto";
import { revalidatePath } from "next/cache";

// Cria manualmente um card na Jornada a partir de uma comunicação (ato do médico).
// Reaproveita a mesma lógica idempotente da automação, mas marca ator=medico.
export async function criarCardDaComunicacao(communicationId: string) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" as const };

  // Busca a comunicação (RLS garante que é da org do usuário).
  const { data: comm } = await supabase
    .from("communications").select("id, org_id, subject, process_ref").eq("id", communicationId).maybeSingle();
  if (!comm) return { error: "NOT_FOUND" as const };

  const r = await autoCriarCardNomeacao({
    orgId: comm.org_id, processRef: comm.process_ref, assunto: comm.subject, communicationId: comm.id,
  });
  if (!r.periciaId) return { error: "Não foi possível criar o card." as const };

  revalidatePath("/jornada"); revalidatePath("/inbox");
  return { ok: true as const, periciaId: r.periciaId, criada: r.criada };
}
