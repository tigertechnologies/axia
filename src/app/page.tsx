import { createSupabaseServer } from "@/lib/supabase/server";
import { getAllEffectivePrices } from "./actions/prices";
import LandingClient from "./LandingClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  let content: Record<string, string> = {};
  try {
    const supabase = createSupabaseServer();
    const { data } = await supabase.from("site_content").select("chave, valor");
    if (data) content = Object.fromEntries(data.map((r: { chave: string; valor: string }) => [r.chave, r.valor]));
  } catch { /* usa padrões */ }

  const precos = await getAllEffectivePrices();

  return <LandingClient content={content} precos={precos} />;
}
