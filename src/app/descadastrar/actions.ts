"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export async function descadastrar(email: string, token: string): Promise<{ ok?: boolean; error?: string }> {
  if (!email || !token) return { error: "Link inválido." };
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc("public_unsubscribe", { p_email: email, p_token: token });
  if (error || data !== true) return { error: "Não foi possível processar. Tente novamente." };
  return { ok: true };
}
