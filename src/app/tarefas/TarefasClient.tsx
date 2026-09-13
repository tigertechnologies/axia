"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarTarefa, concluirTarefa, excluirTarefa, type Tarefa } from "@/app/actions/tarefas";

const PRIO_LABEL: Record<string, string> = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" };
const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataBR(iso: string | null) { if (!iso) return null; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }

export default function TarefasClient({ tarefasIniciais }: { tarefasIniciais: Tarefa[] }) {
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>(tarefasIniciais);
  const [novo, setNovo] = useState({ titulo: "", prioridade: "normal", due_at: "" });
  const [filtro, setFiltro] = useState<"abertas" | "todas" | "concluidas">("abertas");
  const [, startT] = useTransition();

  const mostradas = tarefas.filter((t) => {
    if (filtro === "abertas") return t.status !== "concluida";
    if (filtro === "concluidas") return t.status === "concluida";
    return true;
  });
  const abertas = tarefas.filter((t) => t.status !== "concluida").length;

  async function adicionar() {
    if (!novo.titulo.trim()) return;
    const r = await criarTarefa({ titulo: novo.titulo, prioridade: novo.prioridade, due_at: novo.due_at || null });
    if (r && "error" in r) return;
    setNovo({ titulo: "", prioridade: "normal", due_at: "" });
    router.refresh();
  }
  async function toggle(t: Tarefa) {
    const nova = t.status === "concluida" ? "pendente" : "concluida";
    setTarefas((ts) => ts.map((x) => x.id === t.id ? { ...x, status: nova } : x));
    await concluirTarefa(t.id, nova === "concluida");
  }
  async function remover(id: string) {
    setTarefas((ts) => ts.filter((t) => t.id !== id));
    await excluirTarefa(id);
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Tarefas</h1><p className="sum">{abertas} tarefa(s) aberta(s). Organize seus afazeres, soltos ou ligados a uma perícia.</p></div>
      </div>

      {/* Adicionar */}
      <div className="tsk-add">
        <input className="tsk-input" placeholder="Nova tarefa…" value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") startT(adicionar); }} />
        <select className="tsk-sel" value={novo.prioridade} onChange={(e) => setNovo({ ...novo, prioridade: e.target.value })}>
          {Object.entries(PRIO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" className="tsk-sel" value={novo.due_at} onChange={(e) => setNovo({ ...novo, due_at: e.target.value })} />
        <button className="tsk-btn" onClick={() => startT(adicionar)}>+ Adicionar</button>
      </div>

      {/* Filtros */}
      <div className="tsk-tabs">
        {([["abertas","Abertas"],["concluidas","Concluídas"],["todas","Todas"]] as [typeof filtro,string][]).map(([id,l]) => (
          <button key={id} className={"tsk-tab" + (filtro === id ? " on" : "")} onClick={() => setFiltro(id)}>{l}</button>
        ))}
      </div>

      {/* Lista */}
      <div className="tsk-lista">
        {mostradas.length === 0 && <p className="tsk-vazio">Nenhuma tarefa {filtro === "concluidas" ? "concluída" : filtro === "abertas" ? "aberta" : ""}.</p>}
        {mostradas.map((t) => (
          <div key={t.id} className={"tsk-item" + (t.status === "concluida" ? " done" : "")}>
            <button className="tsk-check" onClick={() => startT(() => toggle(t))} aria-label="Concluir">{t.status === "concluida" ? "✓" : ""}</button>
            <div className="tsk-corpo">
              <div className="tsk-titulo">{t.titulo}</div>
              <div className="tsk-meta">
                <span className={"tsk-prio p-" + t.prioridade}>{PRIO_LABEL[t.prioridade]}</span>
                {t.due_at && <span className="tsk-due">📅 {dataBR(t.due_at)}</span>}
                {t.pericia_titulo && <span className="tsk-per">🩺 {t.pericia_titulo}</span>}
              </div>
            </div>
            <button className="tsk-x" onClick={() => startT(() => remover(t.id))} aria-label="Excluir">×</button>
          </div>
        ))}
      </div>
    </>
  );
}
