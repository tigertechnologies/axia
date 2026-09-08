"use server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function validateCommunication(id: string) {
  const supabase = createSupabaseServer();
  const { error } = await supabase.from("communications").update({ validated: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard"); revalidatePath("/inbox"); revalidatePath("/nomeacoes");
  return { ok: true as const };
}

export async function signOut() {
  const supabase = createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
