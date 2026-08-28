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
  office_monthly:    { code: "office",    name: "AXIA Office",    interval: "month", amount: 24990 },
  office_annual:     { code: "office",    name: "AXIA Office",    interval: "year",  amount: 249900 },
};

export function getPlan(planId: string): PlanDef | null {
  return PLANS[planId] ?? null;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
