import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AXIA — Inteligência que conecta o que importa",
  description:
    "A AXIA conecta seu e-mail e identifica automaticamente nomeações, intimações, prazos, perícias e honorários da sua rotina pericial.",
  openGraph: {
    title: "AXIA — Inteligência que conecta o que importa",
    description: "Sua caixa de entrada vira sua central inteligente de perícias.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
