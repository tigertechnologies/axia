"use client";

// Aviso transitório para feedback honesto de ações (erro/salvo).
export default function Toast({ msg, kind = "error" }: { msg: string; kind?: "error" | "ok" }) {
  if (!msg) return null;
  const bg = kind === "ok" ? "#127c74" : "#C0492E";
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "#fff", padding: "12px 18px", borderRadius: 12,
      fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500, zIndex: 200,
      boxShadow: "0 10px 30px rgba(16,35,63,.25)", maxWidth: "90vw",
    }}>{msg}</div>
  );
}
