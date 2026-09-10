import Link from "next/link";

// Tela mostrada quando o recurso não está incluído no plano do usuário.
export default function UpgradeGate({ titulo, plano }: { titulo: string; plano: "Pro" | "Master" }) {
  return (
    <div style={{ maxWidth: 560, margin: "40px auto", textAlign: "center", padding: "40px 22px", background:"var(--panel)", border: "1px solid var(--line)", borderRadius: 18 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background:"var(--panel)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
        <svg width="26" height="26" fill="none" stroke="#4A6FA5" strokeWidth={1.8}><rect x="5" y="11" width="16" height="12" rx="2" /><path d="M8 11V8a5 5 0 0110 0v3" strokeLinecap="round" /></svg>
      </div>
      <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, color:"var(--ink)", fontWeight: 600, marginBottom: 8 }}>{titulo} está no plano {plano}</h1>
      <p style={{ color:"var(--muted)", fontSize: 15, marginBottom: 22, lineHeight: 1.6 }}>
        Este recurso não está incluído no seu plano atual. Faça upgrade para o plano <b>{plano}</b> para desbloquear {titulo.toLowerCase()} e outras funcionalidades.
      </p>
      <Link href="/configuracoes" className="btn btn-primary" style={{ display: "inline-flex" }}>Ver planos e fazer upgrade</Link>
    </div>
  );
}
