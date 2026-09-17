import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../AppShell";
import PlanoClient from "./PlanoClient";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function planCode(planId: string | null) { return (planId ?? "").split("_")[0]; }
function planLabelFrom(planId: string | null) {
  const nomes: Record<string, string> = { essential: "Essential", pro: "Pro", office: "Master" };
  const c = planCode(planId);
  return c ? "Plano " + (nomes[c] ?? c) : "AXIA";
}

export default async function PlanoPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
    supabase.from("organizations").select("plan_id, subscription_status").eq("owner_id", user.id).maybeSingle(),
  ]);

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={{ inbox: 0, nomeacoes: 0, prazos: 0, pericias: 0 }} bell={0}>
      <PlanoClient planId={org?.plan_id ?? null} status={org?.subscription_status ?? null} />
    </AppShell>
  );
}
