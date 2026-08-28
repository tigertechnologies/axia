"use server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function validateCommunication(id: string) {
  const supabase = createSupabaseServer();
  await supabase.from("communications").update({ validated: true }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function signOut() {
  const supabase = createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
