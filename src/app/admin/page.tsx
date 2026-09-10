import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  isCurrentUserAdmin, adminListAssinantes, adminWebhooksPendentes,
  adminMetricas, adminListAudit, adminListSnapshots, adminRegistrarSnapshot,
  type Assinante,
} from "../actions/admin";
import { adminListLeads } from "../actions/leads";
import {
  adminListWebhooks, adminWebhooksResumo, adminIngestaoResumo, adminListIngestionErrors,
} from "../actions/system";
import { adminListFinanceiro } from "../actions/finance";
import { adminListCampanhas } from "../actions/campaigns";
import { adminGetBanner, adminMarketingMetricas } from "../actions/marketing";
import { adminListEmailCampaigns } from "../actions/email";
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

  const [
    { data: profile }, list, pendentes, metricas, auditoria, historico, leadsRes,
    webhooks, whResumo, ingestao, ingErros, financeiro, campanhas, banner, mktMetricas, emailCampaigns,
  ] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
    adminListAssinantes(),
    adminWebhooksPendentes(),
    adminMetricas(),
    adminListAudit(100),
    adminListSnapshots(30),
    adminListLeads(),
    adminListWebhooks(50),
    adminWebhooksResumo(),
    adminIngestaoResumo(),
    adminListIngestionErrors(50),
    adminListFinanceiro(),
    adminListCampanhas(),
    adminGetBanner(),
    adminMarketingMetricas(),
    adminListEmailCampaigns(),
  ]);
  const assinantes = (list.data ?? []) as Assinante[];
  const ativos = assinantes.filter((a) => isActiveStatus(a.subscription_status));
  const mrrCents = ativos.reduce((s, a) => s + mrrDoPlano(a.plan_id), 0);
  const porPlano: Record<string, number> = { essential: 0, pro: 0, office: 0 };
  ativos.forEach((a) => { porPlano[planCode(a.plan_id)]++; });

  await adminRegistrarSnapshot(assinantes.length, ativos.length, mrrCents, porPlano);
  const historicoAtualizado = await adminListSnapshots(30);

  const config = {
    stripe_key: !!process.env.STRIPE_SECRET_KEY,
    stripe_webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    inbound_secret: !!process.env.AXIA_INBOUND_SECRET,
    inbound_org: !!process.env.AXIA_INBOUND_ORG_ID,
    site_url: !!process.env.NEXT_PUBLIC_SITE_URL,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const stripeTestMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test");

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
        sistema={{ webhooks, whResumo, ingestao, ingErros, config }}
        financeiro={{ rows: financeiro.data ?? [], erro: financeiro.error, stripeTestMode }}
        campanhas={{ rows: campanhas.data ?? [], erro: campanhas.error }}
        banner={banner}
        mktMetricas={mktMetricas}
        emailCampaigns={emailCampaigns}
      />
    </AppShell>
  );
}
