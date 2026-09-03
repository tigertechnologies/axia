import Link from "next/link";

export const metadata = { title: "Termos — AXIA" };

const wrap = { maxWidth: 760, margin: "0 auto", padding: "56px 22px 80px", fontFamily: "'Inter',sans-serif", color: "#28374D", lineHeight: 1.65 } as React.CSSProperties;
const h1 = { fontFamily: "'Sora',sans-serif", fontSize: 30, color: "#10233F", fontWeight: 600, marginBottom: 6 } as React.CSSProperties;
const h2 = { fontFamily: "'Sora',sans-serif", fontSize: 19, color: "#16305B", fontWeight: 600, margin: "28px 0 8px" } as React.CSSProperties;
const p = { fontSize: 15, marginBottom: 10 } as React.CSSProperties;

export default function Termos() {
  return (
    <main style={wrap}>
      <Link href="/" style={{ color: "#4A6FA5", fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13.5 }}>← AXIA</Link>
      <h1 style={{ ...h1, marginTop: 14 }}>Termos de Uso</h1>
      <p style={{ color: "#6B7C93", fontSize: 13 }}>Versão preliminar, sujeita a revisão jurídica antes do lançamento comercial.</p>

      <h2 style={h2}>1. O que é a AXIA</h2>
      <p style={p}>A AXIA é uma ferramenta de <b>apoio à organização</b> da rotina de peritos. Ela identifica e organiza comunicações, sugere datas e reúne informações. <b>Não é</b> sistema oficial de tribunal, não calcula prazos jurídicos de forma definitiva e não substitui a conferência nos sistemas oficiais.</p>

      <h2 style={h2}>2. Responsabilidade do usuário</h2>
      <p style={p}>As classificações e datas apresentadas são <b>sugestões que exigem validação profissional</b>. A decisão e a conferência final de prazos, nomeações e valores são sempre do perito. A AXIA não se responsabiliza por perda de prazo decorrente de não confirmação nos canais oficiais.</p>

      <h2 style={h2}>3. Assinatura</h2>
      <p style={p}>O acesso aos recursos depende de assinatura ativa. A contratação e a cobrança recorrente são processadas por provedor de pagamento. Você pode cancelar conforme as condições do seu plano; o cancelamento encerra a renovação seguinte.</p>

      <h2 style={h2}>4. Uso adequado</h2>
      <p style={p}>Você concorda em não usar a AXIA para fins ilícitos e em fornecer apenas dados que tenha direito de tratar. O uso indevido pode levar à suspensão do acesso.</p>

      <h2 style={h2}>5. Limitações</h2>
      <p style={p}>A AXIA depende de serviços de terceiros (e-mail, pagamento, hospedagem, IA quando habilitada) e não garante disponibilidade ininterrupta nem precisão absoluta da classificação automática.</p>

      <h2 style={h2}>6. Identificação e contato</h2>
      <p style={p}>Os dados da empresa e o foro serão publicados aqui após a formalização cadastral. Dúvidas pelo suporte no aplicativo.</p>
    </main>
  );
}
