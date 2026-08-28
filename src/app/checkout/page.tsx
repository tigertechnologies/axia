"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { PLANS, formatBRL } from "@/lib/plans";
import { createCheckoutSession } from "./actions";
import "../forms.css";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function Checkout() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get("plan") || "pro_monthly";
  const plan = PLANS[planId];
  const [p, setP] = useState({ crm: "", uf: "", especialidade: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace(`/cadastro?plan=${planId}`);
    });
  }, [planId, router]);

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

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#16305B" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round"/><circle cx="20" cy="22" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.4}/></svg>
          <span className="w">AXIA</span>
        </div>
        <h1>Finalizar assinatura</h1>
        <p className="subt">Só o essencial. O restante configuramos no onboarding.</p>

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
