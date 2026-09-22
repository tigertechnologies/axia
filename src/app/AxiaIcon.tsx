// ============================================================
// AXIA — Biblioteca de ícones hi-tech (monocromáticos, lineares)
// Desenhados sob medida. Uso: <AxiaIcon name="journey" size={24} />
// ============================================================
import React from "react";

const PATHS: Record<string, React.ReactNode> = {
  // Navegação principal
  dash: <><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
  journey: <><path d="M4 6h5M4 12h5M4 18h5"/><rect x="13" y="4" width="7" height="6" rx="1.5"/><rect x="13" y="14" width="7" height="6" rx="1.5"/></>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>,
  inbox: <><path d="M3 13l3-8h12l3 8v5a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 13h5l1.5 3h5L16 13h5"/></>,
  ia: <><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/><rect x="7.5" y="7.5" width="9" height="9" rx="2.5"/><circle cx="12" cy="12" r="1.8"/></>,
  money: <><rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v6M18 9v6"/></>,
  calc: <><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3"/></>,
  cal: <><rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 9h16M8 3v4M16 3v4"/></>,
  chart: <><path d="M4 20V4M4 20h16"/><path d="M8 16l3-4 3 2 4-6"/></>,
  doc: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></>,
  scale: <><path d="M12 3v18M7 21h10"/><path d="M12 6l-6 2 6-2 6 2-6-2M6 8l-2.5 5a2.5 2.5 0 005 0zM18 8l-2.5 5a2.5 2.5 0 005 0z"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M4 20a5 5 0 0110 0"/><path d="M16 6a3 3 0 010 6M15 13a5 5 0 015 5"/></>,
  contact: <><rect x="4" y="4" width="16" height="16" rx="2.5"/><circle cx="12" cy="10" r="2.4"/><path d="M8 17a4 4 0 018 0"/></>,
  search: <><circle cx="9" cy="9" r="6"/><path d="M18 18l-4-4"/></>,
  spark: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  msg: <><path d="M4 5h16v11H9l-4 3v-3H4z"/></>,
  shield: <><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/></>,
  gear: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>,
  bell: <><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 004 0"/></>,
  store: <><path d="M4 9l1.5-5h13L20 9M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M4 9h16"/><path d="M9 20v-6h6v6"/></>,
  help: <><circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 013.5 2c0 1.5-2 2-2 3M12 17h.01"/></>,
  logout: <><path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 12H9M16 12l-3-3M16 12l-3 3"/></>,
};

export function AxiaIcon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={"axia-ic " + className} aria-hidden>
      {PATHS[name] ?? PATHS.dash}
    </svg>
  );
}
