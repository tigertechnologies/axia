import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../AppShell";
import DashboardContent from "./DashboardContent";
import "./dashboard.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  return "Plano " + c[0].toUpperCase() + c.slice(1);
}

export default async function DashboardPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: pericias }, { data: prazos }, { data: honorarios }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id, subscription_status").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("*").order("received_at", { ascending: false }),
      supabase.from("pericias").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("prazos").select("*").order("due_date", { ascending: true }),
      supabase.from("honorarios").select("*"),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const counts = {
    inbox: C.length,
    nomeacoes: C.filter((c) => c.category === "nomeacao").length,
    prazos: P.length,
    pericias: (pericias ?? []).length,
  };
  const aguardando = C.filter((c) => c.category === "nomeacao" && !c.validated).length;
  const urgentes = P.filter((p) => p.status === "urgente").length;

  return (
    <AppShell
      nome={profile?.nome ?? "Doutor(a)"}
      planLabel={planLabelFrom(org?.plan_id ?? null)}
      counts={counts}
      bell={aguardando + urgentes}
    >
      <DashboardContent
        nome={profile?.nome ?? "Doutor(a)"}
        pastDue={org?.subscription_status === "past_due"}
        comms={C as any}
        pericias={(pericias ?? []) as any}
        prazos={P as any}
        honorarios={(honorarios ?? []) as any}
      />
    </AppShell>
  );
}
