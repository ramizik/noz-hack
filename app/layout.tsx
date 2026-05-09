import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelOps",
  description: "Always-On AI Cyber Incident Response Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
