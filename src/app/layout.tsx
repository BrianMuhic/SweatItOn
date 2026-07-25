import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "SweatItOn — Compete with friends",
  description:
    "Rival your friends on calories burned and miles walked or run. Sync Apple Watch or Garmin through Strava.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <SiteNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
