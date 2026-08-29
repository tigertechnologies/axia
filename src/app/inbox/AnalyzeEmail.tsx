"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeEmail } from "../actions/ingest";
import "../forms.css";

const LABEL: Record<string, string> = {
  nomeacao: "Nova nomeação", prazo: "Prazo", intimacao: "Intimação",
  honorarios: "Honorários", pericia: "Perícia", esclarecimento: "Esclarecimento",
};

export default function AnalyzeEmail() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<null | { category: string; process_ref: string | null; confidence: number; extras: string[] }>(null);

  function reset() { setText(""); setErr(""); setRes(null); }

  async function analisar() {
    setErr(""); setLoading(true);
    const r = await analyzeEmail(text);
    setLoading(false);
    if ("error" in r) { setErr(r.error === "not_authenticated" ? "Sessão expirada." : r.error || "Erro."); return; }
    setRes({ category: r.category, process_ref: r.process_ref, confidence: r.confidence, extras: r.extras });
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => { reset(); setOpen(true); }}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 4.5h11M2 8h11M2 11.5h7" strokeLinecap="round" /></svg>
        Analisar e-mail
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(16,35,63,.45)", zIndex: 100, display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 18, boxShadow: "0 24px 60px rgba(16,35,63,.2)", padding: 26 }}>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, color: "#10233F", fontWeight: 600 }}>Analisar e-mail</h2>
            <p style={{ color: "#6B7C93", fontSize: 13.5, margin: "4px 0 18px" }}>Cole o conteúdo de um e-mail de tribunal, advogado ou intimação. A AXIA identifica o tipo, o processo e cria os itens automaticamente.</p>

            {err && <div className="err">{err}</div>}

            {!res ? (
              <>
                <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Cole aqui o texto do e-mail…\n\nEx.: \"Fica V.Sa. nomeado perito no processo 1002345-67.2025 da 2ª Vara Cível. Prazo de 15 dias para entrega do laudo.\""}
                  style={{ width: "100%", minHeight: 180, padding: "12px 14px", border: "1px solid #E4E9F0", borderRadius: 12, fontFamily: "'Inter',sans-serif", fontSize: 14, color: "#28374D", outline: "none", resize: "vertical" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                  <button className="btn-back" onClick={() => setOpen(false)} disabled={loading}>Cancelar</button>
                  <button className="btn-full" style={{ width: "auto", padding: "12px 22px" }} onClick={analisar} disabled={loading || !text.trim()}>{loading ? "Analisando…" : "Analisar com a AXIA"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="note" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="18" height="18" fill="none" stroke="#127c74" strokeWidth={2}><path d="M2 9.5l4 4L16 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Comunicação classificada e adicionada à sua Inbox.
                </div>
                <div style={{ background: "#F7F8FA", border: "1px solid #E4E9F0", borderRadius: 12, padding: 16, marginTop: 14, fontSize: 14 }}>
                  <div style={{ marginBottom: 8 }}><b>Tipo identificado:</b> {LABEL[res.category] ?? res.category} <span style={{ color: "#6B7C93" }}>({res.confidence}% de confiança)</span></div>
                  <div style={{ marginBottom: 8 }}><b>Processo:</b> {res.process_ref ?? "não identificado"}</div>
                  {res.extras.length > 0 && <div style={{ color: "#127c74" }}>✓ Também: {res.extras.join(" · ")}</div>}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                  <button className="btn-back" onClick={reset}>Analisar outro</button>
                  <button className="btn-full" style={{ width: "auto", padding: "12px 22px" }} onClick={() => setOpen(false)}>Concluir</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
