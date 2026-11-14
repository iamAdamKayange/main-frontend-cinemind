import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Manrope } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import { AuthDeepLinkHandler } from "@/components/auth/AuthDeepLinkHandler";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin"] });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CineMind AI — AI video editing studio, made in Tanzania",
  description:
    "Professional AI video editing for creators, musicians and studios. Edit by hand or direct Cine in English or Kiswahili — on web, desktop and mobile.",
};

export const viewport: Viewport = {
  themeColor: "#061317",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${code.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider>
          <AuthDeepLinkHandler />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
