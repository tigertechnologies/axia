import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import "../../forms.css";

export const dynamic = "force-dynamic";

// A14: consulta o estado REAL da assinatura. Nunca ativa por query string.
export default async function Sucesso() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations").select("subscription_status")
    .eq("owner_id", user.id).maybeSingle();

  const status = org?.subscription_status ?? "pending_subscription";
  const ativa = status === "active" || status === "trialing";

  return (
    <div className="ok-wrap">
      <div className="ok-card">
        <div className="ok-ic">
          {ativa ? (
            <svg width="34" height="34" fill="none" stroke="#1FA89E" strokeWidth={2.4}><path d="M5 17l7 7L29 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="34" height="34" fill="none" stroke="#A8C4E0" strokeWidth={2.4}><circle cx="17" cy="17" r="14"/><path d="M17 9v9l6 3" strokeLinecap="round"/></svg>
          )}
        </div>
        {ativa ? (
          <>
            <h1>Bem-vindo à AXIA</h1>
            <p>Sua assinatura está ativa. Vamos configurar sua central em poucos passos.</p>
            <Link className="ok-btn" href="/onboarding">Configurar minha AXIA
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M3 8h9M8 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </>
        ) : (
          <>
            <h1>Estamos confirmando seu pagamento</h1>
            <p>Seu pagamento foi enviado e estamos aguardando a confirmação do provedor. Isso costuma levar alguns segundos. Atualize esta página em instantes.</p>
            <Link className="ok-btn" href="/checkout/sucesso">Atualizar
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M13 8a5 5 0 11-1.5-3.5M13 2v3h-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
