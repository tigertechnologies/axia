"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

export interface HeroCampanha {
  ativo: boolean;
  tipo: string;           // gradiente | imagem | video | carrossel
  titulo: string;
  subtitulo: string;
  cta_label: string;
  cta_url: string;
  imagem_url: string;     // imagem única (tipo=imagem)
  video_url: string;      // vídeo (tipo=video)
  imagens: string[];      // carrossel (tipo=carrossel)
  overlay: string;        // escuro | claro | nenhum
  inicio: string;         // ISO date ou "" (agendamento)
  fim: string;            // ISO date ou ""
}

const CHAVES = ["hc_ativo", "hc_tipo", "hc_titulo", "hc_subtitulo", "hc_cta_label", "hc_cta_url", "hc_imagem_url", "hc_video_url", "hc_imagens", "hc_overlay", "hc_inicio", "hc_fim"];

export async function adminGetHero(): Promise<HeroCampanha> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("site_content").select("chave, valor").in("chave", CHAVES);
  const m = Object.fromEntries((data ?? []).map((r: { chave: string; valor: string }) => [r.chave, r.valor]));
  let imagens: string[] = [];
  try { imagens = m["hc_imagens"] ? JSON.parse(m["hc_imagens"]) : []; } catch { imagens = []; }
  return {
    ativo: m["hc_ativo"] === "1",
    tipo: m["hc_tipo"] ?? (m["hc_imagem_url"] ? "imagem" : "gradiente"),
    titulo: m["hc_titulo"] ?? "",
    subtitulo: m["hc_subtitulo"] ?? "",
    cta_label: m["hc_cta_label"] ?? "",
    cta_url: m["hc_cta_url"] ?? "",
    imagem_url: m["hc_imagem_url"] ?? "",
    video_url: m["hc_video_url"] ?? "",
    imagens,
    overlay: m["hc_overlay"] ?? "escuro",
    inicio: m["hc_inicio"] ?? "",
    fim: m["hc_fim"] ?? "",
  };
}

export async function adminSaveHero(h: HeroCampanha) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const supabase = createSupabaseServer();
  const rows = [
    { chave: "hc_ativo", valor: h.ativo ? "1" : "0" },
    { chave: "hc_tipo", valor: ["gradiente", "imagem", "video", "carrossel"].includes(h.tipo) ? h.tipo : "gradiente" },
    { chave: "hc_titulo", valor: (h.titulo ?? "").slice(0, 200) },
    { chave: "hc_subtitulo", valor: (h.subtitulo ?? "").slice(0, 400) },
    { chave: "hc_cta_label", valor: (h.cta_label ?? "").slice(0, 60) },
    { chave: "hc_cta_url", valor: (h.cta_url ?? "").slice(0, 300) },
    { chave: "hc_overlay", valor: ["escuro", "claro", "nenhum"].includes(h.overlay) ? h.overlay : "escuro" },
    { chave: "hc_inicio", valor: h.inicio ?? "" },
    { chave: "hc_fim", valor: h.fim ?? "" },
  ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));

  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "chave" });
  if (error) return { error: error.message };

  try {
    await supabase.rpc("admin_log_action", { p_action: "hero_salvar", p_target_org: null, p_target_email: null, p_detail: { ativo: h.ativo, tipo: h.tipo } });
  } catch { /* best-effort */ }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

// Upload de mídia do hero. tipo: 'imagem' (única), 'video' (mp4), 'carrossel' (acumula).
export async function adminUploadHeroMidia(dataUrl: string, ext: string, alvo: "imagem" | "video" | "carrossel") {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const e = (ext || "").toLowerCase().replace(".", "");
  const imgOk = ["png", "jpg", "jpeg", "webp"];
  const vidOk = ["mp4", "webm"];
  const permitido = alvo === "video" ? vidOk : imgOk;
  if (!permitido.includes(e)) return { error: alvo === "video" ? "Use MP4 ou WEBM." as const : "Use PNG, JPG ou WEBP." as const };

  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { error: "Arquivo inválido." as const };
  const bytes = Buffer.from(m[2], "base64");
  const limite = alvo === "video" ? 10 * 1024 * 1024 : 4 * 1024 * 1024;
  if (bytes.length > limite) return { error: `Arquivo muito grande (máx. ${alvo === "video" ? "10" : "4"} MB).` as const };

  const admin = createSupabaseAdmin();
  const caminho = `hero/${alvo}-${Date.now()}.${e}`;
  const { error: upErr } = await admin.storage.from("public-assets").upload(caminho, bytes, { contentType: m[1], upsert: true });
  if (upErr) return { error: 'Não foi possível enviar. Verifique se o bucket "public-assets" existe e é público.' as const };
  const { data: pub } = admin.storage.from("public-assets").getPublicUrl(caminho);
  const url = pub.publicUrl;

  if (alvo === "video") {
    await admin.from("site_content").upsert({ chave: "hc_video_url", valor: url, updated_at: new Date().toISOString() }, { onConflict: "chave" });
  } else if (alvo === "imagem") {
    await admin.from("site_content").upsert({ chave: "hc_imagem_url", valor: url, updated_at: new Date().toISOString() }, { onConflict: "chave" });
  } else {
    // carrossel: acumula na lista
    const { data } = await admin.from("site_content").select("valor").eq("chave", "hc_imagens").maybeSingle();
    let lista: string[] = [];
    try { lista = data?.valor ? JSON.parse(data.valor) : []; } catch { lista = []; }
    lista.push(url);
    await admin.from("site_content").upsert({ chave: "hc_imagens", valor: JSON.stringify(lista.slice(0, 8)), updated_at: new Date().toISOString() }, { onConflict: "chave" });
  }
  revalidatePath("/", "layout");
  return { ok: true as const, url };
}

// Remove uma imagem do carrossel pelo índice.
export async function adminRemoverImagemCarrossel(indice: number) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("site_content").select("valor").eq("chave", "hc_imagens").maybeSingle();
  let lista: string[] = [];
  try { lista = data?.valor ? JSON.parse(data.valor) : []; } catch { lista = []; }
  lista.splice(indice, 1);
  await admin.from("site_content").upsert({ chave: "hc_imagens", valor: JSON.stringify(lista), updated_at: new Date().toISOString() }, { onConflict: "chave" });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
