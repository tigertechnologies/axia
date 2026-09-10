"use client";
import { useState } from "react";

const CORES: Record<string, { bg: string; fg: string }> = {
  info:   { bg: "#1FA89E", fg: "#ffffff" },
  promo:  { bg: "#16305B", fg: "#ffffff" },
  alerta: { bg: "#B8542E", fg: "#ffffff" },
};

export default function BannerBar({
  mensagem, variante, linkUrl, linkLabel,
}: {
  mensagem: string; variante: string; linkUrl: string | null; linkLabel: string | null;
}) {
  const [fechado, setFechado] = useState(false);
  if (fechado) return null;
  const c = CORES[variante] ?? CORES.info;

  return (
    <div style={{ position: "relative", background: c.bg, color: c.fg, fontFamily: "'Inter',sans-serif", fontSize: 14, padding: "10px 40px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
      <span>{mensagem}</span>
      {linkUrl && (
        <a href={linkUrl} style={{ color: c.fg, fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
          {linkLabel || "Saiba mais"}
        </a>
      )}
      <button onClick={() => setFechado(true)} aria-label="Fechar aviso"
        style={{ position: "absolute", right: 12, background: "none", border: "none", color: c.fg, cursor: "pointer", fontSize: 18, lineHeight: 1, opacity: 0.8 }}>
        ×
      </button>
    </div>
  );
}
