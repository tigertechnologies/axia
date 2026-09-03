import Link from "next/link";

export const metadata = { title: "Privacidade — AXIA" };

const wrap: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "56px 22px 80px", fontFamily: "'Inter',sans-serif", color: "#28374D", lineHeight: 1.65 };
const h1: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 30, color: "#10233F", fontWeight: 600, marginBottom: 6 };
const h2: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 19, color: "#16305B", fontWeight: 600, margin: "28px 0 8px" };
const p: React.CSSProperties = { fontSize: 15, marginBottom: 10 };

export default function Privacidade() {
  return (
    <main style={wrap}>
      <Link href="/" style={{ color: "#4A6FA5", fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13.5 }}>← AXIA</Link>
      <h1 style={{ ...h1, marginTop: 14 }}>Política de Privacidade</h1>
      <p style={{ color: "#6B7C93", fontSize: 13 }}>Versão preliminar, sujeita a revisão jurídica antes do lançamento comercial.</p>

      <h2 style={h2}>1. O que a AXIA faz com seus dados</h2>
      <p style={p}>A AXIA é uma ferramenta de apoio à organização da rotina pericial. Quando você conecta ou encaminha e-mails, a AXIA processa o <b>conteúdo dessas mensagens</b> para identificar e organizar informações como nomeações, prazos, perícias e honorários. O processamento ocorre em nossos servidores.</p>

      <h2 style={h2}>2. Criptografia</h2>
      <p style={p}>Os dados trafegam por conexão criptografada (HTTPS) e são armazenados em provedores que aplicam proteção em repouso. <b>A AXIA não oferece criptografia de ponta a ponta</b>: para classificar as comunicações, nossos servidores (e, quando habilitada, a IA utilizada) precisam acessar o conteúdo das mensagens.</p>

      <h2 style={h2}>3. Minimização</h2>
      <p style={p}>Buscamos processar apenas o necessário para a finalidade de organização pericial. Ainda assim, ao conceder acesso a uma caixa de e-mail, o escopo técnico autorizado pode ser mais amplo do que o filtro interno da AXIA — que seleciona o que é relevante. Explicaremos essa diferença no momento da conexão.</p>

      <h2 style={h2}>4. Dados de terceiros</h2>
      <p style={p}>Mensagens podem conter dados de outras pessoas (partes, advogados, periciandos). Você é responsável por ter base adequada para inseri-los. A AXIA aplica controles de acesso por organização.</p>

      <h2 style={h2}>5. Seus direitos (LGPD)</h2>
      <p style={p}>Você pode solicitar acesso, correção, exportação e exclusão de dados, além de desconectar caixas de e-mail e revogar tokens. Excluir a conta e cancelar a assinatura são processos relacionados, porém distintos.</p>

      <h2 style={h2}>6. Contato</h2>
      <p style={p}>Os dados de identificação da empresa controladora e o canal oficial de privacidade serão publicados aqui após a formalização cadastral. Até lá, use o suporte pelo aplicativo.</p>

      <p style={{ ...p, marginTop: 24, color: "#6B7C93", fontSize: 13 }}>A AXIA não substitui os sistemas oficiais dos tribunais. Datas e classificações são sugestões que exigem validação profissional.</p>
    </main>
  );
}
