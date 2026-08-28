"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceHonorario } from "../actions/state";
import { createHonorario } from "../actions/create";
import Modal from "../Modal";
import { formatBRL } from "@/lib/plans";
import { Ico } from "../AppShell";

interface Honorario { id: string; process_ref: string | null; amount_cents: number; status: string }

const STAGES: { key: string; label: string }[] = [
  { key: "proposto", label: "Proposto" },
  { key: "aprovado", label: "Aprovado" },
  { key: "depositado", label: "Depositado" },
  { key: "recebido", label: "Recebido" },
];
const FILTERS = [["all", "Todos"], ...STAGES.map((s) => [s.key, s.label] as [string, string])];
const BADGE: Record<string, [string, string]> = {
  proposto: ["st-val", "Proposto"], aprovado: ["st-val", "Aprovado"],
  depositado: ["st-ok", "Depositado"], recebido: ["st-ok", "Recebido"],
};

export default function HonorariosClient({ honorarios }: { honorarios: Honorario[] }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [over, setOver] = useState<Record<string,string>>({});
  const [, startTransition] = useTransition();
  const eff = (h: Honorario) => over[h.id] ?? h.status;
  const NEXT: Record<string,string> = { proposto:"aprovado", aprovado:"depositado", depositado:"recebido" };
  function avancar(h: Honorario){ const n=NEXT[eff(h)]; if(!n) return; setOver(o=>({...o,[h.id]:n})); startTransition(()=>{ advanceHonorario(h.id, eff(h)); }); }
  const router = useRouter();
  const [novo, setNovo] = useState(false);
  const [nf, setNf] = useState({ process_ref:"", amount_reais:"", status:"proposto" });
  async function salvar(){ if(!nf.amount_reais) return "Informe o valor."; const r = await createHonorario(nf); if("error" in r) return r.error||"Erro ao salvar."; setNf({process_ref:"",amount_reais:"",status:"proposto"}); router.refresh(); return null; }

  const soma = (st: string) => honorarios.filter((h) => eff(h) === st).reduce((s, h) => s + h.amount_cents, 0);
  const receber = honorarios.filter((h) => eff(h) !== "recebido").reduce((s, h) => s + h.amount_cents, 0);
  const total = honorarios.reduce((s, h) => s + h.amount_cents, 0);

  const shown = honorarios.filter((h) => {
    const okF = filter === "all" || eff(h) === filter;
    const okQ = !q || (h.process_ref ?? "").toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Honorários</h1>
          <p className="sum"><Ico p="wallet" s={15} />{honorarios.length} lançamento(s) · <b>{formatBRL(receber)}</b> a receber</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-primary" onClick={() => setNovo(true)}><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" /></svg>Novo lançamento</button>
        </div>
      </div>

      {/* pipeline */}
      <div className="kpis" style={{ marginBottom: 22 }}>
        {STAGES.map((s) => {
          const v = soma(s.key);
          const n = honorarios.filter((h) => eff(h) === s.key).length;
          return (
            <div className="kpi" key={s.key}>
              <div className={"ki " + (s.key === "recebido" ? "ki-teal" : s.key === "depositado" ? "ki-blue" : "ki-gold")}><Ico p="wallet" s={20} /></div>
              <div className="kn" style={{ fontSize: 24 }}>{formatBRL(v)}</div>
              <div className="kl">{s.label}</div>
              <div className="kt up">{n} lançamento(s)</div>
            </div>
          );
        })}
      </div>

      <section className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
          <h3>Lançamentos</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#6B7C93" }}>Total: <b style={{ color: "#10233F", fontFamily: "'Sora',sans-serif" }}>{formatBRL(total)}</b></span>
            <div className="search" style={{ maxWidth: 260, margin: 0 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
              <input placeholder="Buscar por processo…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="filters">
          {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
        </div>
        <div className="hon-list" style={{ padding: "8px 0" }}>
          {shown.length === 0 && <div style={{ padding: "34px 22px", color: "#6B7C93", fontSize: 14, textAlign: "center" }}>Nenhum honorário nesta visão.</div>}
          {shown.map((h) => {
            const status = eff(h); const b = BADGE[status] ?? BADGE.proposto;
            return (
              <div className="hrow" key={h.id} style={{ padding: "14px 22px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="cat-ic t-hon" style={{ width: 36, height: 36 }}><Ico p="honorarios" s={16} /></span>
                  <div>
                    <div style={{ fontWeight: 600, color: "#10233F" }}>Proc. {h.process_ref}</div>
                    <span className={"st " + b[0]} style={{ marginTop: 3, display: "inline-block" }}>{b[1]}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="am" style={{ fontSize: 16 }}>{formatBRL(h.amount_cents)}</span>
                  {status !== "recebido" && <button className="btn-act solid" onClick={() => avancar(h)}>Avançar →</button>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    
      <Modal open={novo} onClose={() => setNovo(false)} title="Novo honorário" subtitle="Lance um honorário manualmente." submitLabel="Salvar lançamento" onSubmit={salvar}>
        <div className="field"><label>Processo</label><input value={nf.process_ref} onChange={(e)=>setNf({...nf,process_ref:e.target.value})} placeholder="Nº do processo" /></div>
        <div className="grid2">
          <div className="field"><label>Valor (R$)</label><input value={nf.amount_reais} onChange={(e)=>setNf({...nf,amount_reais:e.target.value})} placeholder="Ex.: 2.400,00" /></div>
          <div className="field"><label>Etapa</label><select value={nf.status} onChange={(e)=>setNf({...nf,status:e.target.value})}><option value="proposto">Proposto</option><option value="aprovado">Aprovado</option><option value="depositado">Depositado</option><option value="recebido">Recebido</option></select></div>
        </div>
      </Modal>
    </>
  );
}
