import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cinematic.css";
import "./mobile-studio.css";

export const viewport: Viewport = {width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#0b1311"};

export const metadata: Metadata = {
  title: "NutriLens — Understand your plate",
  description: "Understand meal photos with Gemini: estimated calories, macros, and meal balance, with adjustable portions.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
