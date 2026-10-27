import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NavigationTracker } from "@/components/navigation-tracker";
import { LoadingOverlay } from "@/components/loading/loading-overlay";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Barbearia do Moura — Mauá/SP",
    template: "%s · Barbearia do Moura",
  },
  description:
    "Agende seu corte na Barbearia do Moura, em Mauá/SP. Escolha o barbeiro, o serviço e o horário em poucos toques.",
  applicationName: "Barbearia do Moura",
  appleWebApp: { capable: true, title: "Moura", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Valor literal: o Next grava em <meta name="theme-color">, que não lê variáveis CSS (= --cta).
  themeColor: "#0e7c86",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Só a viewport rola: nada de `overflow` em <html>/<body> (no iOS Safari, `overflow-x: hidden`
    // no body transforma o body em contêiner de rolagem e faz os elementos fixos e a página
    // tremerem ao arrastar). A proteção contra vazamento horizontal fica num wrapper com `clip`,
    // que corta sem criar contêiner de rolagem. Alturas de tela usam `svh` (não `dvh`): o layout
    // não pode mudar enquanto a barra de endereço do celular aparece e some no meio do gesto.
    <html lang="pt-BR" className={`${manrope.variable} antialiased`}>
      <body>
        <div className="min-h-svh overflow-x-clip">{children}</div>
        <NavigationTracker />
        <LoadingOverlay />
        <Toaster richColors position="top-center" containerAriaLabel="Avisos" />
      </body>
    </html>
  );
}
