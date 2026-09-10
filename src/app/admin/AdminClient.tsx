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
import {
  adminCancelarAssinatura, adminReativarAssinatura,
  adminPreverTrocaPlano, adminTrocarPlano, adminReembolsar, adminAplicarCupom,
  type FinanceiroRow,
} from "../actions/finance";
import { adminCriarCampanha, adminToggleCampanha, type Campanha } from "../actions/campaigns";
import { adminSaveBanner, type Banner, type MarketingMetricas } from "../actions/marketing";
import { adminEnviarEmail, adminEmailContagem, type EmailCampaign } from "../actions/email";
import { adminSaveConteudo } from "../actions/content";
import { CAMPOS_CONTEUDO } from "../actions/content-fields";
import { adminSavePrecos } from "../actions/prices";
import { adminUploadLogo, adminRemoverLogo } from "../actions/upload";
import Toast from "../Toast";

export interface SistemaData {
  webhooks: WebhookEvent[]; whResumo: WebhooksResumo; ingestao: IngestaoResumo;
  ingErros: IngestionError[]; config: Record<string, boolean>;
}
export interface FinanceiroData { rows: FinanceiroRow[]; erro?: string; stripeTestMode: boolean }
export interface CampanhasData { rows: Campanha[]; erro?: string }

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

type Aba = "visao" | "assinantes" | "financeiro" | "campanhas" | "marketing" | "conteudo" | "leads" | "sistema" | "auditoria";

export default function AdminClient({
  assinantes, webhooksPendentes, erro, metricas, auditoria, historico, leads, sistema, financeiro, campanhas, banner, mktMetricas, emailCampaigns, conteudo, precos,
}: {
  assinantes: Assinante[]; webhooksPendentes: number; erro?: string;
  metricas: Metricas | null; auditoria: AuditEvent[]; historico: Snapshot[]; leads: Lead[];
  sistema: SistemaData; financeiro: FinanceiroData; campanhas: CampanhasData; banner: Banner; mktMetricas: MarketingMetricas; emailCampaigns: EmailCampaign[]; conteudo: Record<string, string>; precos: Record<string, number>;
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
        <Tab id="financeiro" atual={aba} set={setAba}>Financeiro</Tab>
        <Tab id="campanhas" atual={aba} set={setAba}>Campanhas</Tab>
        <Tab id="marketing" atual={aba} set={setAba}>Marketing</Tab>
        <Tab id="conteudo" atual={aba} set={setAba}>Conteúdo</Tab>
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

      {aba === "financeiro" && <FinanceiroPanel data={financeiro} campanhas={campanhas.rows} flash={flash} />}

      {aba === "campanhas" && <CampanhasPanel data={campanhas} flash={flash} />}

      {aba === "marketing" && <MarketingPanel banner={banner} metricas={mktMetricas} campanhas={campanhas.rows} emailCampaigns={emailCampaigns} flash={flash} />}

      {aba === "conteudo" && <ConteudoPanel conteudo={conteudo} precos={precos} flash={flash} />}

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
const btnGhost: React.CSSProperties = { padding: "6px 12px", border: "1px solid #E4E9F0", background: "#fff", color: "#16305B", borderRadius: 8, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 600 };
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid " + (on ? "#1FA89E" : "#E4E9F0"), background: on ? "#E8F6F4" : "#fff", color: on ? "#0F7A70" : "#4A5B72", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: on ? 600 : 500 }}>{children}</button>;
}

// ── LOGO ────────────────────────────────────────────────────
function LogoUploader({ logoUrl, flash }: { logoUrl: string; flash: (m: string) => void }) {
  const [url, setUrl] = useState(logoUrl);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, startT] = useTransition();

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { flash("Arquivo muito grande (máx. 2 MB)."); return; }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    setBusy(true);
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("Falha ao ler o arquivo."));
      r.readAsDataURL(file);
    }).catch(() => "") as string;
    if (!dataUrl) { setBusy(false); flash("Não foi possível ler o arquivo."); return; }
    const r = await adminUploadLogo(dataUrl, ext);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if ("error" in r && r.error) { flash(r.error); return; }
    if ("url" in r && r.url) { setUrl(r.url); flash("Logo enviada. Já vale no site."); }
  }

  async function remover() {
    setBusy(true);
    const r = await adminRemoverLogo();
    setBusy(false);
    if ("error" in r && r.error) { flash(r.error); return; }
    setUrl(""); flash("Logo removida. Voltou ao símbolo padrão.");
  }

  return (
    <section className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-h"><h3>Logo do site</h3></div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ background: "#16305B", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", minWidth: 120, minHeight: 60, justifyContent: "center" }}>
          {url ? <img src={url} alt="logo" style={{ height: 34, width: "auto", display: "block" }} /> : <span style={{ color: "#A8C4E0", fontSize: 13 }}>Símbolo padrão (SVG)</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp,image/*" onChange={enviar} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} style={btn}>{busy ? "Enviando…" : "Enviar logo (PNG/SVG)"}</button>
          {url && <button onClick={() => startT(remover)} disabled={busy} style={btnGhost}>Remover (voltar ao padrão)</button>}
        </div>
      </div>
      <p style={{ marginTop: 12, fontSize: 12.5, color: "#6B7C93" }}>
        Aceita PNG, JPG, SVG ou WEBP (máx. 2 MB). Dica: exporte em alta resolução (largura ~200–300px) para não borrar. Sem logo enviada, o site usa o símbolo padrão. Requer o bucket <b>public-assets</b> criado e público no Supabase Storage.
      </p>
    </section>
  );
}

// ── CONTEÚDO DO SITE ────────────────────────────────────────
function ConteudoPanel({ conteudo, precos, flash }: { conteudo: Record<string, string>; precos: Record<string, number>; flash: (m: string) => void }) {
  const inicial = Object.fromEntries(CAMPOS_CONTEUDO.map((c) => [c.chave, conteudo[c.chave] ?? c.padrao]));
  const [vals, setVals] = useState<Record<string, string>>(inicial);
  const [busy, setBusy] = useState(false);
  const [, startT] = useTransition();

  // Preços em reais (string) por plan_id, a partir dos centavos efetivos.
  const precoInicial = Object.fromEntries(Object.keys(PLANS).map((id) => [id, ((precos[id] ?? PLANS[id].amount) / 100).toFixed(2).replace(".", ",")]));
  const [precoVals, setPrecoVals] = useState<Record<string, string>>(precoInicial);
  const [busyP, setBusyP] = useState(false);

  async function salvar() {
    setBusy(true);
    const r = await adminSaveConteudo(vals);
    setBusy(false);
    flash("error" in r && r.error ? r.error : "Textos salvos. Já valem no site.");
  }
  function restaurar(chave: string, padrao: string) { setVals((v) => ({ ...v, [chave]: padrao })); }

  async function salvarPrecos() {
    const cents: Record<string, number> = {};
    for (const id of Object.keys(precoVals)) {
      const n = Math.round(parseFloat(precoVals[id].replace(/\./g, "").replace(",", ".")) * 100);
      if (!Number.isFinite(n) || n <= 0) { flash(`Preço inválido em ${id}.`); return; }
      cents[id] = n;
    }
    setBusyP(true);
    const r = await adminSavePrecos(cents);
    setBusyP(false);
    flash("error" in r && r.error ? r.error : "Preços salvos. Valem para novos assinantes.");
  }

  const PLAN_ORDER = ["essential_monthly", "essential_annual", "pro_monthly", "pro_annual", "office_monthly", "office_annual"];

  return (
    <>
    <LogoUploader logoUrl={conteudo["logo_url"] || ""} flash={flash} />

    <section className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-h"><h3>Conteúdo do site</h3></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {CAMPOS_CONTEUDO.map((c) => (
          <div key={c.chave}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 12.5, color: "#4A5B72" }}>{c.rotulo}</label>
              {vals[c.chave] !== c.padrao && <button onClick={() => restaurar(c.chave, c.padrao)} style={{ ...btnGhost, padding: "2px 8px", fontSize: 11.5 }}>Restaurar padrão</button>}
            </div>
            {c.multiline
              ? <textarea value={vals[c.chave]} onChange={(e) => setVals((v) => ({ ...v, [c.chave]: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} />
              : <input value={vals[c.chave]} onChange={(e) => setVals((v) => ({ ...v, [c.chave]: e.target.value }))} style={inp} />}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => startT(salvar)} disabled={busy} style={btn}>{busy ? "Salvando…" : "Salvar textos"}</button>
      </div>
    </section>

    <section className="panel">
      <div className="panel-h"><h3>Preços dos planos</h3></div>
      <div style={{ background: "#FBF3E7", border: "1px solid #F0E0C6", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "#8A5A18", marginBottom: 14 }}>
        Alterar o preço vale para <b>novos assinantes</b> (novos checkouts) e para o valor exibido no site. Quem já assina continua no preço atual — não reprecifica ninguém automaticamente.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {PLAN_ORDER.filter((id) => id in PLANS).map((id) => (
          <Campo key={id} label={`${PLANS[id].name} · ${PLANS[id].interval === "year" ? "anual" : "mensal"}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#6B7C93", fontSize: 13 }}>R$</span>
              <input value={precoVals[id]} onChange={(e) => setPrecoVals((v) => ({ ...v, [id]: e.target.value }))} style={inp} />
            </div>
          </Campo>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => startT(salvarPrecos)} disabled={busyP} style={btn}>{busyP ? "Salvando…" : "Salvar preços"}</button>
      </div>
      <p style={{ marginTop: 12, fontSize: 12.5, color: "#6B7C93" }}>
        O checkout passa a cobrar estes valores em novas assinaturas, e a landing exibe-os automaticamente. Os direitos/limites de cada plano continuam definidos no código.
      </p>
    </section>
    </>
  );
}

// ── E-MAIL EM MASSA ─────────────────────────────────────────
const PUBLICO_LABEL: Record<string, string> = { leads: "Leads", assinantes: "Assinantes", ambos: "Leads + Assinantes" };

function EmailBroadcast({ campanhas, flash }: { campanhas: EmailCampaign[]; flash: (m: string) => void }) {
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [publico, setPublico] = useState("leads");
  const [contagem, setContagem] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startT] = useTransition();

  async function contar(p: string) {
    setPublico(p); setContagem(null);
    const n = await adminEmailContagem(p);
    setContagem(n);
  }
  async function enviar() {
    if (!assunto.trim() || !corpo.trim()) { flash("Preencha assunto e mensagem."); return; }
    const n = contagem ?? await adminEmailContagem(publico);
    if (!confirm(`Enviar este e-mail para ${n} destinatário(s) do público "${PUBLICO_LABEL[publico]}"? Todos recebem link de descadastro.`)) return;
    setBusy(true);
    const r = await adminEnviarEmail(assunto, corpo, publico);
    setBusy(false);
    if ("error" in r && r.error) { flash(r.error); return; }
    if ("enviados" in r) { flash(`Enviados: ${r.enviados}, falhas: ${r.falhas}. Recarregue para ver no histórico.`); setAssunto(""); setCorpo(""); }
  }

  const quandoHoraLocal = (iso: string | null) => iso ? quandoHora(iso) : "—";

  return (
    <section className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-h"><h3>E-mail em massa</h3></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 12 }}>
        <Campo label="Público">
          <select value={publico} onChange={(e) => startT(() => contar(e.target.value))} style={inp}>
            <option value="leads">Leads (ainda não assinam)</option>
            <option value="assinantes">Assinantes</option>
            <option value="ambos">Leads + Assinantes</option>
          </select>
        </Campo>
        <Campo label="Destinatários">
          <div style={{ paddingTop: 8, fontSize: 14, color: "#10233F" }}>{contagem === null ? "—" : `${contagem} pessoa(s)`}</div>
        </Campo>
      </div>
      <Campo label="Assunto"><input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Novidades da AXIA" style={inp} /></Campo>
      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", fontSize: 12.5, color: "#4A5B72", marginBottom: 4 }}>Mensagem</label>
        <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={6} placeholder="Escreva a mensagem…" style={{ ...inp, resize: "vertical" }} />
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => startT(enviar)} disabled={busy} style={btn}>{busy ? "Enviando…" : "Enviar e-mail"}</button>
        <span style={{ fontSize: 12, color: "#6B7C93" }}>Todo envio inclui link de descadastro (LGPD).</span>
      </div>

      {campanhas.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4A5B72", marginBottom: 8 }}>Histórico de envios</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
                <th style={{ padding: "10px 14px" }}>Assunto</th><th style={{ padding: "10px 14px" }}>Público</th>
                <th style={{ padding: "10px 14px" }}>Enviados</th><th style={{ padding: "10px 14px" }}>Falhas</th><th style={{ padding: "10px 14px" }}>Quando</th>
              </tr></thead>
              <tbody>
                {campanhas.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                    <td style={{ padding: "10px 14px", color: "#10233F" }}>{c.assunto}</td>
                    <td style={{ padding: "10px 14px" }}>{PUBLICO_LABEL[c.publico] ?? c.publico}</td>
                    <td style={{ padding: "10px 14px" }}>{c.enviados}/{c.destinatarios}</td>
                    <td style={{ padding: "10px 14px", color: c.falhas > 0 ? "#C0492E" : "#6B7C93" }}>{c.falhas}</td>
                    <td style={{ padding: "10px 14px", color: "#6B7C93", whiteSpace: "nowrap" }}>{quandoHoraLocal(c.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
        O envio real depende do Postmark de envio configurado (token, remetente verificado e stream de broadcast). Sem isso, o botão retorna um aviso claro em vez de enviar.
      </p>
    </section>
  );
}

// ── MARKETING ───────────────────────────────────────────────
const BANNER_CORES: Record<string, string> = { info: "#1FA89E", promo: "#16305B", alerta: "#B8542E" };

function MarketingPanel({ banner, metricas, campanhas, emailCampaigns, flash }: { banner: Banner; metricas: MarketingMetricas; campanhas: Campanha[]; emailCampaigns: EmailCampaign[]; flash: (m: string) => void }) {
  const [b, setB] = useState<Banner>(banner);
  const [busy, setBusy] = useState(false);
  const [, startT] = useTransition();
  const setK = (k: keyof Banner, v: any) => setB((prev) => ({ ...prev, [k]: v }));

  async function salvar() {
    setBusy(true);
    const r = await adminSaveBanner(b);
    setBusy(false);
    flash("error" in r && r.error ? r.error : "Banner salvo. Já vale no site.");
  }

  const cor = BANNER_CORES[b.variante] ?? BANNER_CORES.info;
  const { resumo, origem, funil } = metricas;
  const convPct = resumo.total > 0 ? Math.round((resumo.convertidos / resumo.total) * 100) : 0;
  const funilMap = Object.fromEntries(funil.map((f) => [f.status, f.total]));
  const totalUsosCampanhas = campanhas.reduce((s, c) => s + (c.usos ?? 0), 0);

  return (
    <>
      {/* Métricas de marketing */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Métricas de marketing</h3></div>
        <div className="kpis" style={{ marginBottom: 16 }}>
          <div className="kpi"><div className="kn">{resumo.total}</div><div className="kl">Leads no total</div><div className="kt up">{resumo.novos_mes} no mês</div></div>
          <div className="kpi"><div className="kn">{resumo.convertidos}</div><div className="kl">Convertidos</div><div className="kt up">{convPct}% de conversão</div></div>
          <div className="kpi"><div className="kn">{campanhas.filter((c) => c.ativo).length}</div><div className="kl">Campanhas ativas</div></div>
          <div className="kpi"><div className="kn">{totalUsosCampanhas}</div><div className="kl">Usos de cupom</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
          {/* Funil */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4A5B72", marginBottom: 10 }}>Funil de leads</div>
            {LEAD_STATUS.map((s) => {
              const v = funilMap[s] ?? 0;
              const pct = resumo.total > 0 ? Math.round((v / resumo.total) * 100) : 0;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 92, fontSize: 12.5, color: "#10233F" }}>{LEAD_LABEL[s]}</div>
                  <div style={{ flex: 1, height: 10, background: "#F0F3F7", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s === "convertido" ? "#1FA89E" : s === "descartado" ? "#C0492E" : "#16305B", borderRadius: 6 }} />
                  </div>
                  <div style={{ width: 54, textAlign: "right", fontSize: 12.5, color: "#6B7C93" }}>{v}</div>
                </div>
              );
            })}
          </div>

          {/* Conversão por origem */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4A5B72", marginBottom: 10 }}>Conversão por origem</div>
            {origem.length === 0 && <div style={{ color: "#9AA7B8", fontSize: 13 }}>Sem leads ainda.</div>}
            {origem.map((o) => {
              const pct = o.total > 0 ? Math.round((o.convertidos / o.total) * 100) : 0;
              return (
                <div key={o.source} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ color: "#10233F" }}>{SOURCE_LABEL[o.source] ?? o.source}</span>
                    <span style={{ color: "#6B7C93" }}>{o.convertidos}/{o.total} · {pct}%</span>
                  </div>
                  <div style={{ height: 10, background: "#F0F3F7", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#1FA89E", borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* E-mail em massa */}
      <EmailBroadcast campanhas={emailCampaigns} flash={flash} />

      {/* Editor de banner */}
      <section className="panel">
      <div className="panel-h"><h3>Banner de aviso</h3></div>

      {/* Prévia ao vivo */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: "#6B7C93", marginBottom: 6 }}>Prévia</div>
        {b.mensagem.trim() ? (
          <div style={{ position: "relative", background: cor, color: "#fff", fontSize: 14, padding: "10px 40px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
            <span>{b.mensagem}</span>
            {b.link_url && <span style={{ fontWeight: 700, textDecoration: "underline" }}>{b.link_label || "Saiba mais"}</span>}
            <span style={{ position: "absolute", right: 12, opacity: 0.8 }}>×</span>
          </div>
        ) : <div style={{ color: "#9AA7B8", fontSize: 13.5 }}>Digite uma mensagem para ver a prévia.</div>}
        {!b.ativo && <div style={{ fontSize: 12, color: "#B8542E", marginTop: 6 }}>Banner desativado — não aparece no site enquanto “Ativo” estiver desligado.</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Campo label="Mensagem">
            <input value={b.mensagem} onChange={(e) => setK("mensagem", e.target.value)} placeholder="Black Friday: 50% off com o código BLACK50" style={inp} />
          </Campo>
        </div>
        <Campo label="Estilo">
          <select value={b.variante} onChange={(e) => setK("variante", e.target.value)} style={inp}>
            <option value="info">Informativo (teal)</option>
            <option value="promo">Promoção (navy)</option>
            <option value="alerta">Alerta (âmbar)</option>
          </select>
        </Campo>
        <Campo label="Link (opcional)"><input value={b.link_url ?? ""} onChange={(e) => setK("link_url", e.target.value)} placeholder="https://…" style={inp} /></Campo>
        <Campo label="Texto do link (opcional)"><input value={b.link_label ?? ""} onChange={(e) => setK("link_label", e.target.value)} placeholder="Saiba mais" style={inp} /></Campo>
        <Campo label="Ativo">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#10233F", cursor: "pointer", paddingTop: 6 }}>
            <input type="checkbox" checked={b.ativo} onChange={(e) => setK("ativo", e.target.checked)} style={{ width: 16, height: 16 }} />
            Mostrar no site/app
          </label>
        </Campo>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => startT(salvar)} disabled={busy} style={btn}>{busy ? "Salvando…" : "Salvar banner"}</button>
      </div>
      <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
        O banner aparece no topo de todas as páginas (landing e app) quando ativo. Use-o para Black Friday, avisos e promoções. E-mail em massa chega no próximo lote.
      </p>
    </section>
    </>
  );
}

// ── CAMPANHAS ───────────────────────────────────────────────
function CampanhasPanel({ data, flash }: { data: CampanhasData; flash: (m: string) => void }) {
  const { rows, erro } = data;
  const [criando, setCriando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [togBusy, setTogBusy] = useState("");
  const [, startT] = useTransition();

  const vazio = { nome: "", codigo: "", tipo: "percentual" as "percentual" | "fixo", valor: "", duracao: "once" as "once" | "repeating" | "forever", meses: "", inicio: "", fim: "", maxUsos: "" };
  const [f, setF] = useState(vazio);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function criar() {
    const valorNum = f.tipo === "percentual" ? Number(f.valor) : Math.round(Number(f.valor) * 100);
    if (!f.codigo.trim()) { flash("Informe o código (ex.: BLACK50)."); return; }
    if (!valorNum || valorNum <= 0) { flash("Informe o valor do desconto."); return; }
    setBusy(true);
    const r = await adminCriarCampanha({
      nome: f.nome, codigo: f.codigo, tipo: f.tipo, valor: valorNum,
      duracao: f.duracao, meses: f.meses ? Number(f.meses) : undefined,
      inicioTs: f.inicio ? Math.floor(new Date(f.inicio).getTime() / 1000) : null,
      fimTs: f.fim ? Math.floor(new Date(f.fim + "T23:59:59").getTime() / 1000) : null,
      maxUsos: f.maxUsos ? Number(f.maxUsos) : null,
    });
    setBusy(false);
    if ("error" in r && r.error) { flash(r.error); return; }
    flash(`Campanha ${("codigo" in r && r.codigo) || ""} criada. Recarregue para ver.`);
    setF(vazio); setCriando(false);
  }

  async function toggle(c: Campanha) {
    setTogBusy(c.promoId);
    const r = await adminToggleCampanha(c.promoId, !c.ativo);
    setTogBusy("");
    flash("error" in r && r.error ? r.error : (c.ativo ? "Campanha desativada." : "Campanha ativada.") + " Recarregue.");
  }

  const fmtDia = (ts: number | null) => ts ? quando(new Date(ts * 1000).toISOString()) : "—";

  return (
    <section className="panel">
      {erro && <div className="err">{erro}</div>}
      <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
        <h3>Campanhas e cupons</h3>
        <button onClick={() => setCriando((v) => !v)} style={btn}>{criando ? "Fechar" : "+ Nova campanha"}</button>
      </div>

      {criando && (
        <div style={{ border: "1px solid #E6EBF2", borderRadius: 12, padding: 16, marginBottom: 16, background: "#FAFBFD" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <Campo label="Nome da campanha"><input value={f.nome} onChange={set("nome")} placeholder="Black Friday 2026" style={inp} /></Campo>
            <Campo label="Código promocional"><input value={f.codigo} onChange={set("codigo")} placeholder="BLACK50" style={{ ...inp, textTransform: "uppercase" }} /></Campo>
            <Campo label="Tipo de desconto">
              <select value={f.tipo} onChange={set("tipo")} style={inp}><option value="percentual">Percentual (%)</option><option value="fixo">Valor fixo (R$)</option></select>
            </Campo>
            <Campo label={f.tipo === "percentual" ? "Percentual (1–100)" : "Valor em R$"}>
              <input type="number" value={f.valor} onChange={set("valor")} placeholder={f.tipo === "percentual" ? "50" : "30,00"} style={inp} />
            </Campo>
            <Campo label="Duração do desconto">
              <select value={f.duracao} onChange={set("duracao")} style={inp}>
                <option value="once">Só primeira cobrança</option>
                <option value="repeating">Por X meses</option>
                <option value="forever">Para sempre</option>
              </select>
            </Campo>
            {f.duracao === "repeating" && <Campo label="Quantos meses"><input type="number" value={f.meses} onChange={set("meses")} placeholder="3" style={inp} /></Campo>}
            <Campo label="Início do resgate (opcional)"><input type="date" value={f.inicio} onChange={set("inicio")} style={inp} /></Campo>
            <Campo label="Fim do resgate (opcional)"><input type="date" value={f.fim} onChange={set("fim")} style={inp} /></Campo>
            <Campo label="Limite de usos (opcional)"><input type="number" value={f.maxUsos} onChange={set("maxUsos")} placeholder="ilimitado" style={inp} /></Campo>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => startT(criar)} disabled={busy} style={btn}>{busy ? "Criando…" : "Criar campanha"}</button>
            <button onClick={() => { setF(vazio); setCriando(false); }} style={btnGhost}>Cancelar</button>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: "#6B7C93" }}>A campanha é criada como cupom + código no Stripe. O campo de código já aparece no checkout.</p>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
            <th style={{ padding: "12px 14px" }}>Código</th><th style={{ padding: "12px 14px" }}>Desconto</th>
            <th style={{ padding: "12px 14px" }}>Duração</th><th style={{ padding: "12px 14px" }}>Usos</th>
            <th style={{ padding: "12px 14px" }}>Expira</th><th style={{ padding: "12px 14px" }}>Estado</th><th style={{ padding: "12px 14px" }}></th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} style={{ padding: "28px 14px", textAlign: "center", color: "#6B7C93" }}>Nenhuma campanha ainda. Crie a primeira acima.</td></tr>}
            {rows.map((c) => (
              <tr key={c.promoId} style={{ borderBottom: "1px solid #F0F3F7" }}>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: "#10233F", fontFamily: "monospace" }}>{c.codigo}</td>
                <td style={{ padding: "12px 14px" }}>{c.descontoLabel}</td>
                <td style={{ padding: "12px 14px" }}>{c.duracaoLabel}</td>
                <td style={{ padding: "12px 14px" }}>{c.usos}{c.maxUsos ? ` / ${c.maxUsos}` : ""}</td>
                <td style={{ padding: "12px 14px", color: "#6B7C93" }}>{fmtDia(c.expiraEm)}</td>
                <td style={{ padding: "12px 14px" }}><span className={"st " + (c.ativo ? "st-ok" : "st-urg")}>{c.ativo ? "Ativa" : "Inativa"}</span></td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <button onClick={() => startT(() => toggle(c))} disabled={togBusy === c.promoId} style={btnGhost}>{togBusy === c.promoId ? "…" : (c.ativo ? "Desativar" : "Ativar")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
        Campanhas ficam registradas no Stripe (cupom + código). Percentual e valor fixo; duração à sua escolha; janela de resgate e limite de usos opcionais. Desativar não apaga o histórico.
      </p>
    </section>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #E4E9F0", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 13.5, boxSizing: "border-box" };
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", fontSize: 12.5, color: "#4A5B72", marginBottom: 4 }}>{label}</label>{children}</div>;
}

// ── FINANCEIRO ──────────────────────────────────────────────
function FinanceiroPanel({ data, campanhas, flash }: { data: FinanceiroData; campanhas: Campanha[]; flash: (m: string) => void }) {
  const { rows, erro, stripeTestMode } = data;
  const [busy, setBusy] = useState<string>("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<FinanceiroRow | null>(null);
  const [, startT] = useTransition();

  const base = "https://dashboard.stripe.com" + (stripeTestMode ? "/test" : "");
  const stripeLink = (r: FinanceiroRow) =>
    r.stripe_subscription_id ? `${base}/subscriptions/${r.stripe_subscription_id}`
    : r.stripe_customer_id ? `${base}/customers/${r.stripe_customer_id}` : null;

  const mrrRow = (r: FinanceiroRow) => mensal(r.plan_id);
  const mrrTotal = rows.filter((r) => ["active", "trialing", "past_due"].includes(r.subscription_status ?? "")).reduce((s, r) => s + mrrRow(r), 0);
  const shown = rows.filter((r) => !q || (`${r.nome} ${r.email} ${r.plan_id ?? ""}`).toLowerCase().includes(q.toLowerCase()));

  async function cancelar(r: FinanceiroRow) {
    if (!confirm(`Cancelar a assinatura de ${r.email} ao fim do período atual? O acesso continua até ${r.current_period_end ? quando(r.current_period_end) : "o fim do ciclo"}.`)) return;
    setBusy(r.org_id);
    const res = await adminCancelarAssinatura(r.org_id);
    setBusy("");
    flash("error" in res && res.error ? res.error : "Cancelamento agendado. Recarregue para atualizar.");
  }
  async function reativar(r: FinanceiroRow) {
    setBusy(r.org_id);
    const res = await adminReativarAssinatura(r.org_id);
    setBusy("");
    flash("error" in res && res.error ? res.error : "Assinatura reativada. Recarregue para atualizar.");
  }

  return (
    <section className="panel">
      {erro && <div className="err">{erro}</div>}
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kn" style={{ fontSize: 24 }}>{formatBRL(mrrTotal)}</div><div className="kl">MRR estimado</div></div>
        <div className="kpi"><div className="kn">{rows.filter((r) => r.stripe_subscription_id).length}</div><div className="kl">Reais no Stripe</div></div>
        <div className="kpi"><div className="kn">{rows.filter((r) => r.cancel_at_period_end).length}</div><div className="kl">Cancelam no fim do ciclo</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 15, fontWeight: 600 }}>{stripeTestMode ? "Teste" : "Produção"}</div><div className="kl">Modo do Stripe</div></div>
      </div>

      <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
        <h3>Assinaturas</h3>
        <div className="search" style={{ maxWidth: 300, margin: 0 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
          <input placeholder="Buscar assinante…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
            <th style={{ padding: "12px 14px" }}>Assinante</th><th style={{ padding: "12px 14px" }}>Plano</th>
            <th style={{ padding: "12px 14px" }}>Situação</th><th style={{ padding: "12px 14px" }}>Renovação</th>
            <th style={{ padding: "12px 14px" }}>Stripe</th><th style={{ padding: "12px 14px" }}>Ações</th>
          </tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} style={{ padding: "28px 14px", textAlign: "center", color: "#6B7C93" }}>Nenhum assinante.</td></tr>}
            {shown.map((r) => {
              const real = !!r.stripe_subscription_id;
              const link = stripeLink(r);
              return (
                <tr key={r.org_id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                  <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600, color: "#10233F" }}>{r.nome.trim() || "—"}</div><div style={{ color: "#6B7C93" }}>{r.email}</div></td>
                  <td style={{ padding: "12px 14px" }}>{planoNome(r.plan_id)} · {formatBRL(mrrRow(r))}/mês</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className={"st " + (["active","trialing"].includes(r.subscription_status ?? "") ? "st-ok" : "st-urg")}>{STATUS_LABEL[r.subscription_status ?? ""] ?? r.subscription_status}</span>
                    {r.cancel_at_period_end && <div style={{ color: "#C0492E", fontSize: 12, marginTop: 2 }}>cancela no fim</div>}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#6B7C93", whiteSpace: "nowrap" }}>{r.current_period_end ? quando(r.current_period_end) : "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {real ? (link && <a href={link} target="_blank" rel="noreferrer" style={{ color: "#1FA89E", fontSize: 12.5, fontWeight: 600 }}>Abrir ↗</a>)
                          : <span title="Conta sem assinatura no Stripe (criada manualmente)" style={{ fontSize: 12, color: "#9AA7B8" }}>manual</span>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {r.cancel_at_period_end
                        ? <button onClick={() => startT(() => reativar(r))} disabled={!real || busy === r.org_id} style={{ ...btnGhost, opacity: real ? 1 : 0.5 }}>{busy === r.org_id ? "…" : "Reativar"}</button>
                        : <button onClick={() => startT(() => cancelar(r))} disabled={!real || busy === r.org_id} style={{ ...btnGhost, opacity: real ? 1 : 0.5 }}>{busy === r.org_id ? "…" : "Cancelar"}</button>}
                      {real && <button onClick={() => setSel(sel?.org_id === r.org_id ? null : r)} style={btnGhost}>{sel?.org_id === r.org_id ? "Fechar" : "Gerenciar"}</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sel && <GerenciarAssinante row={sel} campanhas={campanhas} flash={flash} onClose={() => setSel(null)} />}

      <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
        Cancelar agenda o encerramento para o fim do ciclo (reversível, não corta acesso na hora). Contas “manual” não têm assinatura no Stripe. Use “Gerenciar” para trocar plano, reembolsar ou aplicar cupom.
      </p>
    </section>
  );
}

// Painel de ações 1-a-1 sobre um assinante (troca de plano, reembolso, cupom).
function GerenciarAssinante({ row, campanhas, flash, onClose }: { row: FinanceiroRow; campanhas: Campanha[]; flash: (m: string) => void; onClose: () => void }) {
  const [novoPlano, setNovoPlano] = useState("");
  const [previa, setPrevia] = useState<string>("");
  const [valorReemb, setValorReemb] = useState("");
  const [cupom, setCupom] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [, startT] = useTransition();

  const planosAlvo = Object.keys(PLANS).filter((p) => p !== row.plan_id);
  const cuponsAtivos = campanhas.filter((c) => c.ativo && c.couponId);

  async function prever() {
    if (!novoPlano) return;
    setBusy("prev"); setPrevia("");
    const r = await adminPreverTrocaPlano(row.org_id, novoPlano);
    setBusy("");
    if (r.erro) { setPrevia(""); flash(r.erro); return; }
    const v = r.prorationCents ?? 0;
    setPrevia(v >= 0 ? `Cobrança agora: ${formatBRL(v)}` : `Crédito gerado: ${formatBRL(Math.abs(v))}`);
  }
  async function trocar() {
    if (!novoPlano) { flash("Escolha o novo plano."); return; }
    if (!confirm(`Trocar ${row.email} para ${PLANS[novoPlano].name}? ${previa || "A diferença será prorateada agora."}`)) return;
    setBusy("troca");
    const r = await adminTrocarPlano(row.org_id, novoPlano);
    setBusy("");
    flash("error" in r && r.error ? r.error : "Plano trocado. Recarregue para atualizar.");
  }
  async function reembolsar() {
    const parcial = valorReemb.trim() ? Math.round(Number(valorReemb.replace(",", ".")) * 100) : null;
    if (parcial !== null && (!parcial || parcial <= 0)) { flash("Valor de reembolso inválido."); return; }
    if (!confirm(parcial === null ? `Reembolsar TOTAL a última cobrança de ${row.email}?` : `Reembolsar ${formatBRL(parcial)} a ${row.email}?`)) return;
    setBusy("reemb");
    const r = await adminReembolsar(row.org_id, parcial);
    setBusy("");
    flash("error" in r && r.error ? r.error : "Reembolso solicitado ao Stripe.");
  }
  async function aplicarCupom() {
    if (!cupom) { flash("Escolha um cupom."); return; }
    if (!confirm(`Aplicar o cupom ${campanhas.find((c) => c.couponId === cupom)?.codigo ?? ""} a ${row.email}?`)) return;
    setBusy("cupom");
    const r = await adminAplicarCupom(row.org_id, cupom);
    setBusy("");
    flash("error" in r && r.error ? r.error : "Cupom aplicado.");
  }

  return (
    <div style={{ border: "1px solid #E6EBF2", borderRadius: 12, padding: 16, marginTop: 14, background: "#FAFBFD" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ color: "#10233F" }}>Gerenciar: {row.nome.trim() || row.email}</strong>
        <button onClick={onClose} style={btnGhost}>Fechar</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        {/* Trocar plano */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#4A5B72", marginBottom: 6 }}>Trocar plano</div>
          <select value={novoPlano} onChange={(e) => { setNovoPlano(e.target.value); setPrevia(""); }} style={inp}>
            <option value="">Escolher plano…</option>
            {planosAlvo.map((p) => <option key={p} value={p}>{PLANS[p].name} · {formatBRL(PLANS[p].amount)}/{PLANS[p].interval === "year" ? "ano" : "mês"}</option>)}
          </select>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => startT(prever)} disabled={!novoPlano || busy === "prev"} style={btnGhost}>{busy === "prev" ? "…" : "Prever valor"}</button>
            <button onClick={() => startT(trocar)} disabled={!novoPlano || busy === "troca"} style={btn}>{busy === "troca" ? "…" : "Trocar"}</button>
          </div>
          {previa && <div style={{ marginTop: 8, fontSize: 12.5, color: "#0F7A70" }}>{previa}</div>}
        </div>

        {/* Reembolso */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#4A5B72", marginBottom: 6 }}>Reembolso</div>
          <input value={valorReemb} onChange={(e) => setValorReemb(e.target.value)} placeholder="Valor em R$ (vazio = total)" style={inp} />
          <button onClick={() => startT(reembolsar)} disabled={busy === "reemb"} style={{ ...btn, marginTop: 8 }}>{busy === "reemb" ? "…" : "Reembolsar"}</button>
        </div>

        {/* Aplicar cupom */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#4A5B72", marginBottom: 6 }}>Aplicar cupom (cortesia)</div>
          <select value={cupom} onChange={(e) => setCupom(e.target.value)} style={inp}>
            <option value="">Escolher cupom…</option>
            {cuponsAtivos.map((c) => <option key={c.promoId} value={c.couponId}>{c.codigo} · {c.descontoLabel}</option>)}
          </select>
          <button onClick={() => startT(aplicarCupom)} disabled={!cupom || busy === "cupom"} style={{ ...btn, marginTop: 8 }}>{busy === "cupom" ? "…" : "Aplicar cupom"}</button>
          {cuponsAtivos.length === 0 && <div style={{ marginTop: 6, fontSize: 11.5, color: "#9AA7B8" }}>Crie cupons na aba Campanhas.</div>}
        </div>
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: "#6B7C93" }}>Troca de plano usa proração imediata. Reembolso age sobre a última cobrança paga. Toda ação fica na Auditoria.</p>
    </div>
  );
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
