import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../AppShell";
import NomeacoesClient from "./NomeacoesClient";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  return "Plano " + c[0].toUpperCase() + c.slice(1);
}

export default async function NomeacoesPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: prazos }, { data: pericias }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("*").order("received_at", { ascending: false }),
      supabase.from("prazos").select("status"),
      supabase.from("pericias").select("id"),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const nomeacoes = C.filter((c) => c.category === "nomeacao");
  const counts = {
    inbox: C.length,
    nomeacoes: nomeacoes.length,
    prazos: P.length,
    pericias: (pericias ?? []).length,
  };
  const bell = nomeacoes.filter((c) => !c.validated).length + P.filter((p) => p.status === "urgente").length;

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={counts} bell={bell}>
      <NomeacoesClient nomeacoes={nomeacoes as any} />
    </AppShell>
  );
}
