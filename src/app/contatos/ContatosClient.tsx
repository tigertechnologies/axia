"use client";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { salvarContato, excluirContato } from "@/app/actions/contatos";
import { TIPOS_CONTATO, TIPO_CONTATO_LABEL, type Contato } from "@/app/actions/contatos-const";

const VAZIO: Partial<Contato> & { nome: string } = { nome: "", tipo: "advogado", organizacao: "", email: "", telefone: "", oab: "", cidade: "", uf: "", observacoes: "" };

export default function ContatosClient({ contatosIniciais }: { contatosIniciais: Contato[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState<(Partial<Contato> & { nome: string }) | null>(null);
  const [msg, setMsg] = useState("");
  const [, startT] = useTransition();

  const filtrados = useMemo(() => contatosIniciais.filter((c) => {
    if (filtroTipo !== "todos" && c.tipo !== filtroTipo) return false;
    if (!q) return true;
    return `${c.nome} ${c.organizacao ?? ""} ${c.email ?? ""} ${c.oab ?? ""}`.toLowerCase().includes(q.toLowerCase());
  }), [contatosIniciais, q, filtroTipo]);

  async function salvar() {
    if (!form) return;
    setMsg("");
    const r = await salvarContato(form);
    if (r.error) { setMsg("Não foi possível salvar."); return; }
    setForm(null); router.refresh();
  }
  async function remover(id: string) { if (!confirm("Excluir este contato?")) return; await excluirContato(id); router.refresh(); }

  const set = (k: keyof Contato, v: string) => setForm((f) => f ? { ...f, [k]: v } : f);

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Contatos</h1><p className="sum">Advogados, partes, escritórios e instituições da sua rotina pericial.</p></div>
        <div className="greet-actions"><button className="btn btn-primary" onClick={() => setForm({ ...VAZIO })}>+ Novo contato</button></div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <button className={"tsk-tab" + (filtroTipo === "todos" ? " on" : "")} onClick={() => setFiltroTipo("todos")}>Todos</button>
        {TIPOS_CONTATO.map((t) => <button key={t} className={"tsk-tab" + (filtroTipo === t ? " on" : "")} onClick={() => setFiltroTipo(t)}>{TIPO_CONTATO_LABEL[t]}</button>)}
        <div className="search" style={{ maxWidth: 260, margin: 0, marginLeft: "auto" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
          <input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* Formulário */}
      {form && (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-h"><h3>{form.id ? "Editar contato" : "Novo contato"}</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            <Campo label="Nome"><input value={form.nome} onChange={(e) => set("nome", e.target.value)} style={inp} /></Campo>
            <Campo label="Tipo"><select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inp}>{TIPOS_CONTATO.map((t) => <option key={t} value={t}>{TIPO_CONTATO_LABEL[t]}</option>)}</select></Campo>
            <Campo label="Organização / escritório"><input value={form.organizacao ?? ""} onChange={(e) => set("organizacao", e.target.value)} style={inp} /></Campo>
            <Campo label="E-mail"><input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} style={inp} /></Campo>
            <Campo label="Telefone"><input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} style={inp} /></Campo>
            <Campo label="OAB"><input value={form.oab ?? ""} onChange={(e) => set("oab", e.target.value)} style={inp} /></Campo>
            <Campo label="Cidade"><input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} style={inp} /></Campo>
            <Campo label="UF"><input value={form.uf ?? ""} onChange={(e) => set("uf", e.target.value)} maxLength={2} style={inp} /></Campo>
            <div style={{ gridColumn: "1 / -1" }}><Campo label="Observações"><input value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} style={inp} /></Campo></div>
          </div>
          {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: "#C0492E" }}>{msg}</div>}
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={() => startT(salvar)}>Salvar</button>
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </section>
      )}

      {/* Lista */}
      <section className="panel">
        <div className="panel-h"><h3>{filtrados.length} contato(s)</h3></div>
        {filtrados.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum contato.</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{c.nome} <span className="tsk-prio p-normal" style={{ fontSize: 10 }}>{TIPO_CONTATO_LABEL[c.tipo]}</span></div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{[c.organizacao, c.oab && `OAB ${c.oab}`, c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.cidade].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--muted)" }}>{[c.email, c.telefone].filter(Boolean).join(" · ")}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn-act" onClick={() => setForm({ ...c })}>Editar</button>
                    <button className="btn-act" onClick={() => startT(() => remover(c.id))} style={{ marginLeft: 6 }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 13.5, background: "var(--panel)", color: "var(--ink)", boxSizing: "border-box" };
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>{label}</label>{children}</div>;
}
