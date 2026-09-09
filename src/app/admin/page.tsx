import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isCurrentUserAdmin, adminListAssinantes, adminWebhooksPendentes } from "../actions/admin";
import AppShell from "../AppShell";
import AdminClient from "./AdminClient";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/dashboard");

  const [{ data: profile }, list, pendentes] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
    adminListAssinantes(),
    adminWebhooksPendentes(),
  ]);

  return (
    <AppShell nome={profile?.nome ?? "Admin"} planLabel="Administrador" counts={{ inbox: 0, nomeacoes: 0, prazos: 0, pericias: 0 }} bell={0}>
      <AdminClient assinantes={list.data ?? []} webhooksPendentes={pendentes} erro={list.error} />
    </AppShell>
  );
}
