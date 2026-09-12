import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "../../AppShell";
import LaudoClient from "./LaudoClient";
import { listarModelos, listarLaudosAnteriores } from "@/app/actions/laudo";
import "../../dashboard/dashboard.css";
import "./laudo.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  const nomes: Record<string, string> = { essential: "Essential", pro: "Pro", office: "Master" };
  return "Plano " + (nomes[c] ?? (c[0].toUpperCase() + c.slice(1)));
}

export default async function LaudoPage({ params }: { params: { periciaId: string } }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: pericia }, { data: laudoExistente }, modelos, anteriores] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
    supabase.from("organizations").select("plan_id").eq("owner_id", user.id).maybeSingle(),
    supabase.from("pericias").select("id, titulo, workflow_stage").eq("id", params.periciaId).maybeSingle(),
    supabase.from("laudos").select("id").eq("pericia_id", params.periciaId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    listarModelos(),
    listarLaudosAnteriores(),
  ]);

  if (!pericia) redirect("/jornada");

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={{ inbox: 0, nomeacoes: 0, prazos: 0, pericias: 0 }} bell={0}>
      <LaudoClient
        periciaId={params.periciaId}
        periciaTitulo={pericia.titulo}
        laudoIdInicial={laudoExistente?.id ?? null}
        modelos={modelos}
        anteriores={anteriores}
      />
    </AppShell>
  );
}
