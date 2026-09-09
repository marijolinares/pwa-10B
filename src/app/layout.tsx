import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inspecciones de laboratorio",
  description: "Proyecto base de Aplicaciones Web Progresivas",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}