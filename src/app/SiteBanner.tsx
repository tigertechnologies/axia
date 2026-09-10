import { createSupabaseServer } from "@/lib/supabase/server";
import BannerBar from "./BannerBar";

// Busca o banner ativo e o renderiza no topo de todas as páginas.
// Tolerante a falha: se a tabela ainda não existir (migração não rodada),
// não quebra o site — apenas não mostra banner.
export default async function SiteBanner() {
  try {
    const supabase = createSupabaseServer();
    const { data } = await supabase.from("site_banner").select("*").eq("id", 1).maybeSingle();
    if (!data || !data.ativo || !data.mensagem) return null;
    return (
      <BannerBar
        mensagem={data.mensagem}
        variante={data.variante ?? "info"}
        linkUrl={data.link_url ?? null}
        linkLabel={data.link_label ?? null}
      />
    );
  } catch {
    return null;
  }
}
