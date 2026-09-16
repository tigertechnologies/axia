"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

interface Faq { q: string; a: string; cat: string }

const FAQS: Faq[] = [
  { cat: "Primeiros passos", q: "O que é a Jornada pericial?", a: "É a tela central da AXIA: cada perícia aparece como um card que caminha por 10 etapas, das novas nomeações até a finalização. A AXIA move os cards conforme os e-mails e eventos chegam, e você acompanha e confirma os atos importantes." },
  { cat: "Primeiros passos", q: "Como uma perícia entra na AXIA?", a: "Quando você encaminha (ou recebe) um e-mail de nomeação para o seu endereço AXIA, ela é classificada automaticamente e vira um card na coluna 'Novas nomeações'. Você também pode criar uma perícia manualmente pelo botão na Jornada." },
  { cat: "Primeiros passos", q: "Como configuro meu e-mail para receber nomeações?", a: "Em Configurações, você encontra o endereço de encaminhamento da AXIA. Configure seu e-mail (Gmail/Outlook) para encaminhar as intimações para esse endereço." },
  { cat: "Laudos", q: "Como elaboro um laudo?", a: "No card da perícia, quando ela chega na etapa de laudo, clique em 'Iniciar laudo'. Você escolhe entre: modelo AXIA, seus modelos, um laudo anterior como base, ou começar em branco. O laudo já vem pré-preenchido com os dados do processo e os quesitos." },
  { cat: "Laudos", q: "O que é o AXIA Auditor?", a: "É uma conferência automática que verifica, antes de você validar, se há campos não preenchidos, quesitos sem resposta ou conclusão vazia. Ele aponta 'OK', 'Atenção' ou 'Revisar' — mas não substitui sua revisão médica." },
  { cat: "Laudos", q: "Como salvo um laudo como modelo?", a: "No editor do laudo, clique em 'Salvar como meu modelo'. A AXIA troca os dados do caso por marcadores automáticos, e o modelo fica disponível para reutilizar em qualquer perícia futura." },
  { cat: "Prazos e documentos", q: "Como confirmo um prazo?", a: "No painel da perícia (clique no card da Jornada), a seção Prazos mostra cada prazo. Clique em 'Confirmar' para validá-lo. Você também pode adicionar prazos manualmente ali." },
  { cat: "Prazos e documentos", q: "Como anexo documentos?", a: "No painel da perícia, seção Documentos, clique em 'Anexar documento'. Aceita PDF, imagem, DOCX ou XLSX até 20 MB. Os arquivos ficam em armazenamento privado e seguro." },
  { cat: "Financeiro", q: "Qual a diferença entre Financeiro e Honorários?", a: "Honorários é a visão dos valores por processo. Financeiro é a visão completa: receitas, despesas, saldo líquido e fluxo de caixa, com filtro por período." },
  { cat: "Financeiro", q: "Como lanço uma despesa?", a: "Na tela Financeiro, clique em '+ Despesa', informe a descrição, valor, categoria e método. O saldo líquido é calculado automaticamente (receitas − despesas)." },
  { cat: "Conta e segurança", q: "Meus dados estão seguros?", a: "Sim. Cada organização tem isolamento total (um perito não vê dados de outro), documentos ficam em armazenamento privado com links temporários, e todas as ações são registradas em auditoria." },
  { cat: "Conta e segurança", q: "Como funciona o plano?", a: "Em Configurações você vê seu plano atual (Essential, Pro ou Master) e pode gerenciá-lo. Cada plano tem limites de análises por mês." },
];

const CATEGORIAS = ["Primeiros passos", "Laudos", "Prazos e documentos", "Financeiro", "Conta e segurança"];

export default function AjudaClient({ waNumero, waAtivo }: { waNumero: string | null; waAtivo: boolean }) {
  const [q, setQ] = useState("");
  const [aberta, setAberta] = useState<number | null>(null);

  const filtradas = useMemo(() => {
    if (!q.trim()) return FAQS;
    const t = q.toLowerCase();
    return FAQS.filter((f) => f.q.toLowerCase().includes(t) || f.a.toLowerCase().includes(t));
  }, [q]);

  const waHref = waAtivo && waNumero ? `https://wa.me/${waNumero.replace(/\D/g, "")}?text=${encodeURIComponent("Olá, preciso de ajuda com a AXIA.")}` : null;

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Central de Ajuda</h1><p className="sum">Encontre respostas rápidas ou fale com o suporte.</p></div>
      </div>

      {/* Busca */}
      <div className="search" style={{ maxWidth: "100%", marginBottom: 20 }}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="8" cy="8" r="6" /><path d="M16 16l-4-4" strokeLinecap="round" /></svg>
        <input placeholder="Buscar na ajuda… (ex.: laudo, prazo, despesa)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {/* Atalhos de suporte */}
      <div className="kpis" style={{ marginBottom: 22 }}>
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="kpi" style={{ textDecoration: "none", cursor: "pointer" }}>
            <div className="kn" style={{ fontSize: 22 }}>💬</div><div className="kl">Falar no WhatsApp</div><div className="kt up">resposta rápida</div>
          </a>
        )}
        <Link href="/configuracoes" className="kpi" style={{ textDecoration: "none" }}>
          <div className="kn" style={{ fontSize: 22 }}>⚙️</div><div className="kl">Configurações</div><div className="kt">plano, e-mail, conta</div>
        </Link>
        <Link href="/jornada" className="kpi" style={{ textDecoration: "none" }}>
          <div className="kn" style={{ fontSize: 22 }}>🗂️</div><div className="kl">Ir para a Jornada</div><div className="kt">suas perícias</div>
        </Link>
      </div>

      {/* FAQ por categoria */}
      {q.trim() ? (
        <section className="panel">
          <div className="panel-h"><h3>{filtradas.length} resultado(s) para “{q}”</h3></div>
          {filtradas.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nada encontrado. Tente outra palavra ou fale com o suporte.</p>}
          {filtradas.map((f, i) => <FaqItem key={i} faq={f} aberta={aberta === i} onClick={() => setAberta(aberta === i ? null : i)} />)}
        </section>
      ) : (
        CATEGORIAS.map((cat) => {
          const itens = FAQS.filter((f) => f.cat === cat);
          return (
            <section className="panel" key={cat} style={{ marginBottom: 16 }}>
              <div className="panel-h"><h3>{cat}</h3></div>
              {itens.map((f) => {
                const idx = FAQS.indexOf(f);
                return <FaqItem key={idx} faq={f} aberta={aberta === idx} onClick={() => setAberta(aberta === idx ? null : idx)} />;
              })}
            </section>
          );
        })
      )}
    </>
  );
}

function FaqItem({ faq, aberta, onClick }: { faq: Faq; aberta: boolean; onClick: () => void }) {
  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button onClick={onClick} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{faq.q}</span>
        <span style={{ color: "var(--muted)", fontSize: 18, transform: aberta ? "rotate(45deg)" : "none", transition: "transform .15s" }}>+</span>
      </button>
      {aberta && <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{faq.a}</p>}
    </div>
  );
}
