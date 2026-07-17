import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sheetal Darling — AI Personal Assistant",
  description:
    "A premium AI companion who chats in English, Hindi & Hinglish — voice, reminders, notes, weather, news, motivation, files, images and more. Privacy-first.",
};

export const viewport: Viewport = {
  themeColor: "#08060f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>💜</text></svg>"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
