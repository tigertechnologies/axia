"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function SegurancaClient({ email }: { email: string | null }) {
  const [temMfa, setTemMfa] = useState<boolean | null>(null);
  const [enroll, setEnroll] = useState<{ qr: string; secret: string; factorId: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const supabase = createSupabaseBrowser();

  // Verifica se o usuário já tem MFA ativo.
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setTemMfa(!!(data?.totp && data.totp.length > 0));
    }).catch(() => setTemMfa(false));
  }, []);

  async function iniciarMfa() {
    setBusy(true); setMsg("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) {
      setMsg(error.message.includes("MFA") || error.message.includes("disabled")
        ? "O 2FA (MFA) precisa estar habilitado no painel do Supabase (Authentication → MFA) para ativar aqui."
        : "Não foi possível iniciar: " + error.message);
      return;
    }
    if (data) setEnroll({ qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
  }

  async function confirmarMfa() {
    if (!enroll || !codigo.trim()) return;
    setBusy(true); setMsg("");
    const { data: chal, error: e1 } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (e1 || !chal) { setBusy(false); setMsg("Erro ao validar. Tente de novo."); return; }
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: chal.id, code: codigo.trim() });
    setBusy(false);
    if (e2) { setMsg("Código incorreto. Confira no seu app autenticador."); return; }
    setTemMfa(true); setEnroll(null); setCodigo(""); setMsg("2FA ativado com sucesso!");
  }

  async function desativarMfa() {
    if (!confirm("Desativar a autenticação em dois fatores?")) return;
    setBusy(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const f = data?.totp?.[0];
    if (f) await supabase.auth.mfa.unenroll({ factorId: f.id });
    setBusy(false); setTemMfa(false); setMsg("2FA desativado.");
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Segurança</h1><p className="sum">Proteja sua conta com autenticação em dois fatores e boas práticas.</p></div>
      </div>

      {/* 2FA */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h" style={{ justifyContent: "space-between" }}>
          <h3>Autenticação em dois fatores (2FA)</h3>
          {temMfa === true && <span className="st st-ok">✓ Ativo</span>}
          {temMfa === false && <span className="st st-val">Inativo</span>}
        </div>

        {temMfa === null && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Verificando…</p>}

        {temMfa === false && !enroll && (
          <>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
              O 2FA adiciona uma camada extra de proteção: além da senha, será pedido um código do seu app autenticador (Google Authenticator, Authy…) a cada login.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={iniciarMfa} disabled={busy}>{busy ? "Iniciando…" : "Ativar 2FA"}</button>
          </>
        )}

        {enroll && (
          <div>
            <p style={{ fontSize: 13.5, color: "var(--ink)", marginBottom: 12 }}>1. Escaneie o QR code no seu app autenticador:</p>
            <div dangerouslySetInnerHTML={{ __html: enroll.qr }} style={{ background: "#fff", padding: 12, borderRadius: 10, display: "inline-block" }} />
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Ou digite o código manual: <code style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>{enroll.secret}</code></p>
            <p style={{ fontSize: 13.5, color: "var(--ink)", margin: "16px 0 8px" }}>2. Digite o código de 6 dígitos gerado:</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 9, fontSize: 18, letterSpacing: "4px", width: 140, textAlign: "center", background: "var(--panel)", color: "var(--ink)" }} />
              <button className="btn btn-primary" onClick={confirmarMfa} disabled={busy || codigo.length !== 6}>Confirmar</button>
              <button className="btn btn-ghost" onClick={() => setEnroll(null)}>Cancelar</button>
            </div>
          </div>
        )}

        {temMfa === true && (
          <>
            <p style={{ fontSize: 13.5, color: "var(--muted)" }}>Sua conta está protegida com 2FA. A cada login, será pedido o código do autenticador.</p>
            <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={desativarMfa} disabled={busy}>Desativar 2FA</button>
          </>
        )}

        {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.includes("sucesso") || msg.includes("ativado") ? "#0F7A70" : "#C0492E" }}>{msg}</div>}
      </section>

      {/* Boas práticas */}
      <section className="panel">
        <div className="panel-h"><h3>Sua conta</h3></div>
        <div className="jk-d-row"><span>E-mail</span><b>{email ?? "—"}</b></div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.7 }}>
          <b>Boas práticas:</b> use uma senha forte e única, ative o 2FA, não compartilhe seu acesso, e saia da conta em computadores públicos. Todas as ações importantes na AXIA (validação de laudo, exclusões, mudanças de permissão) ficam registradas em auditoria.
        </p>
      </section>
    </>
  );
}
