"use client";
import Link from "next/link";

// Hub de acesso rápido — substitui a navegação "botão por botão" por
// grandes cartões agrupados por contexto. O menu vira secundário.
const GRUPOS: { titulo: string; itens: { icon: string; nome: string; desc: string; href: string; cor: string }[] }[] = [
  {
    titulo: "Operação",
    itens: [
      { icon: "🗂️", nome: "Jornada", desc: "Suas perícias, da nomeação à entrega", href: "/jornada", cor: "#16305B" },
      { icon: "⚖️", nome: "Processos", desc: "Todos os processos e seus detalhes", href: "/processos", cor: "#16305B" },
      { icon: "📥", nome: "Inbox", desc: "E-mails classificados pela AXIA", href: "/inbox", cor: "#16305B" },
      { icon: "📅", nome: "Agenda", desc: "Perícias, prazos e compromissos", href: "/agenda", cor: "#16305B" },
    ],
  },
  {
    titulo: "Produção",
    itens: [
      { icon: "📄", nome: "Laudos", desc: "Elabore pela Jornada", href: "/jornada", cor: "#0F7A70" },
      { icon: "🧮", nome: "Cálculos", desc: "Price, SAC, rescisão, revisional", href: "/calculos", cor: "#0F7A70" },
      { icon: "🤖", nome: "IA", desc: "Gerar laudo, quesitos, análise", href: "/ia", cor: "#0F7A70" },
      { icon: "✅", nome: "Tarefas", desc: "Kanban de afazeres", href: "/tarefas", cor: "#0F7A70" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { icon: "💰", nome: "Financeiro", desc: "Receitas, despesas, saldo", href: "/financeiro", cor: "#8A5A18" },
      { icon: "📊", nome: "Relatórios", desc: "Produtividade e resultados", href: "/relatorios", cor: "#8A5A18" },
      { icon: "👥", nome: "Equipe", desc: "Convide e gerencie acessos", href: "/equipe", cor: "#8A5A18" },
      { icon: "📇", nome: "Contatos", desc: "Advogados, partes, escritórios", href: "/contatos", cor: "#8A5A18" },
    ],
  },
];

export default function HubAcessos() {
  return (
    <div className="hub">
      <div className="hub-hint">Acesso rápido — ou aperte <kbd>Ctrl</kbd>+<kbd>K</kbd> para buscar qualquer coisa</div>
      {GRUPOS.map((g) => (
        <div key={g.titulo} className="hub-grupo">
          <div className="hub-grupo-tit">{g.titulo}</div>
          <div className="hub-cards">
            {g.itens.map((it) => (
              <Link key={it.nome} href={it.href} className="hub-card">
                <span className="hub-card-ico" style={{ background: it.cor + "18", color: it.cor }}>{it.icon}</span>
                <span className="hub-card-nome">{it.nome}</span>
                <span className="hub-card-desc">{it.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
