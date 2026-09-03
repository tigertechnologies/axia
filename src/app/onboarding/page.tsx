"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./actions";
import "../forms.css";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState({ crm: "", uf: "", especialidade: "" });

  const steps = [
    {
      t: "Perfil profissional",
      d: "Comece com seus dados de registro.",
      body: (
        <>
          <div className="grid2">
            <div className="field"><label>CRM</label><input value={p.crm} onChange={(e)=>setP({...p,crm:e.target.value})}/></div>
            <div className="field"><label>UF</label><select value={p.uf} onChange={(e)=>setP({...p,uf:e.target.value})}><option value="">—</option>{UFS.map(u=><option key={u}>{u}</option>)}</select></div>
          </div>
          <div className="field"><label>Especialidade principal</label><input value={p.especialidade} onChange={(e)=>setP({...p,especialidade:e.target.value})}/></div>
        </>
      ),
    },
    { t: "Onde você atua?", d: "Tribunais, estados, comarcas e modalidades. (Configurável depois.)", body: <div className="note">Você poderá refinar sua área de atuação a qualquer momento nas configurações.</div> },
    { t: "Conecte seu e-mail", d: "Gmail, Outlook ou encaminhamento inteligente.", body: <div className="note">A integração de e-mail entra em breve. Por enquanto, sua AXIA já nasce com uma demonstração para você explorar.</div> },
    { t: "Configure seus alertas", d: "E-mail, push e (em breve) WhatsApp — em configuração.", body: <div className="note">Os alertas por e-mail e push serão ativados quando a integração de e-mail e as notificações estiverem disponíveis na sua conta.</div> },
    { t: "Tudo pronto", d: "Sua central inteligente de perícias está configurada.", body: <div className="note">Clique em “Entrar na AXIA” para ver sua dashboard.</div> },
  ];

  async function finish() {
    setSaving(true);
    await completeOnboarding(p);
    router.push("/dashboard");
    router.refresh();
  }

  const s = steps[step];
  return (
    <div className="ob-wrap">
      <div className="ob-card">
        <div className="ob-prog">{steps.map((_, i) => <div key={i} className={"b" + (i <= step ? " on" : "")} />)}</div>
        <div className="ob-step">Passo {step + 1} de {steps.length}</div>
        <h2>{s.t}</h2>
        <p className="d">{s.d}</p>
        {s.body}
        <div className="ob-actions">
          {step > 0 ? <button className="btn-back" onClick={() => setStep(step - 1)}>Voltar</button> : <span />}
          {step < steps.length - 1
            ? <button className="btn-full" style={{ width: "auto", padding: "12px 24px" }} onClick={() => setStep(step + 1)}>Continuar</button>
            : <button className="btn-full" style={{ width: "auto", padding: "12px 24px" }} onClick={finish} disabled={saving}>{saving ? "Preparando…" : "Entrar na AXIA"}</button>}
        </div>
      </div>
    </div>
  );
}
