"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Lancamento {
  id: string; tipo: string; descricao: string; categoria: string | null;
  valor_cents: number; metodo: string | null; status: string; process_ref: string | null; data: string;
}
export interface ResumoFinanceiro {
  receitas_cents: number; despesas_cents: number; saldo_cents: number;
  pendente_cents: number; recebido_cents: number;
}

export async function listarLancamentos(periodo?: "hoje" | "semana" | "mes" | "ano" | "todos"): Promise<{ itens: Lancamento[]; resumo: ResumoFinanceiro }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const vazio = { itens: [], resumo: { receitas_cents: 0, despesas_cents: 0, saldo_cents: 0, pendente_cents: 0, recebido_cents: 0 } };
  if (!user) return vazio;

  let query = supabase.from("financeiro_lancamentos").select("id, tipo, descricao, categoria, valor_cents, metodo, status, process_ref, data").order("data", { ascending: false }).limit(500);
  if (periodo && periodo !== "todos") {
    const hoje = new Date(); let ini = new Date();
    if (periodo === "hoje") ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    else if (periodo === "semana") ini = new Date(hoje.getTime() - 7 * 86400000);
    else if (periodo === "mes") ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    else if (periodo === "ano") ini = new Date(hoje.getFullYear(), 0, 1);
    query = query.gte("data", ini.toISOString().slice(0, 10));
  }
  const { data } = await query;
  const itens = (data ?? []) as Lancamento[];

  const receitas = itens.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor_cents, 0);
  const despesas = itens.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor_cents, 0);
  const recebido = itens.filter((l) => l.tipo === "receita" && l.status === "pago").reduce((s, l) => s + l.valor_cents, 0);
  const pendente = itens.filter((l) => l.tipo === "receita" && l.status !== "pago").reduce((s, l) => s + l.valor_cents, 0);

  return { itens, resumo: { receitas_cents: receitas, despesas_cents: despesas, saldo_cents: receitas - despesas, pendente_cents: pendente, recebido_cents: recebido } };
}

export async function salvarLancamento(input: {
  id?: string; tipo: string; descricao: string; categoria?: string; valor: number; metodo?: string; status?: string; process_ref?: string; data?: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!input.descricao?.trim()) return { error: "Informe a descrição." };
  if (!input.valor || input.valor <= 0) return { error: "Informe o valor." };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "NO_ORG" };

  const payload = {
    tipo: input.tipo === "despesa" ? "despesa" : "receita",
    descricao: input.descricao.slice(0, 200), categoria: input.categoria || null,
    valor_cents: Math.round(input.valor), metodo: input.metodo || null,
    status: ["pago", "pendente", "previsto"].includes(input.status ?? "") ? input.status : "pago",
    process_ref: input.process_ref || null, data: input.data || new Date().toISOString().slice(0, 10),
  };
  if (input.id) {
    const { error } = await supabase.from("financeiro_lancamentos").update(payload).eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("financeiro_lancamentos").insert({ ...payload, org_id: org.id, created_by: user.id });
    if (error) return { error: error.message };
  }
  revalidatePath("/honorarios");
  return { ok: true };
}

export async function excluirLancamento(id: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("financeiro_lancamentos").delete().eq("id", id);
  revalidatePath("/honorarios");
  return { ok: true };
}
