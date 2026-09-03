"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import "../forms.css";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const supabase = createSupabaseBrowser();
    const site = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/redefinir-senha`,
    });
    setLoading(false);
    // Não revela se o e-mail existe (evita enumeração de contas).
    if (error && !/rate|limit/i.test(error.message)) { setErr(error.message); return; }
    setSent(true);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round"/><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4}/></svg>
          <span className="w">AXIA</span>
        </div>
        <h1>Recuperar senha</h1>
        <p className="subt">Enviaremos um link de redefinição para o seu e-mail.</p>

        {sent ? (
          <>
            <div className="note">Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique sua caixa de entrada e o spam.</div>
            <p className="auth-foot"><Link href="/login">Voltar para entrar</Link></p>
          </>
        ) : (
          <>
            {err && <div className="err">{err}</div>}
            <form onSubmit={submit}>
              <div className="field"><label>E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <button className="btn-full" disabled={loading}>{loading ? "Enviando…" : "Enviar link de redefinição"}</button>
            </form>
            <p className="auth-foot">Lembrou a senha? <Link href="/login">Entrar</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
