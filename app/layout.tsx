import type { Metadata } from "next";
import "./globals.css";
import { SesiProvider } from "@/components/sesi";
import { Perekam } from "@/components/perekam";

export const metadata: Metadata = {
  title: "LiVE | Ruang Eksperimen",
  description: "Lingkungan pembelajaran eksperimental untuk penelitian beban kognitif (skripsi).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SesiProvider>{children}</SesiProvider>
        <Perekam />
      </body>
    </html>
  );
}
