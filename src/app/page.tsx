import { createSupabaseServer } from "@/lib/supabase/server";
import LandingClient from "./LandingClient";

export const dynamic = "force-dynamic";

// Busca os textos editáveis do site (com tolerância a falha: se a tabela
// ainda não existir, a landing usa os textos padrão embutidos).
export default async function Page() {
  let content: Record<string, string> = {};
  try {
    const supabase = createSupabaseServer();
    const { data } = await supabase.from("site_content").select("chave, valor");
    if (data) content = Object.fromEntries(data.map((r: { chave: string; valor: string }) => [r.chave, r.valor]));
  } catch { /* usa padrões */ }
  return <LandingClient content={content} />;
}
