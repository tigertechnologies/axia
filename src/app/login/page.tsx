"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import "../forms.css";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round"/><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4}/></svg>
          <span className="w">AXIA</span>
        </div>
        <h1>Entrar</h1>
        <p className="subt">Acesse sua central inteligente de perícias.</p>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>E-mail</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></div>
          <div className="field"><label>Senha</label><input type="password" value={senha} onChange={(e)=>setSenha(e.target.value)} required/></div>
          <button className="btn-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
        </form>
        <p className="auth-foot" style={{ marginTop: 14 }}><Link href="/esqueci-senha">Esqueci minha senha</Link></p>
        <p className="auth-foot">Ainda não tem conta? <Link href="/cadastro">Criar conta</Link></p>
      </div>
    </div>
  );
}

export default function Login(){ return <Suspense><Form/></Suspense>; }
