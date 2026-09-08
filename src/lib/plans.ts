// Fonte da verdade dos preços. O frontend só envia plan_id; o backend
// resolve preço aqui. NUNCA confiar em valor vindo do cliente.

export type PlanCode = "essential" | "pro" | "office";
export type Interval = "month" | "year";

export interface PlanDef {
  code: PlanCode;
  name: string;
  interval: Interval;
  amount: number; // centavos (BRL)
}

export const PLANS: Record<string, PlanDef> = {
  essential_monthly: { code: "essential", name: "AXIA Essential", interval: "month", amount: 6990 },
  essential_annual:  { code: "essential", name: "AXIA Essential", interval: "year",  amount: 69900 },
  pro_monthly:       { code: "pro",       name: "AXIA Pro",       interval: "month", amount: 11990 },
  pro_annual:        { code: "pro",       name: "AXIA Pro",       interval: "year",  amount: 119900 },
  office_monthly:    { code: "office",    name: "AXIA Master",    interval: "month", amount: 24990 },
  office_annual:     { code: "office",    name: "AXIA Master",    interval: "year",  amount: 249900 },
};

export function getPlan(planId: string): PlanDef | null {
  return PLANS[planId] ?? null;
}

// ── Direitos por plano (fonte única da verdade) ─────────────
// Recursos liberados e limite de análises/mês. O servidor usa isto para
// bloquear o que o plano não inclui e para aplicar o limite de volume.
export type Feature = "pericias" | "honorarios" | "processos" | "agenda" | "relatorios";

export interface Entitlement {
  features: Feature[];
  analisesMes: number | null; // null = ilimitado
}

export const ENTITLEMENTS: Record<PlanCode, Entitlement> = {
  essential: { features: [], analisesMes: 100 },
  pro:       { features: ["pericias", "honorarios", "processos", "agenda"], analisesMes: 500 },
  office:    { features: ["pericias", "honorarios", "processos", "agenda", "relatorios"], analisesMes: null },
};

// Deriva o código do plano a partir do plan_id (ex.: "pro_monthly" -> "pro").
export function planCode(planId: string | null): PlanCode {
  if (!planId) return "essential";
  const c = planId.split("_")[0];
  return (["essential", "pro", "office"].includes(c) ? c : "essential") as PlanCode;
}

// Um status de assinatura considerado "ativo" libera os recursos do plano.
export function isActiveStatus(status: string | null): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function planAllows(planId: string | null, status: string | null, feature: Feature): boolean {
  if (!isActiveStatus(status)) return false;
  return ENTITLEMENTS[planCode(planId)].features.includes(feature);
}

export function analiseLimit(planId: string | null): number | null {
  return ENTITLEMENTS[planCode(planId)].analisesMes;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
