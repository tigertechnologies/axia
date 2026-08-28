"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "./landing.css";

const PLANS = [
  {
    code: "essential",
    name: "Essential",
    m: "69,90",
    a: "699",
    altM: "Cobrado mensalmente",
    altA: "R$ 58,25/mês • cobrado anualmente",
    pop: false,
    features: [
      "Identificação de nomeações e prazos",
      "1 caixa de e-mail conectada",
      "Alertas por e-mail e aplicativo",
      "Inbox inteligente organizada",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    m: "119,90",
    a: "1.199",
    altM: "Cobrado mensalmente",
    altA: "R$ 99,92/mês • cobrado anualmente",
    pop: true,
    features: [
      "Tudo do Essential",
      "Mais caixas de e-mail conectadas",
      "Controle de honorários e agenda",
      "Prioridade na análise da IA",
    ],
  },
  {
    code: "office",
    name: "Office",
    m: "249,90",
    a: "2.499",
    altM: "Cobrado mensalmente",
    altA: "R$ 208,25/mês • cobrado anualmente",
    pop: false,
    features: [
      "Tudo do Pro",
      "Vários usuários no mesmo escritório",
      "Perfil e gestão de escritório",
      "Suporte prioritário",
    ],
  },
];

const FAQS = [
  ["A AXIA substitui o sistema do Tribunal?", "Não. A AXIA é uma ferramenta de apoio, organização e monitoramento. Ela não substitui os sistemas oficiais dos tribunais."],
  ["A AXIA pode calcular prazos?", "A AXIA identifica informações e apresenta datas sugeridas, mas você deve confirmar os prazos nos sistemas oficiais."],
  ["A AXIA lê todos os meus e-mails?", "A análise acontece apenas dentro das permissões que você concede, buscando comunicações relacionadas à sua atividade pericial."],
  ["Meus dados estão seguros?", "Sim. Utilizamos criptografia, controle de acesso e seguimos a LGPD para proteger suas informações."],
  ["Posso cancelar quando quiser?", "Sim, conforme as condições da assinatura, diretamente pelo seu painel — sem burocracia."],
  ["A AXIA funciona com Gmail e Outlook?", "Sim, com Gmail e Outlook, conforme as integrações forem liberadas na sua conta."],
];

const Check = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 8.5l3 3L13 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Mark = ({ size = 34, footer = false }: { size?: number; footer?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M8 33 L20 8 L28 24" stroke={footer ? "#A8C4E0" : "url(#axiaGrad)"} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round" />
    <circle cx="20" cy="22" r="4" fill={footer ? "#10233F" : "#fff"} stroke={footer ? "#A8C4E0" : "#16305B"} strokeWidth={2.4} />
    {!footer && <circle cx="31" cy="33" r="2.4" fill="#1FA89E" />}
  </svg>
);

export default function Landing() {
  const [annual, setAnnual] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (ents) =>
        ents.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.14 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="axiaGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#16305B" />
            <stop offset="1" stopColor="#A8C4E0" />
          </linearGradient>
        </defs>
      </svg>

      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="brand" href="/" aria-label="AXIA — início">
            <Mark />
            <span className="word">AXIA</span>
          </Link>
          <nav className="nav-links" aria-label="Principal">
            <a className="link" href="#como">Como funciona</a>
            <a className="link" href="#planos">Planos</a>
            <a className="link" href="#seguranca">Segurança</a>
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-ghost" href="/login">Entrar</Link>
            <a className="btn btn-primary" href="#planos">Começar agora</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="top">
        <div className="hero-bg"><div className="blob b1" /><div className="blob b2" /></div>
        <div className="wrap hero-grid">
          <div className="hero-copy reveal">
            <span className="eyebrow">Inteligência que conecta o que importa</span>
            <h1>Você não precisa mais procurar<span className="accent">o que é importante.</span></h1>
            <p className="sub">Conecte seu e-mail e deixe a AXIA identificar automaticamente nomeações, intimações, prazos, perícias e outras comunicações da sua rotina pericial.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#planos">Começar agora
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M3 8h9M8 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a className="btn btn-ghost" href="#como">Ver como funciona</a>
            </div>
            <div className="hero-trust"><span className="dot" /> Conexão segura • Criptografia • Conformidade com a LGPD</div>
          </div>

          <div className="hero-mock reveal">
            <div className="mock">
              <div className="mock-top">
                <span className="tt"><Mark size={20} /> AXIA</span>
                <span className="tag">Hoje • 08:12</span>
              </div>
              <div className="mock-body">
                <h4>Bom dia, Dr. Rafael.</h4>
                <p className="sm">A AXIA analisou suas novas comunicações.</p>
                <div className="m-row">
                  <span className="ic ic-navy"><svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M8.5 1.5l6 3v4c0 3.5-2.4 5.6-6 6.9-3.6-1.3-6-3.4-6-6.9v-4l6-3z" strokeLinejoin="round" /></svg></span>
                  <span className="txt"><b>2 novas nomeações</b></span>
                </div>
                <div className="m-row">
                  <span className="ic ic-teal"><svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="8.5" cy="9" r="6.5" /><path d="M8.5 5v4l2.5 1.5" strokeLinecap="round" /></svg></span>
                  <span className="txt"><b>1 prazo</b> vence amanhã</span>
                </div>
                <div className="m-row">
                  <span className="ic ic-blue"><svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="2" y="3.5" width="13" height="11" rx="2" /><path d="M2 6.5h13M6 1.8v2.4M11 1.8v2.4" strokeLinecap="round" /></svg></span>
                  <span className="txt"><b>3 perícias</b> esta semana</span>
                </div>
                <div className="m-clear">
                  <svg width="15" height="15" fill="none" stroke="#1FA89E" strokeWidth={2}><path d="M2 7.5l3.5 3.5L13 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Nenhuma outra pendência crítica identificada
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHIPS */}
      <div className="strip">
        <div className="wrap reveal">
          <p className="cap">Tudo que importa, já separado</p>
          <div className="chips">
            <span className="chip"><i style={{ background: "var(--navy)" }} />Nova nomeação</span>
            <span className="chip"><i style={{ background: "var(--teal)" }} />Prazo</span>
            <span className="chip"><i style={{ background: "var(--blue)" }} />Intimação</span>
            <span className="chip"><i style={{ background: "#C9A227" }} />Honorários</span>
            <span className="chip"><i style={{ background: "var(--blue-light)" }} />Perícia</span>
            <span className="chip"><i style={{ background: "var(--muted)" }} />Esclarecimento</span>
          </div>
        </div>
      </div>

      {/* PROBLEMA */}
      <section className="problema">
        <div className="wrap">
          <div className="prob-head reveal">
            <span className="eyebrow">O problema</span>
            <h2 style={{ fontSize: "clamp(24px,3.4vw,38px)" }}>Quantas oportunidades estão escondidas na sua caixa de entrada?</h2>
            <p className="lead" style={{ marginTop: 16 }}>Todo dia chegam e-mails pessoais, newsletters e propaganda — misturados com tribunais, cartórios, advogados e comunicações administrativas. No meio disso, o que realmente importa passa despercebido.</p>
          </div>
          <div className="prob-cols reveal">
            <div className="col-card noise">
              <h5>O ruído</h5>
              <ul className="col-list"><li>E-mails pessoais</li><li>Newsletters</li><li>Propaganda</li><li>Mensagens administrativas</li><li>Notificações genéricas</li></ul>
            </div>
            <div className="arrow-mid">
              <svg width="46" height="46" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 10 L28 25" stroke="url(#axiaGrad)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /><circle cx="20" cy="23" r="4" fill="#fff" stroke="#16305B" strokeWidth={2.2} /></svg>
              <span className="lbl">AXIA filtra</span>
            </div>
            <div className="col-card signal">
              <h5>O que importa</h5>
              <ul className="col-list"><li>Novas nomeações</li><li>Intimações</li><li>Prazos</li><li>Datas de perícia</li><li>Honorários e esclarecimentos</li></ul>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="como" id="como">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: 640 }}>
            <span className="eyebrow">Como funciona</span>
            <h2 style={{ fontSize: "clamp(24px,3.4vw,38px)" }}>Quatro passos entre a sua caixa e a sua clareza.</h2>
          </div>
          <div className="steps">
            {[
              ["01", "Conecte", "Você conecta sua conta de e-mail com segurança e no seu controle."],
              ["02", "A AXIA analisa", "A IA identifica automaticamente comunicações ligadas à sua atividade pericial."],
              ["03", "A AXIA organiza", "Nomeações, prazos, perícias, processos e honorários viram informação estruturada."],
              ["04", "A AXIA alerta", "Você recebe alertas e sabe exatamente o que precisa da sua atenção."],
            ].map(([n, t, d], i) => (
              <div className="step reveal" key={n}>
                {i < 3 && <span className="line" />}
                <div className="num">{n}</div><h3>{t}</h3><p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAL */}
      <section className="dif">
        <div className="wrap">
          <div className="dif-head reveal">
            <span className="eyebrow">O diferencial</span>
            <h2>Sua caixa de entrada deixa de ser uma caixa de entrada.<br /><span className="under">Ela vira sua central inteligente de perícias.</span></h2>
          </div>
          <div className="flow reveal">
            <div className="flow-side flow-in">
              {["Assunto: nomeação perito", "Re: intimação — prazo", "Agendamento de perícia", "Proposta de honorários", "Pedido de esclarecimento"].map((t) => (
                <div className="mini" key={t}><i />{t}</div>
              ))}
            </div>
            <div className="flow-node">
              <div className="node-core"><span className="ring" /></div>
              <span className="node-lbl">AXIA IA</span>
            </div>
            <div className="flow-side flow-out">
              {["Nomeação", "Prazo", "Processo", "Agenda", "Honorários", "Tarefa"].map((t) => (
                <div className="out" key={t}><i />{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="bens">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: 620 }}>
            <span className="eyebrow">Benefícios</span>
            <h2 style={{ fontSize: "clamp(24px,3.4vw,38px)" }}>Menos procura. Mais controle.</h2>
          </div>
          <div className="ben-grid">
            {[
              ["Não perca novas nomeações", "A AXIA identifica comunicações que podem representar novos trabalhos."],
              ["Controle seus prazos", "Prazos identificados aparecem organizados para validação e acompanhamento."],
              ["Organize suas perícias", "Datas, processos e compromissos reunidos em um só lugar."],
              ["Acompanhe seus honorários", "Saiba o que foi proposto, aprovado, depositado e recebido."],
              ["Menos trabalho administrativo", "A AXIA lê e organiza o que normalmente exigiria trabalho manual."],
              ["Mais tranquilidade", "Abra a plataforma e saiba na hora o que precisa da sua atenção."],
            ].map(([t, d]) => (
              <div className="ben reveal" key={t}>
                <div className="bi"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="10" cy="10" r="7.5" /><path d="M6.5 10l2.3 2.3 4.7-4.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3>{t}</h3><p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVA DE VALOR */}
      <section className="prova">
        <div className="wrap reveal">
          <span className="demo-tag"><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)" }} />Demonstração</span>
          <span className="eyebrow" style={{ display: "block" }}>Prova de valor</span>
          <h2>Imagine abrir a AXIA pela manhã e encontrar:</h2>
          <div className="stat-grid">
            {[["187", "e-mails analisados"], ["12", "comunicações relevantes"], ["3", "novas nomeações"], ["4", "prazos monitorados"], ["2", "perícias próximas"], ["1", "pagamento identificado"]].map(([n, l]) => (
              <div className="stat" key={l}><div className="n">{n}</div><div className="l">{l}</div></div>
            ))}
          </div>
          <p className="disc">Exemplo ilustrativo de demonstração. Não representa dados reais de clientes.</p>
        </div>
      </section>

      {/* PLANOS */}
      <section className="planos" id="planos">
        <div className="wrap">
          <div className="plan-head reveal">
            <span className="eyebrow">Planos</span>
            <h2 style={{ fontSize: "clamp(24px,3.4vw,38px)" }}>Escolha o plano da sua rotina.</h2>
            <div className="toggle" role="tablist" aria-label="Periodicidade">
              <button className={annual ? "" : "active"} role="tab" aria-selected={!annual} onClick={() => setAnnual(false)}>Mensal</button>
              <button className={annual ? "active" : ""} role="tab" aria-selected={annual} onClick={() => setAnnual(true)}>Anual <span className="save">−2 meses</span></button>
            </div>
          </div>
          <div className="plan-grid">
            {PLANS.map((p) => (
              <div className={"plan reveal" + (p.pop ? " pop" : "")} key={p.code}>
                {p.pop && <span className="badge">Mais escolhido</span>}
                <span className="pname">{p.name}</span>
                <div className="price"><span className="cur">R$</span><span className="val">{annual ? p.a : p.m}</span><span className="per">{annual ? "/ano" : "/mês"}</span></div>
                <p className="alt">{annual ? p.altA : p.altM}</p>
                <ul>{p.features.map((f) => (<li key={f}><Check />{f}</li>))}</ul>
                <Link className={"btn " + (p.pop ? "btn-primary" : "btn-ghost")} href={`/checkout?plan=${p.code}_${annual ? "annual" : "monthly"}`}>Assinar {p.name}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="seguranca">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <span className="eyebrow">Perguntas frequentes</span>
            <h2 style={{ fontSize: "clamp(24px,3.4vw,38px)" }}>Tudo que você precisa saber.</h2>
          </div>
          <div className="faq-wrap reveal">
            {FAQS.map(([q, a], i) => (
              <div className={"qa" + (open === i ? " open" : "")} key={q}>
                <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  {q}
                  <span className="pm"><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 1v10M1 6h10" strokeLinecap="round" /></svg></span>
                </button>
                <div className="ans" style={{ maxHeight: open === i ? 200 : 0 }}><p>{a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="final">
        <div className="wrap reveal">
          <h2>Comece a deixar a AXIA trabalhar por você.</h2>
          <p className="lead" style={{ margin: "0 auto 8px" }}>Conecte seu e-mail e veja o que estava passando despercebido.</p>
          <a className="btn btn-primary" href="#planos">Começar agora
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M3 8h9M8 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div>
              <div className="brand"><Mark size={30} footer /><span className="word">AXIA</span></div>
              <p className="foot-tag">Inteligência que conecta o que importa na sua rotina pericial.</p>
            </div>
            <div className="foot-links">
              <div className="foot-col"><h6>Produto</h6><a href="#como">Como funciona</a><a href="#planos">Planos</a><a href="#seguranca">Segurança</a></div>
              <div className="foot-col"><h6>Conta</h6><Link href="/login">Entrar</Link><Link href="/cadastro">Criar conta</Link></div>
              <div className="foot-col"><h6>Legal</h6><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a><a href="#seguranca">LGPD</a></div>
            </div>
          </div>
          <div className="foot-bottom"><span>© 2026 AXIA. Todos os direitos reservados.</span><span>Feito para peritos médicos.</span></div>
        </div>
      </footer>
    </>
  );
}
