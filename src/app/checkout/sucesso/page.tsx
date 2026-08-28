import Link from "next/link";
import "../../forms.css";

export default function Sucesso() {
  return (
    <div className="ok-wrap">
      <div className="ok-card">
        <div className="ok-ic">
          <svg width="34" height="34" fill="none" stroke="#1FA89E" strokeWidth={2.4}><path d="M5 17l7 7L29 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1>Bem-vindo à AXIA</h1>
        <p>Sua assinatura está ativa. Vamos configurar sua central em poucos passos.</p>
        <Link className="ok-btn" href="/onboarding">Configurar minha AXIA
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M3 8h9M8 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
      </div>
    </div>
  );
}
