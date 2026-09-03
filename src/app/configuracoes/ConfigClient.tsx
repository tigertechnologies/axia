"use client";
import { useState } from "react";
import { openBillingPortal, deleteAccount } from "./actions";
import { signOut } from "../dashboard/actions";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa", trialing: "Em teste", past_due: "Pagamento pendente",
  canceled: "Cancelada", unpaid: "Não paga", pending_subscription: "Sem assinatura",
  suspended: "Suspensa", expired: "Expirada",
};

export default function ConfigClient({ email, nome, crm, uf, especialidade, planLabel, status }:
  { email: string; nome: string; crm: string; uf: string; especialidade: string; planLabel: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [delLoading, setDelLoading] = useState(false);
  const [delErr, setDelErr] = useState("");

  async function excluir() {
    setDelErr(""); setDelLoading(true);
    const r = await deleteAccount(confirmText);
    setDelLoading(false);
    if (r && "error" in r) setDelErr(r.error === "confirm_mismatch" ? "Digite EXCLUIR para confirmar." : "Não foi possível excluir. Tente novamente.");
    // sucesso → redireciona no servidor
  }

  async function portal() {
    setErr(""); setLoading(true);
    const r = await openBillingPortal();
    setLoading(false);
    if ("error" in r) {
      setErr(r.error === "no_customer" ? "Nenhuma assinatura encontrada para gerenciar." : "Não foi possível abrir o portal. O Portal de Cobrança precisa estar ativado no Stripe.");
      return;
    }
    window.location.href = r.url!;
  }

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #E6EBF2", borderRadius: 16, padding: 22, marginBottom: 18 };
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F0F3F7", fontSize: 14.5 };

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div><h1>Configurações</h1><p className="sum">Sua conta, perfil e assinatura.</p></div>
      </div>

      <div style={card}>
        <h3 style={{ fontFamily: "'Sora',sans-serif", color: "#10233F", marginBottom: 10 }}>Perfil</h3>
        <div style={row}><span style={{ color: "#6B7C93" }}>Nome</span><b>{nome || "—"}</b></div>
        <div style={row}><span style={{ color: "#6B7C93" }}>E-mail</span><b>{email}</b></div>
        <div style={row}><span style={{ color: "#6B7C93" }}>CRM · UF</span><b>{crm || "—"} · {uf || "—"}</b></div>
        <div style={{ ...row, borderBottom: 0 }}><span style={{ color: "#6B7C93" }}>Especialidade</span><b>{especialidade || "—"}</b></div>
      </div>

      <div style={card}>
        <h3 style={{ fontFamily: "'Sora',sans-serif", color: "#10233F", marginBottom: 10 }}>Assinatura</h3>
        <div style={row}><span style={{ color: "#6B7C93" }}>Plano</span><b>{planLabel}</b></div>
        <div style={{ ...row, borderBottom: 0 }}><span style={{ color: "#6B7C93" }}>Situação</span><b>{STATUS_LABEL[status] ?? status}</b></div>
        {err && <div className="attn" style={{ marginTop: 14 }}><div className="at-txt"><p>{err}</p></div></div>}
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={portal} disabled={loading}>
          {loading ? "Abrindo…" : "Gerenciar assinatura (cancelar, trocar plano, cartão)"}
        </button>
        <p style={{ fontSize: 12.5, color: "#6B7C93", marginTop: 10 }}>Cancelamento, mudança de plano e troca de cartão são feitos no portal seguro do Stripe.</p>
      </div>

      <div style={card}>
        <h3 style={{ fontFamily: "'Sora',sans-serif", color: "#10233F", marginBottom: 10 }}>Conta</h3>
        <form action={signOut}><button className="btn btn-ghost" type="submit">Sair da conta</button></form>
        <p style={{ fontSize: 12.5, color: "#6B7C93", marginTop: 12 }}>Troca de senha: use “Esqueci minha senha” na tela de login.</p>
      </div>

      <div style={{ ...card, borderColor: "#F3D9CE", background: "#FFF9F7" }}>
        <h3 style={{ fontFamily: "'Sora',sans-serif", color: "#8f3b25", marginBottom: 6 }}>Excluir conta</h3>
        <p style={{ fontSize: 13.5, color: "#a05a44", marginBottom: 12 }}>
          A exclusão é permanente e remove seus dados da AXIA. Sua assinatura ativa será cancelada no provedor de pagamento. Períodos já pagos seguem as condições do plano.
        </p>
        {!delOpen ? (
          <button className="btn-back" style={{ borderColor: "#E0A99A", color: "#C0492E" }} onClick={() => setDelOpen(true)}>Excluir minha conta</button>
        ) : (
          <div>
            {delErr && <div className="err">{delErr}</div>}
            <p style={{ fontSize: 13.5, marginBottom: 8 }}>Para confirmar, digite <b>EXCLUIR</b>:</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="EXCLUIR"
              style={{ padding: "10px 12px", border: "1px solid #E4E9F0", borderRadius: 10, fontFamily: "'Inter',sans-serif", marginRight: 10 }} />
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button className="btn-back" onClick={() => { setDelOpen(false); setConfirmText(""); setDelErr(""); }} disabled={delLoading}>Cancelar</button>
              <button className="btn-full" style={{ width: "auto", padding: "12px 20px", background: "#C0492E" }} onClick={excluir} disabled={delLoading || confirmText !== "EXCLUIR"}>{delLoading ? "Excluindo…" : "Excluir permanentemente"}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
