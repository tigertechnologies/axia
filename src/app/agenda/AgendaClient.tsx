"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ico } from "../AppShell";
import Modal from "../Modal";
import { createPericia } from "../actions/create";

export interface Evento {
  kind: "pericia" | "prazo";
  date: string;
  title: string;
  sub: string;
  status: string | null;
}

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const FILTERS = [["all", "Tudo"], ["pericia", "Perícias"], ["prazo", "Prazos"]];

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    dayKey: iso.slice(0, 10),
    d: String(d.getDate()).padStart(2, "0"),
    m: MES[d.getMonth()],
    dia: DIAS[d.getDay()],
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function AgendaClient({ eventos }: { eventos: Evento[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [novo, setNovo] = useState(false);
  const [nf, setNf] = useState({ titulo: "", local: "", process_ref: "", scheduled_at: "" });

  async function salvar() {
    if (!nf.titulo || !nf.scheduled_at) return "Preencha o título e a data/hora.";
    const r = await createPericia({ ...nf, scheduled_at: new Date(nf.scheduled_at).toISOString() });
    if ("error" in r) return r.error || "Erro ao salvar.";
    setNf({ titulo: "", local: "", process_ref: "", scheduled_at: "" });
    router.refresh();
    return null;
  }

  const shown = eventos.filter((e) => filter === "all" || e.kind === filter);

  // agrupa por dia
  const grupos: { dayKey: string; label: string; itens: Evento[] }[] = [];
  shown.forEach((e) => {
    const f = fmt(e.date);
    let g = grupos.find((x) => x.dayKey === f.dayKey);
    if (!g) { g = { dayKey: f.dayKey, label: `${f.dia}, ${parseInt(f.d)} de ${f.m}`, itens: [] }; grupos.push(g); }
    g.itens.push(e);
  });

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Agenda</h1>
          <p className="sum"><Ico p="agenda" s={15} />{eventos.length} compromisso(s) na sua linha do tempo</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-primary" onClick={() => setNovo(true)}><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" /></svg>Nova perícia</button>
        </div>
      </div>

      <div className="filters" style={{ border: 0, padding: "0 0 16px" }}>
        {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
      </div>

      {grupos.length === 0 && <section className="panel"><div style={{ padding: "34px 22px", color:"var(--muted)", fontSize: 14, textAlign: "center" }}>Nenhum compromisso nesta visão.</div></section>}

      {grupos.map((g) => (
        <div key={g.dayKey} style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, color:"var(--ink)", fontSize: 14, textTransform: "capitalize", marginBottom: 10, paddingLeft: 4 }}>{g.label}</div>
          <section className="panel">
            <div className="mini" style={{ padding: "6px 0" }}>
              {g.itens.map((e, i) => {
                const f = fmt(e.date);
                const isPericia = e.kind === "pericia";
                const st = e.status === "urgente" ? ["st-urg", "Urgente"] : e.status === "confirmado" ? ["st-ok", "Confirmado"] : e.status ? ["st-val", "A validar"] : null;
                return (
                  <div className="row" key={i} style={{ padding: "14px 22px" }}>
                    <span className={"cat-ic " + (isPericia ? "t-per" : "t-prz")} style={{ width: 40, height: 40 }}><Ico p={isPericia ? "cal" : "clock"} s={18} /></span>
                    <div className="info">
                      <div className="t">{e.title}{isPericia && <span style={{ fontWeight: 400, color:"var(--muted)" }}> · {f.hora}</span>}</div>
                      <div className="s">{isPericia ? "Perícia" : "Prazo"} · {e.sub}</div>
                    </div>
                    {st && <span className={"st " + st[0]}>{st[1]}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ))}

      <Modal open={novo} onClose={() => setNovo(false)} title="Nova perícia" subtitle="Agende uma perícia manualmente." submitLabel="Salvar perícia" onSubmit={salvar}>
        <div className="field"><label>Título</label><input value={nf.titulo} onChange={(e) => setNf({ ...nf, titulo: e.target.value })} placeholder="Ex.: Perícia médica" /></div>
        <div className="field"><label>Data e hora</label><input type="datetime-local" value={nf.scheduled_at} onChange={(e) => setNf({ ...nf, scheduled_at: e.target.value })} /></div>
        <div className="field"><label>Local / vara</label><input value={nf.local} onChange={(e) => setNf({ ...nf, local: e.target.value })} placeholder="Ex.: Vara do Trabalho" /></div>
        <div className="field"><label>Processo</label><input value={nf.process_ref} onChange={(e) => setNf({ ...nf, process_ref: e.target.value })} placeholder="Nº do processo" /></div>
      </Modal>
    </>
  );
}
