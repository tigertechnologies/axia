"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { buscaGlobal, type ResultadoBusca } from "./actions/busca-global";

const TIPO_ICON: Record<string, string> = { pericia: "🩺", processo: "⚖️", laudo: "📄", documento: "📎", tarefa: "✅", contato: "👤", comunicacao: "📨", honorario: "💰" };
const TIPO_LABEL: Record<string, string> = { pericia: "Perícia", processo: "Processo", laudo: "Laudo", documento: "Documento", tarefa: "Tarefa", contato: "Contato", comunicacao: "Comunicação", honorario: "Honorário" };

// Atalhos fixos (navegação rápida) mostrados quando não há busca.
const ATALHOS: { titulo: string; href: string; icon: string }[] = [
  { titulo: "Jornada pericial", href: "/jornada", icon: "🗂️" },
  { titulo: "Dashboard", href: "/dashboard", icon: "🏠" },
  { titulo: "Inbox", href: "/inbox", icon: "📥" },
  { titulo: "Honorários", href: "/honorarios", icon: "💰" },
  { titulo: "Cálculos", href: "/calculos", icon: "🧮" },
  { titulo: "Agenda", href: "/agenda", icon: "📅" },
];

export default function CommandPalette() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atalho global Cmd+K / Ctrl+K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setAberto((v) => !v); }
      if (e.key === "Escape") setAberto(false);
    }
    function onOpen() { setAberto(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("axia-open-cmdk", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("axia-open-cmdk", onOpen); };
  }, []);

  useEffect(() => { if (aberto) { setTimeout(() => inputRef.current?.focus(), 40); setSel(0); } else { setQ(""); setResultados([]); } }, [aberto]);

  // Busca com debounce.
  const buscar = useCallback((termo: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (termo.trim().length < 2) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const r = await buscaGlobal(termo);
      setResultados(r); setBuscando(false); setSel(0);
    }, 250);
  }, []);

  function onChange(v: string) { setQ(v); buscar(v); }

  const lista = q.trim().length >= 2 ? resultados : [];
  const mostrarAtalhos = q.trim().length < 2;

  function irPara(href: string) { setAberto(false); router.push(href); }

  function onKeyList(e: React.KeyboardEvent) {
    const itens = mostrarAtalhos ? ATALHOS.length : lista.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, itens - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (mostrarAtalhos) { const a = ATALHOS[sel]; if (a) irPara(a.href); }
      else { const r = lista[sel]; if (r) irPara(r.href); }
    }
  }

  if (!aberto) return null;

  return (
    <div className="cmdk-overlay" onClick={() => setAberto(false)}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Busca global">
        <div className="cmdk-input-wrap">
          <span className="cmdk-lupa">🔍</span>
          <input
            ref={inputRef}
            className="cmdk-input"
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyList}
            placeholder="Buscar processo, perícia, laudo…"
          />
          <span className="cmdk-esc">esc</span>
        </div>

        <div className="cmdk-lista">
          {mostrarAtalhos ? (
            <>
              <div className="cmdk-grupo">Ir para</div>
              {ATALHOS.map((a, i) => (
                <button key={a.href} className={"cmdk-item" + (i === sel ? " sel" : "")} onMouseEnter={() => setSel(i)} onClick={() => irPara(a.href)}>
                  <span className="cmdk-ico">{a.icon}</span>
                  <span className="cmdk-tit">{a.titulo}</span>
                </button>
              ))}
            </>
          ) : buscando ? (
            <div className="cmdk-vazio">Buscando…</div>
          ) : lista.length === 0 ? (
            <div className="cmdk-vazio">Nada encontrado para “{q}”.</div>
          ) : (
            lista.map((r, i) => (
              <button key={r.tipo + r.id} className={"cmdk-item" + (i === sel ? " sel" : "")} onMouseEnter={() => setSel(i)} onClick={() => irPara(r.href)}>
                <span className="cmdk-ico">{TIPO_ICON[r.tipo]}</span>
                <span className="cmdk-corpo">
                  <span className="cmdk-tit">{r.titulo}</span>
                  <span className="cmdk-sub">{TIPO_LABEL[r.tipo]} · {r.subtitulo}</span>
                </span>
              </button>
            ))
          )}
        </div>
        <div className="cmdk-rodape">↑↓ navegar · ↵ abrir · Ctrl/⌘K alterna</div>
      </div>
    </div>
  );
}
