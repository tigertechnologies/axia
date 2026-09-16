"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarTarefa, moverTarefa, excluirTarefa, type Tarefa } from "@/app/actions/tarefas";

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataBR(iso: string | null) { if (!iso) return null; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }

// As 4 colunas do Kanban (como o concorrente).
const COLUNAS: { id: string; label: string }[] = [
  { id: "pendente", label: "A Fazer" },
  { id: "em_andamento", label: "Em Andamento" },
  { id: "revisao", label: "Revisão" },
  { id: "concluida", label: "Concluído" },
];
const ORDEM = COLUNAS.map((c) => c.id);

export default function TarefasClient({ tarefasIniciais }: { tarefasIniciais: Tarefa[] }) {
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>(tarefasIniciais);
  const [novo, setNovo] = useState({ titulo: "", prioridade: "normal" });
  const [, startT] = useTransition();

  async function adicionar() {
    if (!novo.titulo.trim()) return;
    const r = await criarTarefa({ titulo: novo.titulo, prioridade: novo.prioridade });
    if (r && "error" in r) return;
    setNovo({ titulo: "", prioridade: "normal" });
    router.refresh();
  }
  async function mover(t: Tarefa, dir: 1 | -1) {
    const i = ORDEM.indexOf(t.status === "concluida" ? "concluida" : t.status);
    const alvo = ORDEM[Math.max(0, Math.min(ORDEM.length - 1, i + dir))];
    if (alvo === t.status) return;
    setTarefas((ts) => ts.map((x) => x.id === t.id ? { ...x, status: alvo } : x));
    await moverTarefa(t.id, alvo);
  }
  async function remover(id: string) {
    setTarefas((ts) => ts.filter((t) => t.id !== id));
    await excluirTarefa(id);
  }

  const porColuna = (col: string) => tarefas.filter((t) => (t.status === col) || (col === "pendente" && !ORDEM.includes(t.status)));

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Tarefas</h1><p className="sum">Kanban por processo. Organize vistorias, laudos e entregas com prioridade e prazo.</p></div>
      </div>

      {/* Adicionar rápido */}
      <div className="tsk-add" style={{ marginBottom: 18 }}>
        <input className="tsk-input" placeholder="Nova tarefa…" value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") startT(adicionar); }} />
        <select className="tsk-sel" value={novo.prioridade} onChange={(e) => setNovo({ ...novo, prioridade: e.target.value })}>
          <option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
        </select>
        <button className="tsk-btn" onClick={() => startT(adicionar)}>+ Adicionar</button>
      </div>

      {/* Kanban */}
      <div className="kanban">
        {COLUNAS.map((col) => {
          const itens = porColuna(col.id);
          return (
            <div key={col.id} className="kb-col">
              <div className="kb-col-head"><span>{col.label}</span><span className="kb-count">{itens.length}</span></div>
              <div className="kb-col-body">
                {itens.length === 0 && <div className="kb-empty">—</div>}
                {itens.map((t) => {
                  const i = ORDEM.indexOf(t.status === "concluida" ? "concluida" : (ORDEM.includes(t.status) ? t.status : "pendente"));
                  return (
                    <div key={t.id} className="kb-card">
                      <div className="kb-card-top">
                        {t.prioridade === "urgente" && <span className="kb-fatal">⚠ FATAL</span>}
                        {t.prioridade === "alta" && <span className="kb-alta">ALTA</span>}
                        <button className="kb-x" onClick={() => startT(() => remover(t.id))} aria-label="Excluir">×</button>
                      </div>
                      <div className="kb-card-tit">{t.titulo}</div>
                      <div className="kb-card-meta">
                        {t.due_at && <span>📅 {dataBR(t.due_at)}</span>}
                        {t.pericia_titulo && <span>🩺 {t.pericia_titulo}</span>}
                      </div>
                      <div className="kb-card-move">
                        <button disabled={i === 0} onClick={() => startT(() => mover(t, -1))} aria-label="Voltar">◄</button>
                        <button disabled={i === ORDEM.length - 1} onClick={() => startT(() => mover(t, 1))} aria-label="Avançar">►</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
