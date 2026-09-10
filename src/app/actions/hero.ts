"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

export interface HeroCampanha {
  ativo: boolean;
  titulo: string;
  subtitulo: string;
  cta_label: string;
  cta_url: string;
  imagem_url: string;
  overlay: string; // "escuro" | "claro" | "nenhum"
}

const CHAVES = ["hc_ativo", "hc_titulo", "hc_subtitulo", "hc_cta_label", "hc_cta_url", "hc_imagem_url", "hc_overlay"];

export async function adminGetHero(): Promise<HeroCampanha> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("site_content").select("chave, valor").in("chave", CHAVES);
  const m = Object.fromEntries((data ?? []).map((r: { chave: string; valor: string }) => [r.chave, r.valor]));
  return {
    ativo: m["hc_ativo"] === "1",
    titulo: m["hc_titulo"] ?? "",
    subtitulo: m["hc_subtitulo"] ?? "",
    cta_label: m["hc_cta_label"] ?? "",
    cta_url: m["hc_cta_url"] ?? "",
    imagem_url: m["hc_imagem_url"] ?? "",
    overlay: m["hc_overlay"] ?? "escuro",
  };
}

export async function adminSaveHero(h: HeroCampanha) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const supabase = createSupabaseServer();
  const rows = [
    { chave: "hc_ativo", valor: h.ativo ? "1" : "0" },
    { chave: "hc_titulo", valor: (h.titulo ?? "").slice(0, 200) },
    { chave: "hc_subtitulo", valor: (h.subtitulo ?? "").slice(0, 400) },
    { chave: "hc_cta_label", valor: (h.cta_label ?? "").slice(0, 60) },
    { chave: "hc_cta_url", valor: (h.cta_url ?? "").slice(0, 300) },
    { chave: "hc_overlay", valor: ["escuro", "claro", "nenhum"].includes(h.overlay) ? h.overlay : "escuro" },
  ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));

  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "chave" });
  if (error) return { error: error.message };

  try {
    await supabase.rpc("admin_log_action", { p_action: "hero_salvar", p_target_org: null, p_target_email: null, p_detail: { ativo: h.ativo } });
  } catch { /* best-effort */ }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

// Upload da imagem de fundo do hero (reusa o bucket public-assets do L25).
export async function adminUploadHeroImagem(dataUrl: string, ext: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const e = (ext || "").toLowerCase().replace(".", "");
  if (!["png", "jpg", "jpeg", "webp"].includes(e)) return { error: "Use PNG, JPG ou WEBP." as const };
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { error: "Arquivo inválido." as const };
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 4 * 1024 * 1024) return { error: "Imagem muito grande (máx. 4 MB)." as const };

  const admin = createSupabaseAdmin();
  const caminho = `hero/hero-${Date.now()}.${e}`;
  const { error: upErr } = await admin.storage.from("public-assets").upload(caminho, bytes, { contentType: m[1], upsert: true });
  if (upErr) return { error: 'Não foi possível enviar. Verifique se o bucket "public-assets" existe e é público.' as const };

  const { data: pub } = admin.storage.from("public-assets").getPublicUrl(caminho);
  await admin.from("site_content").upsert({ chave: "hc_imagem_url", valor: pub.publicUrl, updated_at: new Date().toISOString() }, { onConflict: "chave" });
  revalidatePath("/", "layout");
  return { ok: true as const, url: pub.publicUrl };
}
