"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { descadastrar } from "./actions";
import "../forms.css";

function Conteudo() {
  const params = useSearchParams();
  const email = params.get("e") || "";
  const token = params.get("t") || "";
  const [estado, setEstado] = useState<"idle" | "loading" | "ok" | "erro">("idle");
  const [msg, setMsg] = useState("");

  async function confirmar() {
    setEstado("loading");
    const r = await descadastrar(email, token);
    if (r.ok) setEstado("ok");
    else { setEstado("erro"); setMsg(r.error || "Erro."); }
  }

  const brand = (
    <div className="auth-brand">
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round" /><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4} /></svg>
      <span className="w">AXIA</span>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {brand}
        {estado === "ok" ? (
          <>
            <h1>Descadastro concluído</h1>
            <p className="subt">O e-mail <b>{email}</b> não receberá mais mensagens de marketing da AXIA.</p>
            <p className="auth-foot"><Link href="/">Voltar ao início</Link></p>
          </>
        ) : (
          <>
            <h1>Descadastrar</h1>
            <p className="subt">Confirme que não deseja mais receber e-mails de marketing da AXIA em <b>{email || "seu e-mail"}</b>.</p>
            {estado === "erro" && <div className="err">{msg}</div>}
            <button className="btn-full" onClick={confirmar} disabled={estado === "loading" || !email || !token}>
              {estado === "loading" ? "Processando…" : "Confirmar descadastro"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Descadastrar() { return <Suspense><Conteudo /></Suspense>; }
