import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../AppShell";
import AgendaClient, { type Evento } from "./AgendaClient";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  return "Plano " + c[0].toUpperCase() + c.slice(1);
}

export default async function AgendaPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: prazos }, { data: pericias }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("category, validated"),
      supabase.from("prazos").select("*").order("due_date", { ascending: true }),
      supabase.from("pericias").select("*").order("scheduled_at", { ascending: true }),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const PE = (pericias ?? []) as any[];

  const eventos: Evento[] = [
    ...PE.map((p): Evento => ({ kind: "pericia", date: p.scheduled_at, title: p.titulo, sub: `${p.local ?? ""} · Proc. ${p.process_ref}`, status: null })),
    ...P.map((x): Evento => ({ kind: "prazo", date: x.due_date + "T00:00:00", title: x.titulo, sub: `Proc. ${x.process_ref}`, status: x.status })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const counts = {
    inbox: C.length,
    nomeacoes: C.filter((c) => c.category === "nomeacao").length,
    prazos: P.length,
    pericias: PE.length,
  };
  const bell = C.filter((c) => c.category === "nomeacao" && !c.validated).length + P.filter((p) => p.status === "urgente").length;

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={counts} bell={bell}>
      <AgendaClient eventos={eventos} />
    </AppShell>
  );
}
