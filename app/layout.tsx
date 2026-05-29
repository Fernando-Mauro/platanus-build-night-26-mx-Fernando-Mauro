import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vértice · Plataforma adaptativa",
  description:
    "Vértice modela tu conocimiento como una red bayesiana y te guía hacia el siguiente problema con mayor impacto en tu aprendizaje.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-zinc-950 font-sans text-zinc-300">{children}</body>
    </html>
  );
}
