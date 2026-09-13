"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export interface RelPorEtapa { stage: string; total: number }
export interface RelMes { mes: string; pericias: number; laudos: number }
export interface RelFinanceiro { total_cents: number; recebido_cents: number; a_receber_cents: number; por_status: { status: string; total_cents: number }[] }
export interface Relatorios {
  totalPericias: number;
  laudosConcluidos: number;      // validados/assinados/protocolados
  porEtapa: RelPorEtapa[];
  evolucao: RelMes[];            // últimos 6 meses
  financeiro: RelFinanceiro;
  tempoMedioDias: number | null; // média entre criação da perícia e laudo validado
}

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

export async function carregarRelatorios(): Promise<Relatorios> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const vazio: Relatorios = { totalPericias: 0, laudosConcluidos: 0, porEtapa: [], evolucao: [], financeiro: { total_cents: 0, recebido_cents: 0, a_receber_cents: 0, por_status: [] }, tempoMedioDias: null };
  if (!user) return vazio;

  const [pe, la, hon] = await Promise.all([
    supabase.from("pericias").select("id, workflow_stage, scheduled_at, updated_at"),
    supabase.from("laudos").select("id, status, created_at, updated_at, pericia_id"),
    supabase.from("honorarios").select("amount_cents, status"),
  ]);

  const pericias = (pe.data ?? []) as any[];
  const laudos = (la.data ?? []) as any[];
  const honorarios = (hon.data ?? []) as any[];

  // Por etapa
  const etapaMap = new Map<string, number>();
  pericias.forEach((p) => { const s = p.workflow_stage ?? "novas_nomeacoes"; etapaMap.set(s, (etapaMap.get(s) ?? 0) + 1); });
  const porEtapa = [...etapaMap.entries()].map(([stage, total]) => ({ stage, total }));

  // Laudos concluídos
  const CONCL = ["validado", "assinado", "protocolado"];
  const laudosConcluidos = laudos.filter((l) => CONCL.includes(l.status)).length;

  // Evolução — últimos 6 meses
  const agora = new Date();
  const evolucao: RelMes[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const ini = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const pQt = pericias.filter((p) => { const t = new Date(p.scheduled_at).getTime(); return t >= ini && t < fim; }).length;
    const lQt = laudos.filter((l) => CONCL.includes(l.status) && (() => { const t = new Date(l.updated_at).getTime(); return t >= ini && t < fim; })()).length;
    evolucao.push({ mes: `${MES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, pericias: pQt, laudos: lQt });
  }

  // Financeiro
  const total = honorarios.reduce((s, h) => s + (h.amount_cents ?? 0), 0);
  const recebidoStatus = ["pago", "recebido"];
  const recebido = honorarios.filter((h) => recebidoStatus.includes(h.status)).reduce((s, h) => s + (h.amount_cents ?? 0), 0);
  const statusMap = new Map<string, number>();
  honorarios.forEach((h) => statusMap.set(h.status, (statusMap.get(h.status) ?? 0) + (h.amount_cents ?? 0)));
  const financeiro: RelFinanceiro = {
    total_cents: total, recebido_cents: recebido, a_receber_cents: total - recebido,
    por_status: [...statusMap.entries()].map(([status, total_cents]) => ({ status, total_cents })),
  };

  // Tempo médio (dias) entre criação da perícia e laudo validado
  let somaDias = 0, cont = 0;
  laudos.filter((l) => CONCL.includes(l.status)).forEach((l) => {
    const per = pericias.find((p) => p.id === l.pericia_id);
    if (per) {
      const d1 = new Date(per.scheduled_at).getTime();
      const d2 = new Date(l.updated_at).getTime();
      if (d2 >= d1) { somaDias += (d2 - d1) / 86400000; cont++; }
    }
  });
  const tempoMedioDias = cont > 0 ? Math.round(somaDias / cont) : null;

  return { totalPericias: pericias.length, laudosConcluidos, porEtapa, evolucao, financeiro, tempoMedioDias };
}
