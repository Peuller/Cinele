import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Outfit } from "next/font/google";
import { AdsScript } from "@/components/RewardedAd";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const bebas = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cena do Dia — Adivinhe o filme pela cena",
  description:
    "O Wordle do cinema: descubra o filme do dia a partir de uma cena desfocada em até 5 palpites. Novo desafio todo dia!",
  openGraph: {
    title: "Cena do Dia 🎬",
    description: "Adivinhe o filme do dia pela cena. Você consegue em 1 palpite?",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#07060b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${bebas.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div className="bg-aurora" aria-hidden />
        {children}
        <AdsScript />
      </body>
    </html>
  );
}
