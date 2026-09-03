"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

// Abre o Portal de Cobrança do Stripe (cancelar, trocar cartão, ver faturas).
export async function openBillingPortal() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!org?.stripe_customer_id) return { error: "no_customer" as const };

  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${site}/configuracoes`,
  });
  return { url: session.url };
}

// Salva os dados de perfil editados.
export async function saveProfile(data: { crm?: string; uf?: string; especialidade?: string; telefone?: string }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };
  await supabase.from("profiles").update(data).eq("id", user.id);
  return { ok: true as const };
}

// Exclusão de conta (exigência Apple/Google e LGPD).
// Cancela a assinatura no Stripe (evita cobrança de conta excluída) e apaga o
// usuário; o banco remove os dados vinculados em cascata (owner_id ON DELETE CASCADE).
export async function deleteAccount(confirmText: string) {
  if (confirmText !== "EXCLUIR") return { error: "confirm_mismatch" as const };

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };

  const admin = createSupabaseAdmin();
  const { data: org } = await admin.from("organizations").select("id, stripe_customer_id").eq("owner_id", user.id).maybeSingle();

  // 1) cancela assinatura ativa no Stripe (best-effort — não bloqueia a exclusão)
  if (org?.id) {
    const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id, status").eq("org_id", org.id);
    for (const s of sub ?? []) {
      if (s.stripe_subscription_id && s.status !== "canceled") {
        try { await stripe().subscriptions.cancel(s.stripe_subscription_id); } catch { /* segue mesmo se já cancelada */ }
      }
    }
  }

  // 2) apaga o usuário (cascata remove organização e todos os dados vinculados)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/?conta=excluida");
}
