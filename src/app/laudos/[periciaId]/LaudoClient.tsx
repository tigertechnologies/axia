"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { criarLaudo, carregarLaudo, salvarLaudo, type ModeloItem, type LaudoItem } from "@/app/actions/laudo";
import type { ConteudoLaudo } from "@/modules/laudo/domain/laudoModel";

const STATUS_LABEL: Record<string, string> = { rascunho: "Rascunho", em_revisao: "Em revisão", validado: "Validado", assinado: "Assinado", protocolado: "Protocolado" };

export default function LaudoClient({
  periciaId, periciaTitulo, laudoIdInicial, modelos, anteriores,
}: {
  periciaId: string; periciaTitulo: string; laudoIdInicial: string | null;
  modelos: ModeloItem[]; anteriores: LaudoItem[];
}) {
  const router = useRouter();
  const [laudoId, setLaudoId] = useState<string | null>(laudoIdInicial);
  const [conteudo, setConteudo] = useState<ConteudoLaudo | null>(null);
  const [titulo, setTitulo] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [carregando, setCarregando] = useState(!!laudoIdInicial);
  const [salvando, setSalvando] = useState<"idle" | "salvando" | "salvo" | "erro">("idle");
  const [criando, setCriando] = useState(false);
  const [escolha, setEscolha] = useState<"modelo" | "anterior" | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega o laudo existente.
  useEffect(() => {
    if (!laudoId) return;
    setCarregando(true);
    carregarLaudo(laudoId).then((r) => {
      if (!r.error && r.conteudo) { setConteudo(r.conteudo); setTitulo(r.titulo ?? ""); setStatus(r.status ?? "rascunho"); }
      setCarregando(false);
    });
  }, [laudoId]);

  // Autosave (debounce 1,2s) — obrigatório no editor (seção 29).
  const agendarSalvar = useCallback((novo: ConteudoLaudo, novoTitulo: string) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setSalvando("salvando");
    autoSaveRef.current = setTimeout(async () => {
      if (!laudoId) return;
      const r = await salvarLaudo({ laudoId, titulo: novoTitulo, conteudo: novo });
      setSalvando(r.error ? "erro" : "salvo");
      setTimeout(() => setSalvando("idle"), 2000);
    }, 1200);
  }, [laudoId]);

  function editarSecao(i: number, texto: string) {
    if (!conteudo) return;
    const novo = { secoes: conteudo.secoes.map((s, k) => k === i ? { ...s, texto } : s) };
    setConteudo(novo); agendarSalvar(novo, titulo);
  }
  function editarTitulo(t: string) { setTitulo(t); if (conteudo) agendarSalvar(conteudo, t); }

  async function iniciar(origem: "modelo_axia" | "laudo_anterior" | "ia" | "branco", opts?: { templateId?: string; baseLaudoId?: string }) {
    setCriando(true);
    const r = await criarLaudo({ periciaId, origem, templateId: opts?.templateId ?? null, baseLaudoId: opts?.baseLaudoId ?? null });
    setCriando(false);
    if (r.error || !r.laudoId) { alert("Não foi possível iniciar o laudo."); return; }
    setLaudoId(r.laudoId);
  }

  async function salvarAgora() {
    if (!laudoId || !conteudo) return;
    setSalvando("salvando");
    const r = await salvarLaudo({ laudoId, titulo, conteudo });
    setSalvando(r.error ? "erro" : "salvo");
    setTimeout(() => setSalvando("idle"), 2000);
  }

  // ── TELA DE ESCOLHA (sem laudo ainda) ──
  if (!laudoId) {
    return (
      <div className="laudo-wrap">
        <button className="laudo-voltar" onClick={() => router.push("/jornada")}>← Voltar à Jornada</button>
        <h1 className="laudo-h1">Elaboração do Laudo</h1>
        <p className="laudo-sub">{periciaTitulo} — como você quer começar?</p>

        <div className="laudo-opts">
          <OptCard icon="📋" titulo="Usar Modelo AXIA" desc="Comece de um modelo pronto da AXIA." onClick={() => setEscolha(escolha === "modelo" ? null : "modelo")} ativo={escolha === "modelo"} />
          <OptCard icon="🗂️" titulo="Usar meus modelos" desc="Seus modelos pessoais salvos." onClick={() => setEscolha(escolha === "modelo" ? null : "modelo")} ativo={false} />
          <OptCard icon="♻️" titulo="Usar laudo anterior" desc="Reaproveite um laudo já feito como base." onClick={() => setEscolha(escolha === "anterior" ? null : "anterior")} ativo={escolha === "anterior"} />
          <OptCard icon="🤖" titulo="Gerar com IA" desc="Minuta estruturada (requer configuração de IA)." onClick={() => alert("Geração com IA ainda não configurada. Disponível quando a chave de IA for ativada.")} ativo={false} />
          <OptCard icon="📄" titulo="Criar em branco" desc="Estrutura padrão vazia para preencher." onClick={() => iniciar("branco")} ativo={false} disabled={criando} />
        </div>

        {escolha === "modelo" && (
          <div className="laudo-lista">
            <div className="laudo-lista-h">Escolha um modelo</div>
            {modelos.length === 0 && <p className="laudo-vazio">Nenhum modelo disponível ainda.</p>}
            {modelos.map((m) => (
              <button key={m.id} className="laudo-lista-item" disabled={criando} onClick={() => iniciar("modelo_axia", { templateId: m.id })}>
                <span>{m.nome} {m.escopo === "global" ? "· AXIA" : "· meu"}</span>
                {m.especialidade && <span className="laudo-tag">{m.especialidade}</span>}
              </button>
            ))}
          </div>
        )}

        {escolha === "anterior" && (
          <div className="laudo-lista">
            <div className="laudo-lista-h">Escolha um laudo para usar como base</div>
            {anteriores.length === 0 && <p className="laudo-vazio">Você ainda não tem laudos anteriores.</p>}
            {anteriores.map((l) => (
              <button key={l.id} className="laudo-lista-item" disabled={criando} onClick={() => iniciar("laudo_anterior", { baseLaudoId: l.id })}>
                <span>{l.titulo}</span>
                <span className="laudo-tag">{STATUS_LABEL[l.status] ?? l.status}</span>
              </button>
            ))}
            <p className="laudo-nota">Ao reutilizar, criamos uma cópia (o original nunca é alterado). Confira e substitua dados que forem do caso anterior.</p>
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR ──
  if (carregando || !conteudo) return <div className="laudo-wrap"><p className="laudo-vazio">Carregando laudo…</p></div>;

  return (
    <div className="laudo-wrap">
      <button className="laudo-voltar" onClick={() => router.push("/jornada")}>← Voltar à Jornada</button>
      <div className="laudo-topbar">
        <input className="laudo-titulo-input" value={titulo} onChange={(e) => editarTitulo(e.target.value)} placeholder="Título do laudo" />
        <div className="laudo-status">
          <span className={"laudo-badge st-" + status}>{STATUS_LABEL[status] ?? status}</span>
          <span className="laudo-autosave">{salvando === "salvando" ? "salvando…" : salvando === "salvo" ? "✓ salvo" : salvando === "erro" ? "erro ao salvar" : ""}</span>
        </div>
      </div>

      {status === "rascunho" && <div className="laudo-aviso">MINUTA — pendente de revisão médica. Nenhum dado é preenchido pela AXIA como fato: confira tudo.</div>}

      <div className="laudo-editor">
        {conteudo.secoes.map((s, i) => (
          <div key={i} className="laudo-secao">
            <div className="laudo-secao-tit">{s.titulo}</div>
            <textarea
              className="laudo-secao-texto"
              value={s.texto}
              onChange={(e) => editarSecao(i, e.target.value)}
              rows={Math.max(3, s.texto.split("\n").length + 1)}
              placeholder={`Escreva a seção "${s.titulo}"…`}
            />
          </div>
        ))}
      </div>

      {/* Botões do fluxo (item 8). Revisar/Validar/PDF/Assinar/Protocolar chegam nos próximos lotes. */}
      <div className="laudo-acoes">
        <button className="laudo-btn" onClick={salvarAgora}>Salvar rascunho</button>
        <button className="laudo-btn ghost" disabled title="Auditor chega no próximo lote">Revisar</button>
        <button className="laudo-btn ghost" disabled title="Validação chega no próximo lote">Validar laudo</button>
        <button className="laudo-btn ghost" disabled title="Export PDF chega no próximo lote">Baixar PDF</button>
      </div>
      <p className="laudo-nota">O Auditor (conferência de placeholders e quesitos), a validação, o PDF e o protocolo chegam nos próximos lotes.</p>
    </div>
  );
}

function OptCard({ icon, titulo, desc, onClick, ativo, disabled }: { icon: string; titulo: string; desc: string; onClick: () => void; ativo: boolean; disabled?: boolean }) {
  return (
    <button className={"laudo-opt" + (ativo ? " ativo" : "")} onClick={onClick} disabled={disabled}>
      <span className="laudo-opt-ico">{icon}</span>
      <span className="laudo-opt-tit">{titulo}</span>
      <span className="laudo-opt-desc">{desc}</span>
    </button>
  );
}
