"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProcesso } from "../actions/create";
import Modal from "../Modal";
import { formatBRL } from "@/lib/plans";
import { Ico } from "../AppShell";

export interface Processo {
  ref: string;
  comunicacoes: number;
  prazos: number;
  pericias: number;
  honorarios_cents: number;
  vara: string | null;
  lastActivity: string | null;
}

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function quando(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MES[d.getMonth()]}`;
}

export default function ProcessosClient({ processos }: { processos: Processo[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const [novo, setNovo] = useState(false);
  const [nf, setNf] = useState({ process_ref:"", vara:"", subject:"" });
  async function salvar(){ if(!nf.process_ref) return "Informe o número do processo."; const r = await createProcesso(nf); if("error" in r) return r.error||"Erro ao salvar."; setNf({process_ref:"",vara:"",subject:""}); router.refresh(); return null; }
  const shown = processos.filter((p) => !q || (p.ref + " " + (p.vara ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Processos</h1>
          <p className="sum"><Ico p="doc" s={15} />{processos.length} processo(s) acompanhado(s)</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-primary" onClick={() => setNovo(true)}><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" /></svg>Novo processo</button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
          <h3>Seus processos</h3>
          <div className="search" style={{ maxWidth: 320, margin: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
            <input placeholder="Buscar por número ou vara…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="inbox">
          {shown.length === 0 && <div style={{ padding: "34px 22px", color: "#6B7C93", fontSize: 14, textAlign: "center" }}>Nenhum processo encontrado.</div>}
          {shown.map((p) => (
            <div className="item" key={p.ref} style={{ alignItems: "center" }}>
              <span className="cat-ic t-per"><Ico p="doc" s={18} /></span>
              <div className="body">
                <div className="r1"><span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, color: "#10233F", fontSize: 15 }}>Proc. {p.ref}</span>{p.vara && <span className="from">· {p.vara}</span>}</div>
                <div className="meta" style={{ marginTop: 5, display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span>📨 {p.comunicacoes} comunicação(ões)</span>
                  <span>⏱ {p.prazos} prazo(s)</span>
                  <span>🗓 {p.pericias} perícia(s)</span>
                  {p.honorarios_cents > 0 && <span>💰 {formatBRL(p.honorarios_cents)}</span>}
                  <span>· últ. atividade {quando(p.lastActivity)}</span>
                </div>
              </div>
              <div className="act"><Link className="btn-act" href={`/processos/${encodeURIComponent(p.ref)}`}>Abrir</Link></div>
            </div>
          ))}
        </div>
      </section>
    
      <Modal open={novo} onClose={() => setNovo(false)} title="Novo processo" subtitle="Cadastre um processo manualmente." submitLabel="Salvar processo" onSubmit={salvar}>
        <div className="field"><label>Número do processo</label><input value={nf.process_ref} onChange={(e)=>setNf({...nf,process_ref:e.target.value})} placeholder="Ex.: 1002345-67.2025" /></div>
        <div className="field"><label>Vara / origem</label><input value={nf.vara} onChange={(e)=>setNf({...nf,vara:e.target.value})} placeholder="Ex.: TJSP · 2ª Vara Cível" /></div>
        <div className="field"><label>Descrição (opcional)</label><input value={nf.subject} onChange={(e)=>setNf({...nf,subject:e.target.value})} placeholder="Ex.: Nomeação para perícia médica" /></div>
      </Modal>
    </>
  );
}
