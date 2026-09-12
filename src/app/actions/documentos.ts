"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

// Bucket PRIVADO para documentos periciais (exames, petições, laudos).
// NUNCA público — acesso só por URL assinada de curta duração (seção 11.2).
const BUCKET = "pericia-docs";

const MIME_PERMITIDOS = [
  "application/pdf",
  "image/png", "image/jpeg", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export interface DocItem {
  id: string; tipo: string | null; nome_original: string | null; mime: string | null;
  tamanho_bytes: number | null; segredo_justica: boolean; created_at: string;
}

// Faz upload de um documento vinculado à perícia. Valida MIME/tamanho,
// calcula checksum, usa nome interno aleatório (nunca o nome original como caminho).
export async function uploadDocumento(input: {
  periciaId: string; dataUrl: string; nomeOriginal: string; tipo?: string; segredo?: boolean;
}): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };

  // Confirma que a perícia é da org do usuário (RLS + checagem server-side).
  const { data: pe } = await supabase.from("pericias").select("id, org_id, processo_id").eq("id", input.periciaId).maybeSingle();
  if (!pe) return { error: "PROCESS_NOT_FOUND" };

  const m = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { error: "Arquivo inválido." };
  const mime = m[1];
  if (!MIME_PERMITIDOS.includes(mime)) return { error: "Tipo de arquivo não permitido (use PDF, imagem, DOCX ou XLSX)." };
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_BYTES) return { error: "Arquivo muito grande (máx. 20 MB)." };

  const checksum = createHash("sha256").update(bytes).digest("hex");
  // Nome interno aleatório; a extensão só orienta o navegador ao baixar.
  const ext = (input.nomeOriginal.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const storagePath = `${pe.org_id}/${input.periciaId}/${randomUUID()}.${ext}`;

  const admin = createSupabaseAdmin();
  const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, bytes, { contentType: mime, upsert: false });
  if (upErr) {
    return { error: `Não foi possível enviar. Verifique se o bucket PRIVADO "${BUCKET}" existe no Supabase Storage.` };
  }

  const { error: dbErr } = await supabase.from("pericia_documents").insert({
    org_id: pe.org_id, pericia_id: pe.id, processo_id: pe.processo_id,
    tipo: input.tipo ?? "documento", storage_path: storagePath,
    nome_original: input.nomeOriginal.slice(0, 200), mime, tamanho_bytes: bytes.length,
    checksum_sha256: checksum, segredo_justica: !!input.segredo, uploaded_by: user.id,
  });
  if (dbErr) {
    // rollback do arquivo se o metadado falhar
    try { await admin.storage.from(BUCKET).remove([storagePath]); } catch {}
    return { error: dbErr.message };
  }

  try {
    await supabase.from("audit_logs").insert({
      org_id: pe.org_id, actor_id: user.id, action: "documento.upload", entity_type: "documento", entity_id: pe.id,
      metadata: { tipo: input.tipo ?? "documento", tamanho: bytes.length },
    });
  } catch { /* best-effort */ }

  revalidatePath("/jornada");
  return { ok: true };
}

export async function listarDocumentos(periciaId: string): Promise<DocItem[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("pericia_documents")
    .select("id, tipo, nome_original, mime, tamanho_bytes, segredo_justica, created_at")
    .eq("pericia_id", periciaId).order("created_at", { ascending: false });
  return (data ?? []) as DocItem[];
}

// Gera uma URL ASSINADA de curta duração (60s) para ver/baixar o documento.
// Registra o acesso na auditoria (seção 23.3).
export async function urlAssinadaDocumento(documentoId: string): Promise<{ error?: string; url?: string }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };

  // A RLS garante que só documentos da org do usuário retornam.
  const { data: doc } = await supabase.from("pericia_documents").select("org_id, storage_path, nome_original").eq("id", documentoId).maybeSingle();
  if (!doc) return { error: "NOT_FOUND" };

  const admin = createSupabaseAdmin();
  const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60, { download: doc.nome_original ?? undefined });
  if (error || !signed) return { error: "Não foi possível gerar o link." };

  try {
    await supabase.from("audit_logs").insert({ org_id: doc.org_id, actor_id: user.id, action: "documento.download", entity_type: "documento", entity_id: documentoId });
  } catch { /* best-effort */ }

  return { url: signed.signedUrl };
}

export async function excluirDocumento(documentoId: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  const { data: doc } = await supabase.from("pericia_documents").select("org_id, storage_path").eq("id", documentoId).maybeSingle();
  if (!doc) return { error: "NOT_FOUND" };

  const admin = createSupabaseAdmin();
  try { await admin.storage.from(BUCKET).remove([doc.storage_path]); } catch {}
  const { error } = await supabase.from("pericia_documents").delete().eq("id", documentoId);
  if (error) return { error: error.message };
  try { await supabase.from("audit_logs").insert({ org_id: doc.org_id, actor_id: user.id, action: "documento.excluir", entity_type: "documento", entity_id: documentoId }); } catch {}
  revalidatePath("/jornada");
  return { ok: true };
}
