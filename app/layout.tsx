import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rio Apex — demos that close",
  description:
    "Show prospects a redesigned version of their own website inside your cold email.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
