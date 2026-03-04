import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eddnbot",
  description: "WhatsApp automation with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-white antialiased">{children}</body>
    </html>
  );
}
