import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../AppShell";
import ProcessosClient, { type Processo } from "./ProcessosClient";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  return "Plano " + c[0].toUpperCase() + c.slice(1);
}

export default async function ProcessosPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: prazos }, { data: pericias }, { data: honorarios }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("*"),
      supabase.from("prazos").select("*"),
      supabase.from("pericias").select("*"),
      supabase.from("honorarios").select("*"),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const PE = (pericias ?? []) as any[];
  const H = (honorarios ?? []) as any[];

  // consolida por número de processo
  const map = new Map<string, Processo>();
  const get = (ref: string | null): Processo | null => {
    if (!ref) return null;
    if (!map.has(ref)) map.set(ref, { ref, comunicacoes: 0, prazos: 0, pericias: 0, honorarios_cents: 0, vara: null, lastActivity: null });
    return map.get(ref)!;
  };
  const touch = (p: Processo, when: string | null) => {
    if (when && (!p.lastActivity || when > p.lastActivity)) p.lastActivity = when;
  };
  C.forEach((c) => { const p = get(c.process_ref); if (p) { p.comunicacoes++; if (!p.vara && c.sender) p.vara = c.sender; touch(p, c.received_at); } });
  P.forEach((x) => { const p = get(x.process_ref); if (p) { p.prazos++; touch(p, x.due_date); } });
  PE.forEach((x) => { const p = get(x.process_ref); if (p) { p.pericias++; if (!p.vara && x.local) p.vara = x.local; touch(p, x.scheduled_at); } });
  H.forEach((x) => { const p = get(x.process_ref); if (p) { p.honorarios_cents += x.amount_cents; } });

  const processos = Array.from(map.values()).sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));

  const counts = {
    inbox: C.length,
    nomeacoes: C.filter((c) => c.category === "nomeacao").length,
    prazos: P.length,
    pericias: PE.length,
  };
  const bell = C.filter((c) => c.category === "nomeacao" && !c.validated).length + P.filter((p) => p.status === "urgente").length;

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={counts} bell={bell}>
      <ProcessosClient processos={processos} />
    </AppShell>
  );
}
