import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = { title: "Qarin admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh" style={{ fontFamily: "system-ui, sans-serif" }}>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
