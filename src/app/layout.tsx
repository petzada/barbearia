import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  themeColor: "#0e7c86",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-dvh overflow-x-hidden">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
