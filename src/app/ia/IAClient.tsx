"use client";

interface StatusIA { configurada: boolean; provedor: string | null; usadas: number; limite: number }

const FUNCOES = [
  { icon: "📄", nome: "Gerador de Laudos", desc: "Gera uma minuta estruturada do laudo a partir dos dados do processo e dos quesitos. Você revisa e valida — a IA nunca conclui sozinha." },
  { icon: "❓", nome: "Respostas a Quesitos", desc: "Sugere rascunhos de resposta aos quesitos com base no contexto do processo. Sempre com revisão médica." },
  { icon: "📊", nome: "Análise de Risco", desc: "Score por processo: sinaliza prazos apertados, pendências e pontos de atenção." },
  { icon: "💬", nome: "Chat Jurídico", desc: "Tire dúvidas técnicas sobre perícia, procedimentos e prazos a qualquer hora." },
  { icon: "👁️", nome: "Leitura de Documentos", desc: "Extrai dados de PDFs, exames e recibos automaticamente." },
  { icon: "📚", nome: "Análise de PDFs", desc: "Processa documentos longos (centenas de páginas) e resume o essencial." },
  { icon: "⚡", nome: "Priorização de Tarefas", desc: "Ordena suas tarefas por urgência real, considerando prazos e etapas." },
  { icon: "✨", nome: "Insights Diários", desc: "Sugestões práticas toda manhã: o que fazer primeiro, o que está vencendo." },
];

export default function IAClient({ status }: { status: StatusIA }) {
  const pct = status.limite > 0 ? Math.round((status.usadas / status.limite) * 100) : 0;

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Inteligência AXIA</h1><p className="sum">IA pensada para peritos: gera minutas, analisa documentos e responde dúvidas técnicas — sempre com sua revisão.</p></div>
      </div>

      {/* Status da IA */}
      {status.configurada ? (
        <div className="atencao-box" style={{ marginBottom: 20 }}>
          <div className="atencao-item u-info" style={{ borderBottom: "none" }}>
            <div className="atencao-dot" style={{ background: "#0F7A70" }} />
            <div className="atencao-corpo">
              <div className="atencao-t" style={{ color: "#0F7A70" }}>IA ativada ({status.provedor})</div>
              <div className="atencao-s">Uso do mês: {status.usadas} de {status.limite} análises ({pct}%)</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(74,111,165,.08)", border: "1px solid rgba(74,111,165,.25)", borderRadius: 12, padding: "16px 18px", marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#3B5B86", marginBottom: 4 }}>🔑 IA ainda não ativada</div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            As funções abaixo estão prontas na plataforma. Para ativá-las, é preciso configurar uma chave de IA (OpenAI ou Anthropic) — cada análise tem um custo por uso, com franquia mensal conforme o plano. Assim que a chave for configurada, tudo aqui passa a funcionar.
          </div>
        </div>
      )}

      {/* Grade de funções */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {FUNCOES.map((f) => (
          <div key={f.nome} className="ia-card">
            <div className="ia-card-ico">{f.icon}</div>
            <div className="ia-card-nome">{f.nome}</div>
            <div className="ia-card-desc">{f.desc}</div>
            <div className={"ia-card-status " + (status.configurada ? "on" : "off")}>
              {status.configurada ? "● Disponível" : "○ Ao ativar a IA"}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 20, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7 }}>
        <b>Regra de ouro da AXIA:</b> a IA é uma ferramenta de apoio. Ela organiza, sugere e resume — mas <b>nunca</b> inventa exames, diagnósticos ou conclusões, e <b>nunca</b> assina ou protocola sozinha. Toda decisão médica e todo ato de responsabilidade continuam sendo seus.
      </p>
    </>
  );
}
