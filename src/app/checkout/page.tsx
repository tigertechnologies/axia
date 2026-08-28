"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { PLANS, formatBRL } from "@/lib/plans";
import { createCheckoutSession } from "./actions";
import "../forms.css";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const CODES: { code: string; label: string }[] = [
  { code: "essential", label: "Essential" },
  { code: "pro", label: "Pro" },
  { code: "office", label: "Office" },
];

function Checkout() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("plan") || "pro_monthly";

  const [code, setCode] = useState(initial.split("_")[0] || "pro");
  const [annual, setAnnual] = useState(initial.endsWith("annual"));
  const [p, setP] = useState({ crm: "", uf: "", especialidade: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const planId = `${code}_${annual ? "annual" : "monthly"}`;
  const plan = PLANS[planId];

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace(`/cadastro?plan=${planId}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan) return <div className="auth-wrap"><div className="auth-card"><h1>Plano não encontrado</h1></div></div>;

  async function pay() {
    setErr(""); setLoading(true);
    const res = await createCheckoutSession(planId, p);
    if ("error" in res) {
      setLoading(false);
      if (res.error === "not_authenticated") router.replace(`/cadastro?plan=${planId}`);
      else setErr("Não foi possível iniciar o pagamento.");
      return;
    }
    window.location.href = res.url;
  }

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid " + (active ? "#16305B" : "#E4E9F0"),
    background: active ? "#16305B" : "#fff", color: active ? "#fff" : "#28374D",
    fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
  });

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round"/><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4}/></svg>
          <span className="w">AXIA</span>
        </div>
        <h1>Finalizar assinatura</h1>
        <p className="subt">Escolha seu plano. O restante configuramos no onboarding.</p>

        {/* período */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={seg(!annual)} onClick={() => setAnnual(false)}>Mensal</button>
          <button style={seg(annual)} onClick={() => setAnnual(true)}>Anual · 2 meses grátis</button>
        </div>

        {/* planos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {CODES.map(({ code: c, label }) => {
            const pl = PLANS[`${c}_${annual ? "annual" : "monthly"}`];
            const on = c === code;
            return (
              <button key={c} onClick={() => setCode(c)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                border: "2px solid " + (on ? "#1FA89E" : "#E4E9F0"),
                background: on ? "#E4F4F2" : "#fff",
              }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, color: "#10233F", fontSize: 15 }}>
                  AXIA {label}{c === "pro" && <span style={{ fontSize: 11, color: "#127c74", marginLeft: 8 }}>Mais escolhido</span>}
                </span>
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, color: "#10233F", fontSize: 15 }}>
                  {formatBRL(pl.amount)}<span style={{ fontSize: 12, color: "#6B7C93", fontWeight: 500 }}>/{annual ? "ano" : "mês"}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="co-summary">
          <div className="pl">{plan.name}</div>
          <div className="pr">{formatBRL(plan.amount)}<span className="pc"> /{plan.interval === "month" ? "mês" : "ano"}</span></div>
          <div className="pc">Renovação automática • cancele quando quiser</div>
        </div>

        {err && <div className="err">{err}</div>}

        <div className="grid2">
          <div className="field"><label>CRM</label><input value={p.crm} onChange={(e)=>setP({...p,crm:e.target.value})} placeholder="Opcional agora"/></div>
          <div className="field"><label>UF</label>
            <select value={p.uf} onChange={(e)=>setP({...p,uf:e.target.value})}><option value="">—</option>{UFS.map(u=><option key={u}>{u}</option>)}</select>
          </div>
        </div>
        <div className="field"><label>Especialidade principal</label><input value={p.especialidade} onChange={(e)=>setP({...p,especialidade:e.target.value})} placeholder="Opcional agora"/></div>

        <button className="btn-full" onClick={pay} disabled={loading}>{loading ? "Redirecionando…" : "Ir para o pagamento seguro"}</button>
        <div className="secure">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M7 1.5l5 2v3.5c0 3-2 4.6-5 5.5-3-.9-5-2.5-5-5.5V3.5l5-2z" strokeLinejoin="round"/></svg>
          Pagamento processado com segurança pelo Stripe
        </div>
      </div>
    </div>
  );
}

export default function Page(){ return <Suspense><Checkout/></Suspense>; }
