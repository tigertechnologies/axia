"use client";
import { useState } from "react";
import "./forms.css";

export default function Modal({ open, onClose, title, subtitle, submitLabel, onSubmit, children }:
  { open: boolean; onClose: () => void; title: string; subtitle?: string; submitLabel: string; onSubmit: () => Promise<string | null>; children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  if (!open) return null;

  async function submit() {
    setErr(""); setLoading(true);
    const e = await onSubmit();
    setLoading(false);
    if (e) { setErr(e); return; }
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,35,63,.45)", zIndex: 100, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 18, boxShadow: "0 24px 60px rgba(16,35,63,.2)", padding: 26 }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, color: "#10233F", fontWeight: 600 }}>{title}</h2>
        {subtitle && <p style={{ color: "#6B7C93", fontSize: 13.5, margin: "4px 0 18px" }}>{subtitle}</p>}
        {err && <div className="err">{err}</div>}
        <div style={{ marginTop: subtitle ? 0 : 16 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button className="btn-back" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-full" style={{ width: "auto", padding: "12px 22px" }} onClick={submit} disabled={loading}>{loading ? "Salvando…" : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}
