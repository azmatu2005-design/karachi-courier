import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karachi Courier — Track your parcel",
  description:
    "Track your same-day Karachi Courier shipment in real time. Enter your KHI tracking number.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
