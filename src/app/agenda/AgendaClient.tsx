"use client";
import { useState, useMemo } from "react";
import Modal from "../Modal";
import { createPericia } from "../actions/create";
import { useRouter } from "next/navigation";

export interface Evento {
  kind: "pericia" | "prazo";
  date: string;
  title: string;
  sub: string;
  status: string | null;
}

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const MES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIA_ABREV = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DIAS_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

function hora(iso: string) { const d = new Date(iso); return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function diaKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

type Vista = "mes" | "semana" | "lista";

export default function AgendaClient({ eventos }: { eventos: Evento[] }) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("mes");
  const [ref, setRef] = useState(new Date());       // mês/semana de referência
  const [filtro, setFiltro] = useState<"all" | "pericia" | "prazo">("all");
  const [novo, setNovo] = useState(false);
  const [nf, setNf] = useState({ titulo: "", local: "", process_ref: "", scheduled_at: "" });

  const eventosFiltrados = useMemo(() => eventos.filter((e) => filtro === "all" || e.kind === filtro), [eventos, filtro]);

  // Agrupa eventos por dia (yyyy-mm-dd).
  const porDia = useMemo(() => {
    const m = new Map<string, Evento[]>();
    eventosFiltrados.forEach((e) => { const k = e.date.slice(0,10); (m.get(k) ?? m.set(k, []).get(k)!).push(e); });
    return m;
  }, [eventosFiltrados]);

  async function salvarPericia() {
    if (!nf.titulo || !nf.scheduled_at) return "Preencha o título e a data/hora.";
    const r = await createPericia({ ...nf, scheduled_at: new Date(nf.scheduled_at).toISOString() });
    if ("error" in r) return r.error || "Erro ao salvar.";
    setNf({ titulo: "", local: "", process_ref: "", scheduled_at: "" });
    router.refresh();
    return null;
  }

  function navegar(dir: -1 | 1) {
    const d = new Date(ref);
    if (vista === "mes") d.setMonth(d.getMonth() + dir);
    else if (vista === "semana") d.setDate(d.getDate() + dir * 7);
    setRef(d);
  }

  // Título da barra de navegação conforme a vista.
  const tituloBarra = vista === "mes" ? `${MES_FULL[ref.getMonth()]} de ${ref.getFullYear()}`
    : vista === "semana" ? `Semana de ${ref.getDate()} ${MES[ref.getMonth()]}` : "Todos os eventos";

  return (
    <>
      <div className="greet" style={{ marginBottom: 14 }}>
        <div><h1>Agenda</h1><p className="sum">Perícias, prazos e compromissos. Gerencie tudo em um calendário.</p></div>
        <div className="greet-actions"><button className="btn btn-primary" onClick={() => setNovo(true)}>+ Novo evento</button></div>
      </div>

      {/* Barra de controle: vistas + navegação + filtro */}
      <div className="ag-bar">
        <div className="ag-vistas">
          {([["mes","Mensal"],["semana","Semanal"],["lista","Lista"]] as [Vista,string][]).map(([v,l]) => (
            <button key={v} className={"ag-vista" + (vista === v ? " on" : "")} onClick={() => setVista(v)}>{l}</button>
          ))}
        </div>
        {vista !== "lista" && (
          <div className="ag-nav">
            <button onClick={() => navegar(-1)} aria-label="Anterior">‹</button>
            <span className="ag-titulo">{tituloBarra}</span>
            <button onClick={() => navegar(1)} aria-label="Próximo">›</button>
            <button className="ag-hoje" onClick={() => setRef(new Date())}>Hoje</button>
          </div>
        )}
        <div className="ag-filtros">
          {([["all","Tudo"],["pericia","Perícias"],["prazo","Prazos"]] as ["all"|"pericia"|"prazo",string][]).map(([f,l]) => (
            <button key={f} className={"tsk-tab" + (filtro === f ? " on" : "")} onClick={() => setFiltro(f)}>{l}</button>
          ))}
        </div>
      </div>

      {vista === "mes" && <VistaMes ref_={ref} porDia={porDia} />}
      {vista === "semana" && <VistaSemana ref_={ref} porDia={porDia} />}
      {vista === "lista" && <VistaLista eventos={eventosFiltrados} />}

      <Modal open={novo} onClose={() => setNovo(false)} title="Novo evento" subtitle="Agende uma perícia." submitLabel="Salvar" onSubmit={salvarPericia}>
        <div className="field"><label>Título</label><input value={nf.titulo} onChange={(e) => setNf({ ...nf, titulo: e.target.value })} placeholder="Ex.: Perícia médica" /></div>
        <div className="field"><label>Data e hora</label><input type="datetime-local" value={nf.scheduled_at} onChange={(e) => setNf({ ...nf, scheduled_at: e.target.value })} /></div>
        <div className="field"><label>Local</label><input value={nf.local} onChange={(e) => setNf({ ...nf, local: e.target.value })} placeholder="Ex.: Vara do Trabalho" /></div>
        <div className="field"><label>Processo</label><input value={nf.process_ref} onChange={(e) => setNf({ ...nf, process_ref: e.target.value })} placeholder="Nº do processo" /></div>
      </Modal>
    </>
  );
}

// ── Vista MENSAL (grade) ──
function VistaMes({ ref_, porDia }: { ref_: Date; porDia: Map<string, Evento[]> }) {
  const ano = ref_.getFullYear(), mes = ref_.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const inicioGrade = new Date(primeiro);
  inicioGrade.setDate(1 - primeiro.getDay());       // começa no domingo da semana do dia 1
  const hoje = diaKey(new Date());
  const celulas: Date[] = [];
  for (let i = 0; i < 42; i++) { const d = new Date(inicioGrade); d.setDate(inicioGrade.getDate() + i); celulas.push(d); }

  return (
    <div className="ag-mes">
      <div className="ag-mes-head">{DIA_ABREV.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="ag-mes-grid">
        {celulas.map((d, i) => {
          const k = diaKey(d);
          const evs = porDia.get(k) ?? [];
          const foraMes = d.getMonth() !== mes;
          return (
            <div key={i} className={"ag-cel" + (foraMes ? " fora" : "") + (k === hoje ? " hoje" : "")}>
              <div className="ag-cel-num">{d.getDate()}</div>
              <div className="ag-cel-evs">
                {evs.slice(0, 3).map((e, j) => (
                  <div key={j} className={"ag-ev " + (e.kind === "prazo" ? "ev-prazo" : "ev-pericia")} title={e.title}>
                    <span className="ag-ev-h">{hora(e.date)}</span> {e.title}
                  </div>
                ))}
                {evs.length > 3 && <div className="ag-ev-mais">+{evs.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista SEMANAL ──
function VistaSemana({ ref_, porDia }: { ref_: Date; porDia: Map<string, Evento[]> }) {
  const inicio = new Date(ref_); inicio.setDate(ref_.getDate() - ref_.getDay());
  const hoje = diaKey(new Date());
  const dias: Date[] = [];
  for (let i = 0; i < 7; i++) { const d = new Date(inicio); d.setDate(inicio.getDate() + i); dias.push(d); }
  return (
    <div className="ag-semana">
      {dias.map((d, i) => {
        const k = diaKey(d);
        const evs = (porDia.get(k) ?? []).sort((a,b) => a.date.localeCompare(b.date));
        return (
          <div key={i} className={"ag-sem-col" + (k === hoje ? " hoje" : "")}>
            <div className="ag-sem-head"><b>{DIA_ABREV[d.getDay()]}</b> {d.getDate()}</div>
            <div className="ag-sem-body">
              {evs.length === 0 && <div className="ag-sem-vazio">—</div>}
              {evs.map((e, j) => (
                <div key={j} className={"ag-sem-ev " + (e.kind === "prazo" ? "ev-prazo" : "ev-pericia")}>
                  <div className="ag-sem-ev-h">{hora(e.date)}</div>
                  <div>{e.title}</div>
                  {e.sub && <div className="ag-sem-ev-sub">{e.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Vista LISTA ──
function VistaLista({ eventos }: { eventos: Evento[] }) {
  const ordenados = [...eventos].sort((a,b) => a.date.localeCompare(b.date));
  const futuros = ordenados.filter((e) => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));
  const lista = futuros.length ? futuros : ordenados;
  return (
    <div className="ag-lista">
      {lista.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum evento.</p>}
      {lista.map((e, i) => {
        const d = new Date(e.date);
        return (
          <div key={i} className="ag-lista-item">
            <div className="ag-lista-data">
              <div className="ag-lista-dia">{String(d.getDate()).padStart(2,"0")}</div>
              <div className="ag-lista-mes">{MES[d.getMonth()]}</div>
            </div>
            <div className={"ag-lista-barra " + (e.kind === "prazo" ? "ev-prazo" : "ev-pericia")} />
            <div className="ag-lista-corpo">
              <div className="ag-lista-tit">{e.title}</div>
              <div className="ag-lista-sub">{DIAS_FULL[d.getDay()]} · {hora(e.date)}{e.sub ? " · " + e.sub : ""}</div>
            </div>
            <span className={"ag-lista-tag " + (e.kind === "prazo" ? "t-prazo" : "t-pericia")}>{e.kind === "prazo" ? "Prazo" : "Perícia"}</span>
          </div>
        );
      })}
    </div>
  );
}
