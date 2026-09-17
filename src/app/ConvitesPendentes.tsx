"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aceitarConvite, recusarConvite, type ConvitePendente } from "@/app/actions/convites";

const PAPEL_LABEL: Record<string, string> = {
  medico: "Médico perito", assistente: "Assistente", administrativo: "Administrativo",
  financeiro: "Financeiro", revisor: "Revisor", leitura: "Somente leitura",
};

export default function ConvitesPendentes({ convites }: { convites: ConvitePendente[] }) {
  const router = useRouter();
  const [lista, setLista] = useState(convites);
  const [, startT] = useTransition();

  if (lista.length === 0) return null;

  async function aceitar(id: string) {
    const r = await aceitarConvite(id);
    if (!r.error) { setLista((l) => l.filter((c) => c.id !== id)); router.refresh(); }
  }
  async function recusar(id: string) {
    await recusarConvite(id);
    setLista((l) => l.filter((c) => c.id !== id));
  }

  return (
    <div style={{ marginBottom: 22 }}>
      {lista.map((c) => (
        <div key={c.id} style={{ background: "rgba(31,168,158,.08)", border: "1px solid rgba(31,168,158,.3)", borderRadius: 12, padding: "16px 18px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Convite para equipe</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              Você foi convidado para <b>{c.org_nome ?? "uma organização"}</b> como <b>{PAPEL_LABEL[c.papel] ?? c.papel}</b>.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={() => startT(() => aceitar(c.id))}>Aceitar</button>
            <button className="btn btn-ghost" onClick={() => startT(() => recusar(c.id))}>Recusar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
