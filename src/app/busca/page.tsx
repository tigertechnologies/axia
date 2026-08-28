import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell, { Ico } from "../AppShell";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

function planLabelFrom(planId: string | null) {
  if (!planId) return "AXIA";
  const c = planId.split("_")[0];
  return "Plano " + c[0].toUpperCase() + c.slice(1);
}
const CAT: Record<string, { label: string; tag: string }> = {
  nomeacao: { label: "Nova nomeação", tag: "t-nom" }, prazo: { label: "Prazo", tag: "t-prz" },
  intimacao: { label: "Intimação", tag: "t-int" }, honorarios: { label: "Honorários", tag: "t-hon" },
  pericia: { label: "Perícia", tag: "t-per" }, esclarecimento: { label: "Esclarecimento", tag: "t-esc" },
};

export default async function BuscaPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: prazos }, { data: pericias }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("*").order("received_at", { ascending: false }),
      supabase.from("prazos").select("status"),
      supabase.from("pericias").select("id, process_ref, titulo, local"),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const C = (comms ?? []) as any[];
  const P = (prazos ?? []) as any[];
  const PE = (pericias ?? []) as any[];
  const counts = { inbox: C.length, nomeacoes: C.filter((c) => c.category === "nomeacao").length, prazos: P.length, pericias: PE.length };
  const bell = C.filter((c) => c.category === "nomeacao" && !c.validated).length + P.filter((p) => p.status === "urgente").length;

  const ql = q.toLowerCase();
  const commHits = q ? C.filter((c) => (c.subject + " " + (c.sender ?? "") + " " + (c.process_ref ?? "") + " " + (c.snippet ?? "")).toLowerCase().includes(ql)) : [];
  const refs = new Set<string>();
  [...C, ...PE].forEach((x) => { if (x.process_ref && (String(x.process_ref).toLowerCase().includes(ql) || q === "")) refs.add(x.process_ref); });
  const processHits = q ? Array.from(refs).filter((r) => r.toLowerCase().includes(ql)) : [];

  return (
    <AppShell nome={profile?.nome ?? "Doutor(a)"} planLabel={planLabelFrom(org?.plan_id ?? null)} counts={counts} bell={bell}>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Resultados</h1>
          <p className="sum"><Ico p="inbox" s={15} />{q ? <>Busca por “<b>{q}</b>” · {commHits.length + processHits.length} resultado(s)</> : "Digite algo na busca do topo e tecle Enter."}</p>
        </div>
      </div>

      {q && processHits.length > 0 && (
        <section className="panel" style={{ marginBottom: 22 }}>
          <div className="panel-h"><h3>Processos</h3></div>
          <div className="inbox">
            {processHits.map((r) => (
              <Link className="item" key={r} href={`/processos/${encodeURIComponent(r)}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span className="cat-ic t-per"><Ico p="doc" s={18} /></span>
                <div className="body"><div className="subj">Processo {r}</div><div className="meta">Abrir visão consolidada do processo</div></div>
                <div className="act"><span className="btn-act">Abrir</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {q && commHits.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h3>Comunicações</h3></div>
          <div className="inbox">
            {commHits.map((c) => {
              const meta = CAT[c.category] ?? { label: c.category, tag: "t-esc" };
              const inner = (
                <>
                  <span className={"cat-ic " + meta.tag}><Ico p={c.category} s={18} /></span>
                  <div className="body">
                    <div className="r1"><span className={"tag " + meta.tag}>{meta.label}</span><span className="from">{c.sender}</span>{c.process_ref && <span className="from">· Proc. {c.process_ref}</span>}</div>
                    <div className="subj">{c.subject}</div>
                  </div>
                  <div className="act"><span className="btn-act">Ver</span></div>
                </>
              );
              return c.process_ref
                ? <Link className="item" key={c.id} href={`/processos/${encodeURIComponent(c.process_ref)}`} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>
                : <div className="item" key={c.id}>{inner}</div>;
            })}
          </div>
        </section>
      )}

      {q && commHits.length + processHits.length === 0 && (
        <section className="panel"><div style={{ padding: "34px 22px", color: "#6B7C93", fontSize: 14, textAlign: "center" }}>Nada encontrado para “{q}”.</div></section>
      )}
    </AppShell>
  );
}
