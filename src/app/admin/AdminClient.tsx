"use client";
import { useState, useRef, useTransition } from "react";
import { PLANS, formatBRL, planCode } from "@/lib/plans";
import {
  adminSetSubscriptionStatus,
  type Assinante, type Metricas, type AuditEvent, type Snapshot,
} from "../actions/admin";
import { adminUpdateLead, adminImportLeads, type Lead } from "../actions/leads";
import { LEAD_STATUS } from "../actions/leads-const";
import {
  adminReprocessWebhook, adminReprocessarPendentes,
  type WebhookEvent, type WebhooksResumo, type IngestaoResumo, type IngestionError,
} from "../actions/system";
import Toast from "../Toast";

export interface SistemaData {
  webhooks: WebhookEvent[]; whResumo: WebhooksResumo; ingestao: IngestaoResumo;
  ingErros: IngestionError[]; config: Record<string, boolean>;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa", trialing: "Teste", past_due: "Pgto pendente", unpaid: "Não paga",
  canceled: "Cancelada", suspended: "Suspensa", expired: "Expirada", pending_subscription: "Sem assinatura",
};
const STATUS_OPCOES = ["active", "trialing", "past_due", "canceled", "suspended", "expired", "pending_subscription"];
const LEAD_LABEL: Record<string, string> = { novo: "Novo", contatado: "Contatado", qualificado: "Qualificado", convertido: "Convertido", descartado: "Descartado" };
const SOURCE_LABEL: Record<string, string> = { form: "Formulário", signup_incomplete: "Cadastro incompleto", import: "Importação" };
const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function quando(iso: string | null) { if (!iso) return "—"; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }
function quandoHora(iso: string) { const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function planoNome(planId: string | null) { const c = planCode(planId); return c === "office" ? "Master" : c[0].toUpperCase() + c.slice(1); }
function mensal(planId: string | null): number { const p = PLANS[planId ?? ""]; if (!p) return 0; return p.interval === "year" ? Math.round(p.amount / 12) : p.amount; }

function descreveAcao(e: AuditEvent): string {
  if (e.action === "set_subscription_status") {
    const de = (e.detail?.de as string) ?? null, para = (e.detail?.para as string) ?? null;
    return `Status de assinatura: ${de ? (STATUS_LABEL[de] ?? de) : "—"} → ${para ? (STATUS_LABEL[para] ?? para) : "—"}`;
  }
  if (e.action === "lead_status") {
    const de = (e.detail?.de as string) ?? null, para = (e.detail?.para as string) ?? null;
    return `Lead: ${de ? (LEAD_LABEL[de] ?? de) : "—"} → ${para ? (LEAD_LABEL[para] ?? para) : "—"}`;
  }
  if (e.action === "leads_import") return `Importou ${(e.detail?.quantidade as number) ?? "?"} leads`;
  return e.action;
}

type Aba = "visao" | "assinantes" | "leads" | "sistema" | "auditoria";

export default function AdminClient({
  assinantes, webhooksPendentes, erro, metricas, auditoria, historico, leads, sistema,
}: {
  assinantes: Assinante[]; webhooksPendentes: number; erro?: string;
  metricas: Metricas | null; auditoria: AuditEvent[]; historico: Snapshot[]; leads: Lead[];
  sistema: SistemaData;
}) {
  const [aba, setAba] = useState<Aba>("visao");
  const [q, setQ] = useState("");
  const [over, setOver] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [, startT] = useTransition();
  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 3500); }

  const eff = (a: Assinante) => over[a.org_id] ?? a.subscription_status ?? "pending_subscription";
  const ativos = assinantes.filter((a) => ["active", "trialing", "past_due"].includes(eff(a)));
  const porPlano = { essential: 0, pro: 0, office: 0 } as Record<string, number>;
  ativos.forEach((a) => { porPlano[planCode(a.plan_id)]++; });
  const receita = ativos.reduce((s, a) => s + mensal(a.plan_id), 0);
  const shown = assinantes.filter((a) => !q || (a.nome + " " + a.email + " " + (a.plan_id ?? "")).toLowerCase().includes(q.toLowerCase()));

  async function mudarStatus(a: Assinante, status: string) {
    const anterior = eff(a);
    setOver((o) => ({ ...o, [a.org_id]: status }));
    const r = await adminSetSubscriptionStatus(a.org_id, status);
    if (r && "error" in r) { setOver((o) => ({ ...o, [a.org_id]: anterior })); flash("Não foi possível alterar. Tente novamente."); }
    else flash("Status atualizado.");
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 18 }}>
        <div><h1>Administração</h1><p className="sum">Centro de controle da AXIA. Sem acesso ao conteúdo das comunicações.</p></div>
      </div>
      {erro && <div className="err">{erro}</div>}

      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid #E6EBF2", flexWrap: "wrap" }}>
        <Tab id="visao" atual={aba} set={setAba}>Visão geral</Tab>
        <Tab id="assinantes" atual={aba} set={setAba}>Assinantes</Tab>
        <Tab id="leads" atual={aba} set={setAba}>Leads{leads.length ? ` · ${leads.length}` : ""}</Tab>
        <Tab id="sistema" atual={aba} set={setAba}>Sistema{sistema.whResumo.pendentes ? ` · ${sistema.whResumo.pendentes}` : ""}</Tab>
        <Tab id="auditoria" atual={aba} set={setAba}>Auditoria</Tab>
      </div>

      {aba === "visao" && (
        <Visao total={assinantes.length} ativosLen={ativos.length} receita={receita}
          porPlano={porPlano} webhooksPendentes={webhooksPendentes} metricas={metricas} historico={historico} />
      )}

      {aba === "assinantes" && (
        <section className="panel">
          <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
            <h3>Assinantes</h3>
            <div className="search" style={{ maxWidth: 320, margin: 0 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
              <input placeholder="Buscar por nome, e-mail ou plano…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
                <th style={{ padding: "12px 16px" }}>Assinante</th><th style={{ padding: "12px 16px" }}>Plano</th>
                <th style={{ padding: "12px 16px" }}>Situação</th><th style={{ padding: "12px 16px" }}>Atividade</th><th style={{ padding: "12px 16px" }}>Suporte</th>
              </tr></thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={5} style={{ padding: "28px 16px", textAlign: "center", color: "#6B7C93" }}>Nenhum assinante.</td></tr>}
                {shown.map((a) => (
                  <tr key={a.org_id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                    <td style={{ padding: "12px 16px" }}><div style={{ fontWeight: 600, color: "#10233F" }}>{a.nome.trim() || "—"}</div><div style={{ color: "#6B7C93" }}>{a.email}</div></td>
                    <td style={{ padding: "12px 16px" }}>{planoNome(a.plan_id)}</td>
                    <td style={{ padding: "12px 16px" }}><span className={"st " + (["active","trialing"].includes(eff(a)) ? "st-ok" : eff(a) === "past_due" ? "st-val" : "st-urg")}>{STATUS_LABEL[eff(a)] ?? eff(a)}</span></td>
                    <td style={{ padding: "12px 16px" }}><div>{a.total_comunicacoes} com.</div><div style={{ color: "#6B7C93" }}>últ. {quando(a.ultima_atividade)}</div></td>
                    <td style={{ padding: "12px 16px" }}>
                      <select value={eff(a)} onChange={(e) => startT(() => mudarStatus(a, e.target.value))} style={{ padding: "6px 8px", border: "1px solid #E4E9F0", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 12.5 }}>
                        {STATUS_OPCOES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>Este painel mostra apenas metadados. O conteúdo das comunicações não é acessível por aqui, em conformidade com a LGPD.</p>
        </section>
      )}

      {aba === "leads" && <LeadsPanel leads={leads} flash={flash} />}

      {aba === "sistema" && <SistemaPanel data={sistema} flash={flash} />}

      {aba === "auditoria" && (
        <section className="panel">
          <div className="panel-h"><h3>Auditoria</h3></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
                <th style={{ padding: "12px 16px" }}>Quando</th><th style={{ padding: "12px 16px" }}>Admin</th><th style={{ padding: "12px 16px" }}>Ação</th><th style={{ padding: "12px 16px" }}>Alvo</th>
              </tr></thead>
              <tbody>
                {auditoria.length === 0 && <tr><td colSpan={4} style={{ padding: "28px 16px", textAlign: "center", color: "#6B7C93" }}>Nenhuma ação registrada ainda.</td></tr>}
                {auditoria.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                    <td style={{ padding: "12px 16px", color: "#6B7C93", whiteSpace: "nowrap" }}>{quandoHora(e.created_at)}</td>
                    <td style={{ padding: "12px 16px" }}>{e.actor_email ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#10233F" }}>{descreveAcao(e)}</td>
                    <td style={{ padding: "12px 16px", color: "#6B7C93" }}>{e.target_email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Toast msg={toast} />
    </>
  );
}

function Tab({ id, atual, set, children }: { id: Aba; atual: Aba; set: (a: Aba) => void; children: React.ReactNode }) {
  const on = atual === id;
  return (
    <button onClick={() => set(id)} style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: on ? 700 : 500, color: on ? "#16305B" : "#6B7C93", borderBottom: on ? "2px solid #1FA89E" : "2px solid transparent", marginBottom: -1 }}>{children}</button>
  );
}

// ── LEADS ───────────────────────────────────────────────────
function parseCSV(text: string): { nome?: string; email: string; telefone?: string }[] {
  const linhas = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return [];
  const delim = (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = linhas[0].toLowerCase();
  const temHeader = head.includes("email") || head.includes("e-mail");
  let idxNome = 0, idxEmail = 1, idxTel = 2;
  if (temHeader) {
    const cols = linhas[0].split(delim).map((c) => c.trim().toLowerCase());
    idxNome = cols.findIndex((c) => c.includes("nome"));
    idxEmail = cols.findIndex((c) => c.includes("mail"));
    idxTel = cols.findIndex((c) => c.includes("tel") || c.includes("fone"));
  }
  const body = temHeader ? linhas.slice(1) : linhas;
  return body.map((l) => {
    const c = l.split(delim).map((x) => x.trim().replace(/^"|"$/g, ""));
    return { nome: idxNome >= 0 ? c[idxNome] : undefined, email: (idxEmail >= 0 ? c[idxEmail] : c[0]) ?? "", telefone: idxTel >= 0 ? c[idxTel] : undefined };
  }).filter((r) => r.email);
}

function LeadsPanel({ leads, flash }: { leads: Lead[]; flash: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [over, setOver] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [importando, setImportando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, startT] = useTransition();

  const st = (l: Lead) => over[l.id] ?? l.status;
  const filtrados = leads.filter((l) => (filtro === "todos" || st(l) === filtro) && (!q || (`${l.nome ?? ""} ${l.email} ${l.telefone ?? ""}`).toLowerCase().includes(q.toLowerCase())));
  const contagem = LEAD_STATUS.reduce((acc, s) => { acc[s] = leads.filter((l) => st(l) === s).length; return acc; }, {} as Record<string, number>);

  async function mudarStatus(l: Lead, status: string) {
    const anterior = st(l);
    setOver((o) => ({ ...o, [l.id]: status }));
    const r = await adminUpdateLead(l.id, { status });
    if ("error" in r) { setOver((o) => ({ ...o, [l.id]: anterior })); flash("Falha ao atualizar o lead."); }
    else flash("Lead atualizado.");
  }
  async function salvarNota(l: Lead) {
    const valor = notas[l.id]; if (valor === undefined) return;
    const r = await adminUpdateLead(l.id, { notes: valor });
    flash("error" in r ? "Falha ao salvar a nota." : "Nota salva.");
  }

  function exportarCSV() {
    const linhas = [["nome", "email", "telefone", "origem", "status", "criado_em"].join(",")];
    leads.forEach((l) => {
      const campos = [l.nome ?? "", l.email, l.telefone ?? "", SOURCE_LABEL[l.source] ?? l.source, LEAD_LABEL[l.status] ?? l.status, l.created_at]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`);
      linhas.push(campos.join(","));
    });
    const blob = new Blob(["\uFEFF" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-axia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function importarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImportando(true);
    const texto = await file.text();
    const rows = parseCSV(texto);
    if (rows.length === 0) { setImportando(false); flash("Nenhuma linha válida na planilha."); return; }
    const r = await adminImportLeads(rows);
    setImportando(false);
    if (fileRef.current) fileRef.current.value = "";
    if ("error" in r && r.error) flash(r.error);
    else if ("importados" in r) flash(`${r.importados} leads importados. Recarregue para ver.`);
  }

  return (
    <section className="panel">
      <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
        <h3>Leads</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importarArquivo} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={importando} style={btn}>
            {importando ? "Importando…" : "Importar CSV"}
          </button>
          <button onClick={exportarCSV} style={btn}>Exportar CSV</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 14px" }}>
        <Chip on={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos · {leads.length}</Chip>
        {LEAD_STATUS.map((s) => <Chip key={s} on={filtro === s} onClick={() => setFiltro(s)}>{LEAD_LABEL[s]} · {contagem[s] ?? 0}</Chip>)}
        <div className="search" style={{ maxWidth: 260, margin: 0, marginLeft: "auto" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
          <input placeholder="Buscar lead…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
            <th style={{ padding: "12px 16px" }}>Lead</th><th style={{ padding: "12px 16px" }}>Origem</th>
            <th style={{ padding: "12px 16px" }}>Status</th><th style={{ padding: "12px 16px", minWidth: 220 }}>Nota interna</th><th style={{ padding: "12px 16px" }}>Criado</th>
          </tr></thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={5} style={{ padding: "28px 16px", textAlign: "center", color: "#6B7C93" }}>Nenhum lead {filtro !== "todos" ? "neste status" : "ainda"}.</td></tr>}
            {filtrados.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, color: "#10233F" }}>{l.nome?.trim() || "—"}</div>
                  <div style={{ color: "#6B7C93" }}>{l.email}</div>
                  {l.telefone && <div style={{ color: "#6B7C93" }}>{l.telefone}</div>}
                </td>
                <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, color: "#4A5B72" }}>{SOURCE_LABEL[l.source] ?? l.source}</span></td>
                <td style={{ padding: "12px 16px" }}>
                  <select value={st(l)} onChange={(e) => startT(() => mudarStatus(l, e.target.value))} style={{ padding: "6px 8px", border: "1px solid #E4E9F0", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 12.5 }}>
                    {LEAD_STATUS.map((s) => <option key={s} value={s}>{LEAD_LABEL[s]}</option>)}
                  </select>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input defaultValue={l.notes ?? ""} onChange={(e) => setNotas((n) => ({ ...n, [l.id]: e.target.value }))} placeholder="Anotação…"
                      style={{ flex: 1, padding: "6px 8px", border: "1px solid #E4E9F0", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 12.5 }} />
                    <button onClick={() => startT(() => salvarNota(l))} style={{ ...btn, padding: "6px 10px" }} disabled={notas[l.id] === undefined}>Salvar</button>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#6B7C93", whiteSpace: "nowrap" }}>{quando(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
        Leads vêm do formulário do site, de cadastros que não converteram e de importação por planilha (CSV: colunas nome, email, telefone). Cadastros que assinam viram “Convertido” automaticamente.
      </p>
    </section>
  );
}

const btn: React.CSSProperties = { padding: "8px 12px", border: "1px solid #16305B", background: "#16305B", color: "#fff", borderRadius: 8, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600 };
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid " + (on ? "#1FA89E" : "#E4E9F0"), background: on ? "#E8F6F4" : "#fff", color: on ? "#0F7A70" : "#4A5B72", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: on ? 600 : 500 }}>{children}</button>;
}

// ── SISTEMA ─────────────────────────────────────────────────
const CONFIG_LABEL: Record<string, string> = {
  stripe_key: "Chave do Stripe", stripe_webhook: "Assinatura do webhook Stripe",
  inbound_secret: "Segredo de entrada (Postmark)", inbound_org: "Organização de entrada",
  site_url: "URL do site", service_role: "Chave de serviço (Supabase)",
};

function SistemaPanel({ data, flash }: { data: SistemaData; flash: (m: string) => void }) {
  const { webhooks, whResumo, ingestao, ingErros, config } = data;
  const [reproc, setReproc] = useState<string>("");
  const [, startT] = useTransition();

  async function reprocessarUm(id: string) {
    setReproc(id);
    const r = await adminReprocessWebhook(id);
    setReproc("");
    flash("error" in r && r.error ? "Falha ao reprocessar." : "Reprocessado. Recarregue para atualizar.");
  }
  async function reprocessarTodos() {
    setReproc("all");
    const r = await adminReprocessarPendentes();
    setReproc("");
    if ("error" in r && r.error) flash("Falha ao reprocessar.");
    else if ("reprocessados" in r) flash(`${r.reprocessados} reprocessados, ${r.falhas} falhas. Recarregue.`);
  }

  return (
    <>
      {/* Cartões de saúde */}
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kn">{whResumo.pendentes}</div><div className="kl">Webhooks pendentes</div><div className={"kt " + (whResumo.pendentes > 0 ? "warn" : "up")}>{whResumo.total} no total</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 15, fontWeight: 600 }}>{whResumo.ultimo ? quandoHora(whResumo.ultimo) : "—"}</div><div className="kl">Último webhook OK</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 15, fontWeight: 600 }}>{ingestao.ultimo_email ? quandoHora(ingestao.ultimo_email) : "—"}</div><div className="kl">Último e-mail ingerido</div><div className="kt up">{ingestao.total_mes} no mês</div></div>
        <div className="kpi"><div className="kn">{ingErros.length}</div><div className="kl">Erros de ingestão</div><div className={"kt " + (ingErros.length > 0 ? "warn" : "up")}>{ingErros.length > 0 ? "verificar" : "ok"}</div></div>
      </div>

      {/* Configuração */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Configuração</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, padding: "4px 2px" }}>
          {Object.keys(CONFIG_LABEL).map((k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: config[k] ? "#1FA89E" : "#C0492E", flex: "0 0 auto" }} />
              <span style={{ color: "#10233F" }}>{CONFIG_LABEL[k]}</span>
              <span style={{ marginLeft: "auto", color: config[k] ? "#0F7A70" : "#C0492E", fontSize: 12 }}>{config[k] ? "configurado" : "faltando"}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: 12.5, color: "#6B7C93" }}>Mostra apenas se cada variável está definida no ambiente — nunca o valor em si.</p>
      </section>

      {/* Webhooks */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
          <h3>Webhooks Stripe</h3>
          {whResumo.pendentes > 0 && (
            <button onClick={() => startT(reprocessarTodos)} disabled={reproc === "all"} style={btn}>
              {reproc === "all" ? "Reprocessando…" : `Reprocessar pendentes (${whResumo.pendentes})`}
            </button>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
              <th style={{ padding: "10px 14px" }}>Evento</th><th style={{ padding: "10px 14px" }}>Tipo</th>
              <th style={{ padding: "10px 14px" }}>Estado</th><th style={{ padding: "10px 14px" }}>Quando</th><th style={{ padding: "10px 14px" }}></th>
            </tr></thead>
            <tbody>
              {webhooks.length === 0 && <tr><td colSpan={5} style={{ padding: "24px 14px", textAlign: "center", color: "#6B7C93" }}>Nenhum evento registrado.</td></tr>}
              {webhooks.map((w) => (
                <tr key={w.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11.5, color: "#6B7C93" }}>{w.id.slice(0, 18)}…</td>
                  <td style={{ padding: "10px 14px" }}>{w.type}</td>
                  <td style={{ padding: "10px 14px" }}><span className={"st " + (w.processed ? "st-ok" : "st-urg")}>{w.processed ? "Processado" : "Pendente"}</span></td>
                  <td style={{ padding: "10px 14px", color: "#6B7C93", whiteSpace: "nowrap" }}>{w.processed_at ? quandoHora(w.processed_at) : "—"}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    {!w.processed && <button onClick={() => startT(() => reprocessarUm(w.id))} disabled={reproc === w.id} style={{ ...btn, padding: "6px 10px" }}>{reproc === w.id ? "…" : "Reprocessar"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 12, fontSize: 12.5, color: "#6B7C93" }}>Reprocessar re-busca o evento no Stripe e reaplica o estado canônico (idempotente).</p>
      </section>

      {/* Erros de ingestão */}
      <section className="panel">
        <div className="panel-h"><h3>Erros de ingestão</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
              <th style={{ padding: "10px 14px" }}>Quando</th><th style={{ padding: "10px 14px" }}>Etapa</th><th style={{ padding: "10px 14px" }}>Mensagem</th>
            </tr></thead>
            <tbody>
              {ingErros.length === 0 && <tr><td colSpan={3} style={{ padding: "24px 14px", textAlign: "center", color: "#6B7C93" }}>Nenhum erro de ingestão registrado. 👍</td></tr>}
              {ingErros.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                  <td style={{ padding: "10px 14px", color: "#6B7C93", whiteSpace: "nowrap" }}>{quandoHora(e.created_at)}</td>
                  <td style={{ padding: "10px 14px" }}>{e.stage}</td>
                  <td style={{ padding: "10px 14px", color: "#6B7C93" }}>{e.message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 12, fontSize: 12.5, color: "#6B7C93" }}>Só metadados técnicos das falhas — nunca o conteúdo dos e-mails, em conformidade com a LGPD.</p>
      </section>
    </>
  );
}

function Visao({ total, ativosLen, receita, porPlano, webhooksPendentes, metricas, historico }: { total: number; ativosLen: number; receita: number; porPlano: Record<string, number>; webhooksPendentes: number; metricas: Metricas | null; historico: Snapshot[] }) {
  return (
    <>
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kn">{total}</div><div className="kl">Assinantes</div><div className="kt up">{ativosLen} ativos</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 24 }}>{formatBRL(receita)}</div><div className="kl">MRR estimado</div><div className="kt up">assinaturas ativas</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 22 }}>{porPlano.essential} · {porPlano.pro} · {porPlano.office}</div><div className="kl">Essential · Pro · Master</div></div>
        <div className="kpi"><div className="kn">{webhooksPendentes}</div><div className="kl">Webhooks pendentes</div><div className={"kt " + (webhooksPendentes > 0 ? "warn" : "up")}>{webhooksPendentes > 0 ? "verificar" : "ok"}</div></div>
      </div>
      {metricas && (
        <div className="kpis" style={{ marginBottom: 22 }}>
          <Mini n={metricas.novos_mes} l="Novos no mês" /><Mini n={metricas.ativos} l="Ativas" /><Mini n={metricas.trial} l="Em teste" />
          <Mini n={metricas.past_due} l="Pgto pendente" /><Mini n={metricas.cancelados + metricas.suspensos + metricas.expirados} l="Inativas" />
        </div>
      )}
      <section className="panel" style={{ marginBottom: 18 }}><div className="panel-h"><h3>Evolução do MRR</h3></div><MrrChart historico={historico} /></section>
      <section className="panel"><div className="panel-h"><h3>Distribuição por plano (ativos)</h3></div><BarPlanos porPlano={porPlano} totalAtivos={ativosLen} /></section>
    </>
  );
}
function Mini({ n, l }: { n: number; l: string }) { return <div className="kpi"><div className="kn" style={{ fontSize: 26 }}>{n}</div><div className="kl">{l}</div></div>; }

function MrrChart({ historico }: { historico: Snapshot[] }) {
  if (historico.length < 2) return <p style={{ padding: "8px 4px", color: "#6B7C93", fontSize: 13.5 }}>Coletando histórico — o gráfico de evolução aparece a partir de amanhã, conforme os retratos diários vão sendo registrados.</p>;
  const W = 640, H = 160, pad = 28;
  const vals = historico.map((s) => s.mrr_cents);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), range = Math.max(max - min, 1);
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(historico.length - 1, 1);
  const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2);
  const pts = historico.map((s, i) => `${x(i)},${y(s.mrr_cents)}`).join(" ");
  const MESn = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const rotulo = (dia: string) => { const d = new Date(dia + "T00:00:00"); return `${d.getDate()}/${MESn[d.getMonth()]}`; };
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 480, height: "auto" }}>
        <polyline points={pts} fill="none" stroke="#1FA89E" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {historico.map((s, i) => <circle key={s.dia} cx={x(i)} cy={y(s.mrr_cents)} r={3} fill="#16305B" />)}
        <text x={pad} y={H - 6} fontSize={11} fill="#6B7C93">{rotulo(historico[0].dia)}</text>
        <text x={W - pad} y={H - 6} fontSize={11} fill="#6B7C93" textAnchor="end">{rotulo(historico[historico.length - 1].dia)}</text>
        <text x={pad} y={16} fontSize={11} fill="#6B7C93">{formatBRL(max)}</text>
      </svg>
    </div>
  );
}
function BarPlanos({ porPlano, totalAtivos }: { porPlano: Record<string, number>; totalAtivos: number }) {
  const linhas = [{ k: "essential", label: "Essential", cor: "#A8C4E0" }, { k: "pro", label: "Pro", cor: "#1FA89E" }, { k: "office", label: "Master", cor: "#16305B" }];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "6px 2px" }}>
      {linhas.map((l) => {
        const v = porPlano[l.k] ?? 0, pct = totalAtivos > 0 ? Math.round((v / totalAtivos) * 100) : 0;
        return (
          <div key={l.k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 90, fontSize: 13.5, color: "#10233F" }}>{l.label}</div>
            <div style={{ flex: 1, height: 12, background: "#F0F3F7", borderRadius: 8, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: l.cor, borderRadius: 8 }} /></div>
            <div style={{ width: 64, textAlign: "right", fontSize: 13, color: "#6B7C93" }}>{v} · {pct}%</div>
          </div>
        );
      })}
    </div>
  );
}
