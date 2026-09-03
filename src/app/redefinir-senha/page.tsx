"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import "../forms.css";

export default function RedefinirSenha() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // Ao chegar pelo link do e-mail, o Supabase cria uma sessão de recuperação.
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (senha.length < 8) { setErr("A senha deve ter ao menos 8 caracteres."); return; }
    if (senha !== senha2) { setErr("As senhas não coincidem."); return; }
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round"/><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4}/></svg>
          <span className="w">AXIA</span>
        </div>
        <h1>Definir nova senha</h1>

        {done ? (
          <div className="note">Senha alterada com sucesso. Redirecionando…</div>
        ) : !ready ? (
          <>
            <p className="subt">Abra esta página pelo link enviado ao seu e-mail. O link é válido por tempo limitado.</p>
            <p className="auth-foot"><Link href="/esqueci-senha">Reenviar link</Link></p>
          </>
        ) : (
          <>
            <p className="subt">Escolha uma senha forte (mínimo 8 caracteres).</p>
            {err && <div className="err">{err}</div>}
            <form onSubmit={submit}>
              <div className="field"><label>Nova senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} required /></div>
              <div className="field"><label>Confirmar nova senha</label><input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} minLength={8} required /></div>
              <button className="btn-full" disabled={loading}>{loading ? "Salvando…" : "Salvar nova senha"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
