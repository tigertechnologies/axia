"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convidarMembro, mudarPapel, removerMembro } from "@/app/actions/equipe";
import { PAPEIS, PAPEL_LABEL, type Membro } from "@/app/actions/equipe-const";

export default function EquipeClient({ membros, souDono }: { membros: Membro[]; souDono: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("assistente");
  const [msg, setMsg] = useState("");
  const [, startT] = useTransition();

  async function convidar() {
    setMsg("");
    const r = await convidarMembro(email, papel);
    if (r.error) { setMsg(r.error); return; }
    setEmail(""); setMsg("Convite registrado."); router.refresh();
  }
  async function trocar(id: string, novo: string) { await mudarPapel(id, novo); router.refresh(); }
  async function remover(id: string) { if (!confirm("Remover este membro?")) return; await removerMembro(id); router.refresh(); }

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Equipe</h1><p className="sum">Convide colegas e defina o que cada um pode fazer na sua organização.</p></div>
      </div>

      {souDono && (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-h"><h3>Convidar membro</h3></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail@exemplo.com" type="email"
              style={{ flex: 1, minWidth: 220, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 9, fontSize: 14, background: "var(--panel)", color: "var(--ink)", fontFamily: "'Inter',sans-serif" }} />
            <select value={papel} onChange={(e) => setPapel(e.target.value)} style={{ padding: "10px", border: "1px solid var(--line)", borderRadius: 9, fontSize: 13.5, background: "var(--panel)", color: "var(--ink)", fontFamily: "'Inter',sans-serif" }}>
              {PAPEIS.map((p) => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
            </select>
            <button onClick={() => startT(convidar)} style={{ padding: "10px 18px", border: "1px solid #16305B", background: "#16305B", color: "#fff", borderRadius: 9, cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>Convidar</button>
          </div>
          {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: msg.includes("registrado") ? "#0F7A70" : "#C0492E" }}>{msg}</div>}
        </section>
      )}

      <section className="panel">
        <div className="panel-h"><h3>Membros ({membros.length})</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "12px 14px" }}>Membro</th><th style={{ padding: "12px 14px" }}>Papel</th><th style={{ padding: "12px 14px" }}>Status</th><th style={{ padding: "12px 14px" }}></th>
            </tr></thead>
            <tbody>
              {membros.map((m, i) => (
                <tr key={m.id ?? "dono-" + i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 14px", color: "var(--ink)" }}>{m.email ?? m.convidado_email ?? "—"}{m.ehDono && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--muted)" }}>(você)</span>}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {m.ehDono ? <b style={{ color: "var(--ink)" }}>{PAPEL_LABEL[m.papel]}</b> : souDono && m.id ? (
                      <select value={m.papel} onChange={(e) => startT(() => trocar(m.id!, e.target.value))} style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, background: "var(--panel)", color: "var(--ink)" }}>
                        {PAPEIS.map((p) => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
                      </select>
                    ) : PAPEL_LABEL[m.papel]}
                  </td>
                  <td style={{ padding: "12px 14px" }}><span className={"st " + (m.status === "ativo" ? "st-ok" : "st-val")}>{m.status === "convidado" ? "Convidado" : m.status === "suspenso" ? "Suspenso" : "Ativo"}</span></td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {souDono && !m.ehDono && m.id && <button onClick={() => startT(() => remover(m.id!))} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }} aria-label="Remover">×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--muted)" }}>
          Convidados aparecem por e-mail. O vínculo definitivo (login do convidado acessar a organização) será ativado quando o fluxo de aceite estiver ligado — a estrutura de papéis e permissões já está pronta.
        </p>
      </section>
    </>
  );
}
