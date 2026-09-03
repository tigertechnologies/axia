import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../AppShell";
import ConfigClient from "./ConfigClient";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  return "Plano " + c[0].toUpperCase() + c.slice(1);
}

export default async function ConfiguracoesPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: prazos }, { data: pericias }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id, subscription_status").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("category, validated"),
      supabase.from("prazos").select("status"),
      supabase.from("pericias").select("id"),
    ]);

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const counts = { inbox: C.length, nomeacoes: C.filter((c) => c.category === "nomeacao").length, prazos: P.length, pericias: (pericias ?? []).length };
  const bell = C.filter((c) => c.category === "nomeacao" && !c.validated).length + P.filter((p) => p.status === "urgente").length;

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={counts} bell={bell}>
      <ConfigClient
        email={user.email ?? ""}
        nome={`${profile?.nome ?? ""} ${profile?.sobrenome ?? ""}`.trim()}
        crm={profile?.crm ?? ""}
        uf={profile?.uf ?? ""}
        especialidade={profile?.especialidade ?? ""}
        planLabel={planLabelFrom(org?.plan_id ?? null)}
        status={org?.subscription_status ?? "pending_subscription"}
      />
    </AppShell>
  );
}
