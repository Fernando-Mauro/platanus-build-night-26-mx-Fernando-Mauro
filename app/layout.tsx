import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Vértice · Plataforma adaptativa",
  description:
    "Vértice modela tu conocimiento como una red bayesiana y te guía hacia el siguiente problema con mayor impacto en tu aprendizaje.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-zinc-950 font-sans text-zinc-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
