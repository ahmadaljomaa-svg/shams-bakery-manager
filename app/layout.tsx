import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHAMS — Bäckerei Operations",
  description: "نظام إدارة الطلبات والإنتاج والتوزيع والفواتير",
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
    <html lang="de" dir="ltr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
