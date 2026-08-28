import { redirect, notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../../AppShell";
import ProcessoDetail from "./ProcessoDetail";
import "../../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  return "Plano " + c[0].toUpperCase() + c.slice(1);
}

export default async function ProcessoPage({ params }: { params: { ref: string } }) {
  const ref = decodeURIComponent(params.ref);
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: prazos }, { data: pericias }, { data: honorarios }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("*").eq("process_ref", ref).order("received_at", { ascending: false }),
      supabase.from("prazos").select("*").eq("process_ref", ref).order("due_date", { ascending: true }),
      supabase.from("pericias").select("*").eq("process_ref", ref).order("scheduled_at", { ascending: true }),
      supabase.from("honorarios").select("*").eq("process_ref", ref),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const PE = (pericias ?? []) as any[];
  const H = (honorarios ?? []) as any[];

  if (C.length + P.length + PE.length + H.length === 0) notFound();

  // contadores globais para a sidebar (consulta leve)
  const [{ data: allComms }, { data: allPrazos }, { count: perCount }] = await Promise.all([
    supabase.from("communications").select("category, validated"),
    supabase.from("prazos").select("status"),
    supabase.from("pericias").select("id", { count: "exact", head: true }),
  ]);
  const AC = (allComms ?? []) as any[];
  const AP = (allPrazos ?? []) as any[];
  const counts = {
    inbox: AC.length,
    nomeacoes: AC.filter((c) => c.category === "nomeacao").length,
    prazos: AP.length,
    pericias: perCount ?? 0,
  };
  const bell = AC.filter((c) => c.category === "nomeacao" && !c.validated).length + AP.filter((p) => p.status === "urgente").length;

  const vara = C.find((c) => c.sender)?.sender ?? PE.find((p) => p.local)?.local ?? null;

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={counts} bell={bell}>
      <ProcessoDetail refNum={ref} vara={vara} comms={C as any} prazos={P as any} pericias={PE as any} honorarios={H as any} />
    </AppShell>
  );
}
