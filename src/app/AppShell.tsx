"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "./dashboard/actions";
import "./dashboard/dashboard.css";

export interface Counts { inbox: number; nomeacoes: number; prazos: number; pericias: number }

interface NavItem { href: string; label: string; ico: string; ready: boolean; count?: number; gray?: boolean }

export default function AppShell({
  nome, planLabel, counts, bell, children,
}: {
  nome: string; planLabel: string; counts: Counts; bell: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const path = usePathname();

  const top: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", ico: "dash", ready: true },
    { href: "/inbox", label: "Inbox", ico: "inbox", ready: true, count: counts.inbox },
  ];
  const pericias: NavItem[] = [
    { href: "/nomeacoes", label: "Nomeações", ico: "shield", ready: false, count: counts.nomeacoes },
    { href: "/prazos", label: "Prazos", ico: "clock", ready: false, count: counts.prazos, gray: true },
    { href: "/pericias", label: "Perícias", ico: "cal", ready: false, count: counts.pericias, gray: true },
    { href: "/processos", label: "Processos", ico: "doc", ready: false },
    { href: "/honorarios", label: "Honorários", ico: "wallet", ready: false },
    { href: "/agenda", label: "Agenda", ico: "agenda", ready: false },
  ];

  function item(n: NavItem) {
    const active = path === n.href;
    const badge = n.count && n.count > 0 ? <span className={"count" + (n.gray ? " gray" : "")}>{n.count}</span> : null;
    const inner = <><Ico p={n.ico} />{n.label}{badge}</>;
    if (!n.ready) return <div key={n.href} className="sb-item" style={{ opacity: 0.45, cursor: "default" }} title="Em breve">{inner}</div>;
    return <Link key={n.href} href={n.href} className={"sb-item" + (active ? " active" : "")} onClick={() => setOpen(false)}>{inner}</Link>;
  }

  return (
    <div className="app">
      <aside className={"sidebar" + (open ? " open" : "")}>
        <div className="sb-brand">
          <svg width="30" height="30" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#A8C4E0" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round" /><circle cx="20" cy="22" r="4" fill="#10233F" stroke="#A8C4E0" strokeWidth={2.4} /></svg>
          <span className="word">AXIA</span>
        </div>
        <nav className="sb-nav">
          {top.map(item)}
          <div className="sb-sec">Perícias</div>
          {pericias.map(item)}
          <div className="sb-sec">Conta</div>
          <div className="sb-item" onClick={() => startTransition(() => { signOut(); })} style={{ cursor: "pointer" }}><Ico p="gear" />Sair</div>
        </nav>
        <div className="sb-user">
          <div className="avatar">{nome.slice(0, 2).toUpperCase()}</div>
          <div><div className="nm">Dr. {nome}</div><div className="rl">{planLabel}</div></div>
        </div>
      </aside>
      <div className={"overlay" + (open ? " show" : "")} onClick={() => setOpen(false)} />

      <div className="main">
        <div className="topbar">
          <button className="hamb" onClick={() => setOpen(true)} aria-label="Menu"><svg width="24" height="24" fill="none" stroke="#16305B" strokeWidth={2}><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" /></svg></button>
          <div className="search">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7.5" cy="7.5" r="5.5" /><path d="M15 15l-3.5-3.5" strokeLinecap="round" /></svg>
            <input placeholder="Buscar processo, parte, comunicação…" />
          </div>
          <div className="top-right">
            <span className="mbox"><span className="lv" />Gmail conectado</span>
            <button className="ico-btn" aria-label="Alertas"><svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M9.5 2.5c-2.6 0-4.3 1.9-4.3 4.4 0 3.6-1.2 4.7-1.2 4.7h11s-1.2-1.1-1.2-4.7c0-2.5-1.7-4.4-4.3-4.4z" strokeLinejoin="round" /><path d="M8 15a1.6 1.6 0 003 0" strokeLinecap="round" /></svg>{bell > 0 && <span className="badge">{bell}</span>}</button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

export function Ico({ p, s = 19 }: { p: string; s?: number }) {
  const c: Record<string, React.ReactNode> = {
    dash: <><rect x="2" y="2" width="6.5" height="6.5" rx="1.5" /><rect x="10.5" y="2" width="6.5" height="6.5" rx="1.5" /><rect x="2" y="10.5" width="6.5" height="6.5" rx="1.5" /><rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" /></>,
    inbox: <><path d="M2.5 5.5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-10a2 2 0 01-2-2z" /><path d="M3 5.5l6.5 5 6.5-5" strokeLinecap="round" /></>,
    nomeacao: <path d="M9 1.5l6.5 3v4c0 3.6-2.6 5.8-6.5 7-3.9-1.2-6.5-3.4-6.5-7v-4l6.5-3z" strokeLinejoin="round" />,
    shield: <path d="M9.5 2l6.5 3.2v4.3c0 3.8-2.7 6.2-6.5 7.5C5.7 15.7 3 13.3 3 9.5V5.2L9.5 2z" strokeLinejoin="round" />,
    prazo: <><circle cx="9" cy="9.5" r="7" /><path d="M9 5.5v4.2l2.8 1.7" strokeLinecap="round" /></>,
    clock: <><circle cx="9.5" cy="9.7" r="7" /><path d="M9.5 5.5v4.4l3 1.8" strokeLinecap="round" /></>,
    pericia: <><rect x="2" y="4" width="14" height="12" rx="2" /><path d="M2 8h14M6 2v3M12 2v3" strokeLinecap="round" /></>,
    cal: <><rect x="2.5" y="4" width="14" height="12.5" rx="2" /><path d="M2.5 8h14M6.5 2v3M12.5 2v3" strokeLinecap="round" /></>,
    doc: <><path d="M4 2.5h8l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1v-13a1 1 0 011-1z" strokeLinejoin="round" /><path d="M6 9h7M6 12h7M6 6h3" strokeLinecap="round" /></>,
    honorarios: <><rect x="2" y="4.5" width="14" height="9" rx="2" /><path d="M2 8h14M12.5 11h1.3" strokeLinecap="round" /></>,
    wallet: <><rect x="2" y="5" width="16" height="10" rx="2" /><path d="M2 9h16M14 12h1.5" strokeLinecap="round" /></>,
    agenda: <><rect x="2.5" y="3.5" width="14" height="13" rx="2" /><path d="M2.5 7.5h14M6 1.8v3M13 1.8v3" strokeLinecap="round" /></>,
    intimacao: <><path d="M2.5 5a2 2 0 012-2h9a2 2 0 012 2v6a2 2 0 01-2 2h-9a2 2 0 01-2-2z" /><path d="M3 5l6 4.5L15 5" strokeLinecap="round" /></>,
    esclarecimento: <path d="M2.5 4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0115.5 4v6A1.5 1.5 0 0114 11.5H6l-3.5 3V4z" strokeLinejoin="round" />,
    gear: <><circle cx="9.5" cy="9.5" r="2.6" /><path d="M9.5 1.5v2M9.5 15.5v2M1.5 9.5h2M15.5 9.5h2" strokeLinecap="round" /></>,
    alert: <><path d="M11 2l9 16H2L11 2z" strokeLinejoin="round" /><path d="M11 8v4M11 15h.01" strokeLinecap="round" /></>,
  };
  return <svg width={s} height={s} viewBox={`0 0 ${p === "alert" ? 22 : 19} ${p === "alert" ? 20 : 19}`} fill="none" stroke="currentColor" strokeWidth={1.7}>{c[p] ?? c.esclarecimento}</svg>;
}
