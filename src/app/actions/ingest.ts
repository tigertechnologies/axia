"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { classifyEmail } from "@/lib/classify";
import { revalidatePath } from "next/cache";

export async function analyzeEmail(text: string) {
  if (!text || text.trim().length < 5) return { error: "Cole o conteúdo do e-mail." };

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "no_org" };

  const c = await classifyEmail(text);

  // 1) grava a comunicação classificada na inbox
  const { error: e1 } = await supabase.from("communications").insert({
    org_id: org.id, category: c.category, sender: c.sender, subject: c.subject,
    snippet: c.snippet, process_ref: c.process_ref, received_at: new Date().toISOString(),
    validated: false,
  });
  if (e1) return { error: e1.message };

  const extras: string[] = [];

  // A05: cria eventos a partir do que foi extraído, INDEPENDENTE da categoria
  // principal (uma nomeação pode trazer prazo e honorário na mesma mensagem).
  if (c.due_date) {  // só há data quando é vencimento explícito e válido
    await supabase.from("prazos").insert({
      org_id: org.id, titulo: c.subject.slice(0, 60), process_ref: c.process_ref,
      due_date: c.due_date, status: "a_validar",
    });
    extras.push("prazo criado (a validar)");
  } else if (c.due_note) {
    extras.push(c.due_note);  // ex.: "dias úteis — confirmar" (sem criar data errada)
  }

  if (c.amount_cents) {
    await supabase.from("honorarios").insert({
      org_id: org.id, process_ref: c.process_ref, amount_cents: c.amount_cents, status: "proposto",
    });
    extras.push("honorário lançado (proposto)");
  }

  revalidatePath("/inbox"); revalidatePath("/dashboard"); revalidatePath("/prazos"); revalidatePath("/honorarios"); revalidatePath("/processos");

  return {
    ok: true as const,
    category: c.category,
    process_ref: c.process_ref,
    needs_review: c.needs_review,
    extras,
  };
}
