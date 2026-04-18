import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMMplan Lite",
  description: "High-performance SMM Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
