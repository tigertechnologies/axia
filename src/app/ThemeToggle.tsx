"use client";
import { useEffect, useState } from "react";

// Alterna claro/escuro na landing. Salva a escolha do usuário no navegador.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const salvo = typeof window !== "undefined" ? localStorage.getItem("axia-theme") : null;
    const inicial = salvo === "dark";
    setDark(inicial);
    document.documentElement.setAttribute("data-theme", inicial ? "dark" : "light");
  }, []);

  function alternar() {
    const novo = !dark;
    setDark(novo);
    document.documentElement.setAttribute("data-theme", novo ? "dark" : "light");
    try { localStorage.setItem("axia-theme", novo ? "dark" : "light"); } catch { /* ignora */ }
  }

  return (
    <button className="theme-toggle" onClick={alternar} aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"} title={dark ? "Tema claro" : "Tema escuro"}>
      {dark ? (
        // sol
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      ) : (
        // lua
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
