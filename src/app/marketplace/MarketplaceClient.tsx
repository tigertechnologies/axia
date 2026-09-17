"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPerfil, buscarDiretorio, type PerfilPerito, type PeritoDiretorio } from "@/app/actions/marketplace";

const AREAS = ["Trabalhista", "Cível", "Previdenciário", "Criminal", "Família", "Trânsito", "Ambiental"];

export default function MarketplaceClient({ perfilInicial, nomePadrao }: { perfilInicial: PerfilPerito | null; nomePadrao: string }) {
  const router = useRouter();
  const [aba, setAba] = useState<"perfil" | "buscar">("perfil");
  const [p, setP] = useState<PerfilPerito>(perfilInicial ?? {
    nome: nomePadrao, crm: "", uf_crm: "", rqe: "", especialidade: "", areas_periciais: [],
    cidade: "", uf: "", regioes: [], mini_curriculo: "", disponivel: true,
    contato_autorizado: false, email_contato: "", telefone_contato: "", publicado: false, verificado: "nao",
  });
  const [msg, setMsg] = useState("");
  const [, startT] = useTransition();

  const set = (k: keyof PerfilPerito, v: any) => setP({ ...p, [k]: v });
  function toggleArea(a: string) {
    const has = p.areas_periciais.includes(a);
    set("areas_periciais", has ? p.areas_periciais.filter((x) => x !== a) : [...p.areas_periciais, a]);
  }
  async function salvar() {
    setMsg("");
    const r = await salvarPerfil(p);
    if (r.error) { setMsg("Não foi possível salvar."); return; }
    setMsg("Perfil salvo."); router.refresh();
  }

  // Busca
  const [filtros, setFiltros] = useState({ termo: "", especialidade: "", uf: "" });
  const [resultados, setResultados] = useState<PeritoDiretorio[]>([]);
  const [buscou, setBuscou] = useState(false);
  async function buscar() {
    const r = await buscarDiretorio(filtros);
    setResultados(r); setBuscou(true);
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Marketplace de Peritos</h1><p className="sum">Seja encontrado por advogados e tribunais, ou encontre colegas por especialidade e região.</p></div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "1px solid var(--line)" }}>
        {([["perfil","Meu perfil"],["buscar","Encontrar peritos"]] as ["perfil"|"buscar",string][]).map(([id,l]) => (
          <button key={id} onClick={() => setAba(id)} style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: aba === id ? 700 : 500, color: aba === id ? "var(--ink)" : "var(--muted)", borderBottom: aba === id ? "2px solid #1FA89E" : "2px solid transparent", marginBottom: -1 }}>{l}</button>
        ))}
      </div>

      {aba === "perfil" && (
        <>
          <section className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-h" style={{ justifyContent: "space-between" }}>
              <h3>Perfil profissional</h3>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: "var(--ink)", cursor: "pointer" }}>
                <input type="checkbox" checked={p.publicado} onChange={(e) => set("publicado", e.target.checked)} style={{ width: 16, height: 16 }} />
                Publicar no diretório
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><L label="Nome completo"><input value={p.nome} onChange={(e) => set("nome", e.target.value)} style={inp} /></L></div>
              <L label="CRM"><input value={p.crm ?? ""} onChange={(e) => set("crm", e.target.value)} style={inp} /></L>
              <L label="UF do CRM"><input value={p.uf_crm ?? ""} onChange={(e) => set("uf_crm", e.target.value)} maxLength={2} style={inp} /></L>
              <L label="RQE (se houver)"><input value={p.rqe ?? ""} onChange={(e) => set("rqe", e.target.value)} style={inp} /></L>
              <L label="Especialidade"><input value={p.especialidade ?? ""} onChange={(e) => set("especialidade", e.target.value)} placeholder="Ex.: Ortopedia" style={inp} /></L>
              <L label="Cidade"><input value={p.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} style={inp} /></L>
              <L label="UF"><input value={p.uf ?? ""} onChange={(e) => set("uf", e.target.value)} maxLength={2} style={inp} /></L>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>Áreas periciais</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {AREAS.map((a) => <button key={a} onClick={() => toggleArea(a)} className={"tsk-tab" + (p.areas_periciais.includes(a) ? " on" : "")}>{a}</button>)}
              </div>
            </div>
            <div style={{ marginTop: 14 }}><L label="Mini currículo"><textarea value={p.mini_curriculo ?? ""} onChange={(e) => set("mini_curriculo", e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Breve resumo da sua experiência pericial." /></L></div>
          </section>

          <section className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-h"><h3>Contato</h3></div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: "var(--ink)", cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={p.contato_autorizado} onChange={(e) => set("contato_autorizado", e.target.checked)} style={{ width: 16, height: 16 }} />
              Autorizo mostrar meu contato no diretório público
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <L label="E-mail de contato"><input value={p.email_contato ?? ""} onChange={(e) => set("email_contato", e.target.value)} style={inp} /></L>
              <L label="Telefone de contato"><input value={p.telefone_contato ?? ""} onChange={(e) => set("telefone_contato", e.target.value)} style={inp} /></L>
            </div>
          </section>

          {msg && <div style={{ marginBottom: 12, fontSize: 13, color: msg.includes("salvo") ? "#0F7A70" : "#C0492E" }}>{msg}</div>}
          <button className="btn btn-primary" onClick={() => startT(salvar)}>Salvar perfil</button>
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>Diretório sem cobrança — apenas visibilidade profissional. Seu contato só aparece se você autorizar acima. A verificação do perfil é feita pela equipe AXIA.</p>
        </>
      )}

      {aba === "buscar" && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <input placeholder="Nome ou palavra…" value={filtros.termo} onChange={(e) => setFiltros({ ...filtros, termo: e.target.value })} style={{ ...inp, maxWidth: 220 }} />
            <input placeholder="Especialidade" value={filtros.especialidade} onChange={(e) => setFiltros({ ...filtros, especialidade: e.target.value })} style={{ ...inp, maxWidth: 180 }} />
            <input placeholder="UF" value={filtros.uf} onChange={(e) => setFiltros({ ...filtros, uf: e.target.value.toUpperCase() })} maxLength={2} style={{ ...inp, maxWidth: 80 }} />
            <button className="btn btn-primary" onClick={() => startT(buscar)}>Buscar</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
            {resultados.map((r) => (
              <div key={r.id} className="panel" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{r.nome}</div>
                  {r.verificado === "verificado" && <span className="st st-ok">✓ Verificado</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>{[r.especialidade, r.crm && `CRM ${r.crm}${r.uf_crm ? "/" + r.uf_crm : ""}`, r.cidade && r.uf ? `${r.cidade}/${r.uf}` : r.uf].filter(Boolean).join(" · ")}</div>
                {r.areas_periciais && r.areas_periciais.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{r.areas_periciais.map((a) => <span key={a} className="tsk-prio p-normal" style={{ fontSize: 10 }}>{a}</span>)}</div>}
                {r.mini_curriculo && <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>{r.mini_curriculo}</p>}
                {r.contato_autorizado && (r.email_contato || r.telefone_contato) && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink)" }}>
                    {r.email_contato && <div>✉ {r.email_contato}</div>}{r.telefone_contato && <div>📞 {r.telefone_contato}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
          {buscou && resultados.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum perito encontrado com esses filtros.</p>}
          {!buscou && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Use os filtros acima para encontrar peritos publicados no diretório.</p>}
        </>
      )}
    </>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 13.5, background: "var(--panel)", color: "var(--ink)", boxSizing: "border-box" };
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>{label}</label>{children}</div>;
}
