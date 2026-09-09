"use client";
import { useState } from "react";
import Link from "next/link";
import { submitLead } from "./actions";
import "../forms.css";

export default function Contato() {
  const [f, setF] = useState({ nome: "", email: "", telefone: "", mensagem: "", hp: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const r = await submitLead(f);
    setLoading(false);
    if ("error" in r && r.error) { setErr(r.error); return; }
    setEnviado(true);
  }

  const brand = (
    <div className="auth-brand">
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round" /><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4} /></svg>
      <span className="w">AXIA</span>
    </div>
  );

  if (enviado) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          {brand}
          <h1>Recebemos seu contato</h1>
          <p className="subt">Obrigado, <b>{f.nome}</b>. Nossa equipe vai retornar no e-mail informado.</p>
          <p className="auth-foot"><Link href="/">Voltar ao início</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {brand}
        <h1>Fale com a AXIA</h1>
        <p className="subt">Deixe seus dados e a gente entra em contato para tirar suas dúvidas.</p>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Nome</label><input value={f.nome} onChange={on("nome")} required /></div>
          <div className="field"><label>E-mail</label><input type="email" value={f.email} onChange={on("email")} required /></div>
          <div className="field"><label>Telefone (opcional)</label><input value={f.telefone} onChange={on("telefone")} /></div>
          <div className="field"><label>Mensagem (opcional)</label><textarea value={f.mensagem} onChange={on("mensagem")} rows={4} style={{ resize: "vertical", fontFamily: "'Inter',sans-serif" }} /></div>
          {/* Honeypot anti-bot: oculto para humanos. */}
          <input type="text" value={f.hp} onChange={on("hp")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />
          <button className="btn-full" disabled={loading}>{loading ? "Enviando…" : "Enviar"}</button>
        </form>
        <p className="auth-foot">Prefere começar agora? <Link href="/cadastro">Criar conta</Link></p>
      </div>
    </div>
  );
}
