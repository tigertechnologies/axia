"use server";

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

const BUCKET = "public-assets";

// Recebe o PNG/JPG/SVG da logo (base64), salva no Storage e grava a URL em site_content.
export async function adminUploadLogo(dataUrl: string, ext: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };

  const permitidos = ["png", "jpg", "jpeg", "svg", "webp"];
  const e = (ext || "").toLowerCase().replace(".", "");
  if (!permitidos.includes(e)) return { error: "Formato inválido. Use PNG, JPG, SVG ou WEBP." as const };

  // dataUrl no formato "data:<mime>;base64,<dados>"
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { error: "Arquivo inválido." as const };
  const contentType = m[1];
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 2 * 1024 * 1024) return { error: "Arquivo muito grande (máx. 2 MB)." as const };

  const admin = createSupabaseAdmin();
  const caminho = `logo/logo-${Date.now()}.${e}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(caminho, bytes, { contentType, upsert: true });
  if (upErr) {
    return { error: `Não foi possível enviar. Verifique se o bucket "${BUCKET}" existe e é público no Supabase Storage.` as const };
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(caminho);
  const url = pub.publicUrl;

  const { error: dbErr } = await admin.from("site_content").upsert(
    { chave: "logo_url", valor: url, updated_at: new Date().toISOString() },
    { onConflict: "chave" },
  );
  if (dbErr) return { error: dbErr.message };

  try {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    await createSupabaseServer().rpc("admin_log_action", { p_action: "logo_upload", p_target_org: null, p_target_email: null, p_detail: { url } });
  } catch { /* best-effort */ }

  revalidatePath("/", "layout");
  return { ok: true as const, url };
}

// Remove a logo personalizada (volta para o símbolo padrão).
export async function adminRemoverLogo() {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const admin = createSupabaseAdmin();
  await admin.from("site_content").upsert({ chave: "logo_url", valor: "", updated_at: new Date().toISOString() }, { onConflict: "chave" });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
