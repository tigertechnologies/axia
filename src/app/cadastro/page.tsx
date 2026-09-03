"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import "../forms.css";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") || "pro_monthly";
  const [f, setF] = useState({ nome: "", sobrenome: "", email: "", telefone: "", senha: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.senha,
      options: { data: { nome: f.nome, sobrenome: f.sobrenome, telefone: f.telefone } },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    // Se a confirmação de e-mail estiver ativa, não há sessão ainda:
    // mostra "confira seu e-mail" em vez de empurrar para o checkout (que exige sessão).
    if (!data.session) { setConfirmSent(true); return; }
    router.push(`/checkout?plan=${plan}`);
  }

  if (confirmSent) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-brand">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round"/><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4}/></svg>
            <span className="w">AXIA</span>
          </div>
          <h1>Confirme seu e-mail</h1>
          <p className="subt">Enviamos um link de confirmação para <b>{f.email}</b>. Confirme para ativar sua conta e seguir para o pagamento.</p>
          <div className="note">Não recebeu? Verifique o spam. O link pode levar alguns minutos.</div>
          <p className="auth-foot"><Link href="/login">Ir para o login</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round" /><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4} /></svg>
          <span className="w">AXIA</span>
        </div>
        <h1>Crie sua conta</h1>
        <p className="subt">Leva menos de um minuto. O onboarding fica para depois do pagamento.</p>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          <div className="grid2">
            <div className="field"><label>Nome</label><input value={f.nome} onChange={on("nome")} required /></div>
            <div className="field"><label>Sobrenome</label><input value={f.sobrenome} onChange={on("sobrenome")} required /></div>
          </div>
          <div className="field"><label>E-mail</label><input type="email" value={f.email} onChange={on("email")} required /></div>
          <div className="field"><label>Telefone</label><input value={f.telefone} onChange={on("telefone")} /></div>
          <div className="field"><label>Senha</label><input type="password" value={f.senha} onChange={on("senha")} minLength={8} required /></div>
          <button className="btn-full" disabled={loading}>{loading ? "Criando…" : "Continuar para o pagamento"}</button>
        </form>
        <p className="auth-foot">Já tem conta? <Link href="/login">Entrar</Link></p>
      </div>
    </div>
  );
}

export default function Cadastro() {
  return <Suspense><Form /></Suspense>;
}
