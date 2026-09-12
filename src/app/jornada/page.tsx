import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../AppShell";
import JornadaClient from "./JornadaClient";
import "../dashboard/dashboard.css";
import "./jornada.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  const nomes: Record<string, string> = { essential: "Essential", pro: "Pro", office: "Master" };
  return "Plano " + (nomes[c] ?? (c[0].toUpperCase() + c.slice(1)));
}

export default async function JornadaPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: prazos }, { data: pericias }, { data: processos }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id, subscription_status").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("category, validated"),
      supabase.from("prazos").select("id, pericia_id, process_ref, titulo, due_date, status"),
      supabase.from("pericias").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("judicial_processes").select("id, numero_original, tribunal, comarca, vara, segredo_justica"),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const counts = {
    inbox: C.length,
    nomeacoes: C.filter((c) => c.category === "nomeacao").length,
    prazos: P.length,
    pericias: (pericias ?? []).length,
    nomeacoesAlerta: C.filter((c) => c.category === "nomeacao" && !c.validated).length,
    prazosAlerta: P.filter((p) => p.status === "urgente").length,
  };
  const bell = counts.nomeacoesAlerta + counts.prazosAlerta;

  // Mapa de processos por id (para enriquecer os cards sem N+1).
  const procMap = new Map((processos ?? []).map((p: any) => [p.id, p]));
  // Prazos por perícia (o mais próximo/urgente).
  const prazosPorPericia = new Map<string, any[]>();
  P.forEach((pz) => {
    if (!pz.pericia_id) return;
    const arr = prazosPorPericia.get(pz.pericia_id) ?? [];
    arr.push(pz); prazosPorPericia.set(pz.pericia_id, arr);
  });

  const cards = (pericias ?? []).map((pe: any) => {
    const proc = pe.processo_id ? procMap.get(pe.processo_id) : null;
    const prz = (prazosPorPericia.get(pe.id) ?? []).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    const prazoMaisProximo = prz[0] ?? null;
    return {
      id: pe.id,
      titulo: pe.titulo,
      stage: pe.workflow_stage ?? "novas_nomeacoes",
      version: pe.version ?? 1,
      local: pe.local ?? null,
      scheduled_at: pe.scheduled_at,
      process_ref: pe.process_ref ?? (proc?.numero_original ?? null),
      tribunal: proc?.tribunal ?? null,
      comarca: proc?.comarca ?? null,
      vara: proc?.vara ?? null,
      segredo: proc?.segredo_justica ?? false,
      prazo: prazoMaisProximo ? { titulo: prazoMaisProximo.titulo, due_date: prazoMaisProximo.due_date, status: prazoMaisProximo.status } : null,
    };
  });

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={counts} bell={bell}>
      <JornadaClient cards={cards} />
    </AppShell>
  );
}
