import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studengage",
  description: "The events, bursaries and co-op jobs that apply to you — ranked around your schedule.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
