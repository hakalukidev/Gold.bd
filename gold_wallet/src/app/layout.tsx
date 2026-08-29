import type { Metadata } from "next";
import { Geist_Mono, Manrope, Noto_Serif_Bengali, Playfair_Display } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// English body/UI font.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Bangla body/UI font — Manrope has no Bengali glyphs, so this is the fallback
// the --font-sans stack uses whenever the current locale renders Bangla copy.
// Both weights are loaded (not just 400) so font-bold/font-semibold render a
// real bold face for Bangla text instead of the browser faking it.
const notoSerifBengali = Noto_Serif_Bengali({
  variable: "--font-noto-serif-bengali",
  weight: ["400", "700"],
  subsets: ["bengali"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif display font — the hero's "BANGLADESH'S TRUSTED" eyebrow line,
// echoing an engraved/luxury look. Not used for body copy.
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gold Wallet — Gold BD",
  description: "Your Gold BD wallet: buy, sell and hold digital gold and silver.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${notoSerifBengali.variable} ${geistMono.variable} ${playfairDisplay.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
