import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Karachi Courier — Business Portal",
  description: "Book and track same-day deliveries for your business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">{children}</body>
    </html>
  );
}
