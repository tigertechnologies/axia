"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { criarLaudo, carregarLaudo, salvarLaudo, type ModeloItem, type LaudoItem } from "@/app/actions/laudo";
import { validarLaudo, reabrirLaudo } from "@/app/actions/laudo-fluxo";
import { salvarComoModelo } from "@/app/actions/laudo-modelo";
import { auditarLaudo, type ResultadoAuditoria } from "@/modules/laudo/domain/auditor";
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
  const [auditoria, setAuditoria] = useState<ResultadoAuditoria | null>(null);
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

  function revisar() {
    if (!conteudo) return;
    setAuditoria(auditarLaudo(conteudo));
  }

  async function validar() {
    if (!laudoId || !conteudo) return;
    const aud = auditarLaudo(conteudo);
    setAuditoria(aud);
    if (aud.totalRevisar > 0) { alert("Há itens que exigem revisão antes de validar. Veja o Auditor."); return; }
    if (!confirm("Confirmar validação do laudo? Só você, como médico, valida o conteúdo.")) return;
    const r = await validarLaudo(laudoId);
    if (r.error) { alert("Não foi possível validar."); return; }
    setStatus("validado");
  }

  async function reabrir() {
    if (!laudoId) return;
    const r = await reabrirLaudo(laudoId);
    if (!r.error) setStatus("rascunho");
  }

  async function salvarComoMeuModelo() {
    if (!laudoId) return;
    const nome = window.prompt("Nome do modelo (fica em 'Meus modelos', com os dados do caso trocados por placeholders):");
    if (!nome) return;
    const r = await salvarComoModelo({ laudoId, nome });
    alert(r.error ? "Não foi possível salvar o modelo." : "Modelo salvo em 'Meus modelos'.");
  }

  function baixarPDF() {
    if (!conteudo) return;
    const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
    const secoesHtml = conteudo.secoes.map((s) =>
      `<h2>${esc(s.titulo)}</h2><div class="txt">${esc(s.texto || "").replace(/\n/g, "<br/>")}</div>`
    ).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo || "Laudo")}</title>
      <style>
        *{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#10233F}
        body{margin:40px;line-height:1.6;max-width:760px}
        h1{font-size:22px;margin:0 0 20px}
        h2{font-size:15px;margin:20px 0 6px;border-bottom:1px solid #E4E9F0;padding-bottom:4px}
        .txt{font-size:13.5px;white-space:pre-wrap}
        .foot{margin-top:32px;color:#9AA7B8;font-size:11px;border-top:1px solid #E4E9F0;padding-top:8px}
        @media print{body{margin:20px}}
      </style></head><body>
      <h1>${esc(titulo || "Laudo pericial")}</h1>
      ${secoesHtml}
      <p class="foot">Gerado pela AXIA em ${new Date().toLocaleString("pt-BR")}${status === "validado" ? " · laudo validado pelo médico" : " · MINUTA, pendente de validação"}</p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Permita pop-ups para gerar o PDF."); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
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

      {/* Painel do Auditor (após Revisar) */}
      {auditoria && (
        <div className={"laudo-auditor nivel-" + auditoria.nivel}>
          <div className="laudo-auditor-h">
            AXIA Auditor — {auditoria.nivel === "ok" ? "✓ Nenhum problema encontrado" : auditoria.nivel === "atencao" ? "⚠ Pontos de atenção" : "⚠ Itens a revisar"}
          </div>
          {auditoria.achados.map((a, i) => (
            <div key={i} className={"laudo-achado sev-" + a.severidade}>
              <span>{a.severidade === "revisar" ? "●" : a.severidade === "atencao" ? "●" : "✓"}</span> {a.mensagem}
            </div>
          ))}
          <p className="laudo-nota">Conferência automática e objetiva. Não substitui a revisão médica nem afirma correção jurídica.</p>
        </div>
      )}

      {/* Botões do fluxo (item 8) */}
      <div className="laudo-acoes">
        {status === "validado" ? (
          <>
            <span className="laudo-validado-tag">✓ Laudo validado</span>
            <button className="laudo-btn ghost" onClick={reabrir}>Reabrir para editar</button>
            <button className="laudo-btn" onClick={baixarPDF}>Baixar PDF</button>
          </>
        ) : (
          <>
            <button className="laudo-btn" onClick={salvarAgora}>Salvar rascunho</button>
            <button className="laudo-btn ghost" onClick={revisar}>Revisar (Auditor)</button>
            <button className="laudo-btn ghost" onClick={salvarComoMeuModelo}>Salvar como meu modelo</button>
            <button className="laudo-btn" onClick={validar}>Validar laudo</button>
            <button className="laudo-btn ghost" onClick={baixarPDF}>Baixar PDF</button>
          </>
        )}
      </div>
      <p className="laudo-nota">A assinatura digital (ICP-Brasil) e o protocolo no tribunal chegam depois — dependem de certificado e credenciamento.</p>
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
