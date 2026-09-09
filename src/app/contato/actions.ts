"use server";

import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function submitLead(input: { nome: string; email: string; telefone?: string; mensagem?: string; hp?: string }) {
  // Honeypot: bots preenchem o campo oculto. Aceita em silêncio e ignora.
  if (input.hp && input.hp.trim() !== "") return { ok: true as const };

  const nome = (input.nome ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  if (!nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Informe nome e um e-mail válido." as const };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("leads").upsert(
    {
      nome, email,
      telefone: (input.telefone ?? "").trim() || null,
      mensagem: (input.mensagem ?? "").trim() || null,
      source: "form", status: "novo",
    },
    { onConflict: "email", ignoreDuplicates: false },
  );
  if (error) return { error: "Não foi possível enviar agora. Tente novamente." as const };
  return { ok: true as const };
}
