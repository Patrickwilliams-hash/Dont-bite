import type { Metadata } from "next";
import { Inter, Outfit, Barlow_Condensed } from "next/font/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "Don't Bite | Don't take the bait",
  description:
    "Don't Bite helps everyday people practise spotting scam emails, dodgy sites and misleading online tricks safely with Phil.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
      <body className={`${inter.variable} ${outfit.variable} ${barlowCondensed.variable} font-sans antialiased`}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
