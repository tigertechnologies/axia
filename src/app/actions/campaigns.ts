"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

export interface Campanha {
  codigo: string;            // ex.: BLACK50
  promoId: string;           // promotion_code id
  couponId: string;
  ativo: boolean;
  descontoLabel: string;     // "50% off" | "R$ 30,00 off"
  duracaoLabel: string;      // "primeira cobrança" | "3 meses" | "para sempre"
  usos: number;
  maxUsos: number | null;
  expiraEm: number | null;   // epoch (s) do fim do resgate
  criadoEm: number;
}

export interface NovaCampanhaInput {
  nome: string;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: number;                 // % (1..100) ou centavos (fixo)
  duracao: "once" | "repeating" | "forever";
  meses?: number;                // quando duracao = repeating
  inicioTs?: number | null;      // epoch (s) — início do resgate (informativo)
  fimTs?: number | null;         // epoch (s) — fim do resgate (expires_at)
  maxUsos?: number | null;
}

// Lista campanhas = promotion codes do Stripe (com o cupom associado).
export async function adminListCampanhas(): Promise<{ error?: string; data?: Campanha[] }> {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" };
  try {
    const res = await stripe().promotionCodes.list({ limit: 100, expand: ["data.coupon"] });
    const data: Campanha[] = res.data.map((pc) => {
      const c: any = pc.coupon;
      const desconto = c?.percent_off != null ? `${c.percent_off}% off`
        : c?.amount_off != null ? `${(c.amount_off / 100).toLocaleString("pt-BR", { style: "currency", currency: (c.currency || "brl").toUpperCase() })} off`
        : "—";
      const dur = c?.duration === "forever" ? "para sempre"
        : c?.duration === "once" ? "primeira cobrança"
        : c?.duration === "repeating" ? `${c.duration_in_months} ${c.duration_in_months === 1 ? "mês" : "meses"}`
        : "—";
      return {
        codigo: pc.code, promoId: pc.id, couponId: c?.id ?? "",
        ativo: pc.active, descontoLabel: desconto, duracaoLabel: dur,
        usos: pc.times_redeemed ?? 0, maxUsos: pc.max_redemptions ?? null,
        expiraEm: pc.expires_at ?? null, criadoEm: pc.created,
      };
    });
    return { data };
  } catch {
    return { error: "Falha ao ler campanhas no Stripe. Verifique as chaves em Sistema › Configuração." };
  }
}

export async function adminCriarCampanha(input: NovaCampanhaInput) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };

  const codigo = (input.codigo || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{3,40}$/.test(codigo)) return { error: "Código inválido. Use letras e números (3–40)." as const };
  if (input.tipo === "percentual" && (input.valor < 1 || input.valor > 100)) return { error: "Percentual deve ser entre 1 e 100." as const };
  if (input.tipo === "fixo" && input.valor < 1) return { error: "Valor fixo inválido." as const };
  if (input.duracao === "repeating" && (!input.meses || input.meses < 1)) return { error: "Informe a quantidade de meses." as const };

  try {
    // 1) Cupom = a regra do desconto
    const couponParams: any = {
      name: input.nome?.slice(0, 60) || codigo,
      duration: input.duracao,
    };
    if (input.tipo === "percentual") couponParams.percent_off = input.valor;
    else { couponParams.amount_off = input.valor; couponParams.currency = "brl"; }
    if (input.duracao === "repeating") couponParams.duration_in_months = input.meses;

    const coupon = await stripe().coupons.create(couponParams);

    // 2) Código promocional = o texto que o cliente digita
    const promoParams: any = { coupon: coupon.id, code: codigo };
    if (input.maxUsos && input.maxUsos > 0) promoParams.max_redemptions = input.maxUsos;
    if (input.fimTs) promoParams.expires_at = input.fimTs;

    const promo = await stripe().promotionCodes.create(promoParams);

    try {
      const supabase = createSupabaseServer();
      await supabase.rpc("admin_log_action", {
        p_action: "campanha_criar", p_target_org: null, p_target_email: null,
        p_detail: { codigo, coupon: coupon.id, promo: promo.id },
      });
    } catch { /* best-effort */ }

    revalidatePath("/admin");
    return { ok: true as const, codigo };
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? "";
    if (/already exists/i.test(msg)) return { error: "Já existe um código com esse nome no Stripe." as const };
    return { error: "Falha ao criar a campanha no Stripe. Verifique as chaves." as const };
  }
}

// Ativa/desativa um código promocional (não apaga histórico).
export async function adminToggleCampanha(promoId: string, ativo: boolean) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  try {
    await stripe().promotionCodes.update(promoId, { active: ativo });
    try {
      const supabase = createSupabaseServer();
      await supabase.rpc("admin_log_action", { p_action: "campanha_toggle", p_target_org: null, p_target_email: null, p_detail: { promo: promoId, ativo } });
    } catch { /* best-effort */ }
    revalidatePath("/admin");
    return { ok: true as const };
  } catch {
    return { error: "Falha ao atualizar a campanha no Stripe." as const };
  }
}
