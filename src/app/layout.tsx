import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { TestBanner } from "@/components/TestBanner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BXprise — swap a box, get a surprise",
  description: "Send something you no longer use. Get a mystery box back from someone who shares your interests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TestBanner />
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-ink/10 py-6 text-center text-xs text-ink/50">
          BXprise pilot · US only · 18+ · <a href="/how-it-works" className="underline">Rules</a>
        </footer>
      </body>
    </html>
  );
}
