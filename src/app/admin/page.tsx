import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  isCurrentUserAdmin, adminListAssinantes, adminWebhooksPendentes,
  adminMetricas, adminListAudit, adminListSnapshots, adminRegistrarSnapshot,
  type Assinante,
} from "../actions/admin";
import { adminListLeads } from "../actions/leads";
import { PLANS, planCode, isActiveStatus } from "@/lib/plans";
import AppShell from "../AppShell";
import AdminClient from "./AdminClient";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function mrrDoPlano(planId: string | null): number {
  const p = PLANS[planId ?? ""]; if (!p) return 0;
  return p.interval === "year" ? Math.round(p.amount / 12) : p.amount;
}

export default async function AdminPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/dashboard");

  const [{ data: profile }, list, pendentes, metricas, auditoria, historico, leadsRes] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
    adminListAssinantes(),
    adminWebhooksPendentes(),
    adminMetricas(),
    adminListAudit(100),
    adminListSnapshots(30),
    adminListLeads(),
  ]);

  const assinantes = (list.data ?? []) as Assinante[];
  const ativos = assinantes.filter((a) => isActiveStatus(a.subscription_status));
  const mrrCents = ativos.reduce((s, a) => s + mrrDoPlano(a.plan_id), 0);
  const porPlano: Record<string, number> = { essential: 0, pro: 0, office: 0 };
  ativos.forEach((a) => { porPlano[planCode(a.plan_id)]++; });

  await adminRegistrarSnapshot(assinantes.length, ativos.length, mrrCents, porPlano);
  const historicoAtualizado = await adminListSnapshots(30);

  return (
    <AppShell nome={profile?.nome ?? "Admin"} planLabel="Administrador" counts={{ inbox: 0, nomeacoes: 0, prazos: 0, pericias: 0 }} bell={0}>
      <AdminClient
        assinantes={assinantes}
        webhooksPendentes={pendentes}
        erro={list.error}
        metricas={metricas}
        auditoria={auditoria}
        historico={historicoAtualizado.length ? historicoAtualizado : historico}
        leads={leadsRes.data ?? []}
      />
    </AppShell>
  );
}
