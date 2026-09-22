"use client";
import Link from "next/link";
import { AxiaIcon } from "./AxiaIcon";

interface Tile { icon: string; nome: string; desc: string; href: string; metric?: string; metricCls?: string }

const OPERACAO: Tile[] = [
  { icon: "journey", nome: "Jornada", desc: "Suas perícias em movimento", href: "/jornada", metric: "", metricCls: "ax-m-teal" },
  { icon: "clock", nome: "Prazos", desc: "Nunca perca um fatal", href: "/jornada", metric: "", metricCls: "ax-m-red" },
  { icon: "inbox", nome: "Inbox", desc: "E-mails já interpretados", href: "/inbox", metric: "", metricCls: "ax-m-gold" },
  { icon: "ia", nome: "IA", desc: "Gerar, resumir, analisar", href: "/ia" },
];
const GESTAO: Tile[] = [
  { icon: "money", nome: "Financeiro", desc: "Receitas, despesas, saldo", href: "/financeiro" },
  { icon: "calc", nome: "Cálculos", desc: "Periciais e financeiros", href: "/calculos" },
  { icon: "cal", nome: "Agenda", desc: "Perícias e compromissos", href: "/agenda" },
  { icon: "chart", nome: "Relatórios", desc: "Visão do escritório", href: "/relatorios" },
];
const MAIS: Tile[] = [
  { icon: "scale", nome: "Processos", desc: "Todos os processos", href: "/processos" },
  { icon: "doc", nome: "Tarefas", desc: "Kanban de afazeres", href: "/tarefas" },
  { icon: "users", nome: "Equipe", desc: "Acessos e convites", href: "/equipe" },
  { icon: "contact", nome: "Contatos", desc: "Advogados e partes", href: "/contatos" },
];

// counts: métricas dinâmicas para os tiles de operação.
export default function HubAcessos({ counts, foco }: {
  counts?: { jornada?: number; prazos?: number; inbox?: number };
  foco?: { titulo: string; sub: string; href: string } | null;
}) {
  const op = OPERACAO.map((t) => {
    let m = t.metric;
    if (t.nome === "Jornada" && counts?.jornada) m = `${counts.jornada} ativas`;
    if (t.nome === "Prazos" && counts?.prazos) m = `${counts.prazos} urgente${counts.prazos > 1 ? "s" : ""}`;
    if (t.nome === "Inbox" && counts?.inbox) m = `${counts.inbox} novas`;
    return { ...t, metric: m };
  });

  function move(e: React.MouseEvent<HTMLElement>) {
    const el = e.currentTarget; const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }

  return (
    <div style={{ marginBottom: 26 }}>
      {/* Botão de comando proeminente */}
      <button className="ax-cmd" onMouseMove={move} onClick={() => window.dispatchEvent(new CustomEvent("axia-open-cmdk"))}>
        <span className="ax-cmd-ic"><AxiaIcon name="spark" size={22} /></span>
        <span className="ax-cmd-txt">
          <span className="ax-cmd-t1">Faça qualquer coisa na AXIA</span>
          <span className="ax-cmd-t2">Gere um laudo, calcule verbas, encontre um processo — é só digitar</span>
        </span>
        <span className="ax-cmd-keys"><kbd>Ctrl</kbd><kbd>K</kbd></span>
      </button>

      {/* Foco de agora — a AXIA prioriza */}
      {foco && (
        <Link href={foco.href} className="ax-focus">
          <div className="ax-focus-tag"><span className="dot" /> Foco de agora</div>
          <h2>{foco.titulo}</h2>
          <p>{foco.sub}</p>
          <span className="ax-focus-cta">Retomar de onde parei →</span>
        </Link>
      )}

      {/* Operação */}
      <div className="ax-sec">Operação</div>
      <div className="ax-grid">
        {op.map((t) => (
          <Link key={t.nome} href={t.href} className="ax-tile" onMouseMove={move}>
            {t.metric && <span className={"ax-tile-metric " + (t.metricCls ?? "ax-m-teal")}>{t.metric}</span>}
            <span className="ax-tile-ico"><AxiaIcon name={t.icon} size={24} /></span>
            <span className="ax-tile-nome">{t.nome}</span>
            <span className="ax-tile-desc">{t.desc}</span>
          </Link>
        ))}
      </div>

      {/* Gestão */}
      <div className="ax-sec">Gestão</div>
      <div className="ax-grid">
        {GESTAO.map((t) => (
          <Link key={t.nome} href={t.href} className="ax-tile" onMouseMove={move}>
            <span className="ax-tile-ico"><AxiaIcon name={t.icon} size={24} /></span>
            <span className="ax-tile-nome">{t.nome}</span>
            <span className="ax-tile-desc">{t.desc}</span>
          </Link>
        ))}
      </div>

      {/* Mais */}
      <div className="ax-sec">Mais</div>
      <div className="ax-grid">
        {MAIS.map((t) => (
          <Link key={t.nome} href={t.href} className="ax-tile" onMouseMove={move}>
            <span className="ax-tile-ico"><AxiaIcon name={t.icon} size={24} /></span>
            <span className="ax-tile-nome">{t.nome}</span>
            <span className="ax-tile-desc">{t.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
