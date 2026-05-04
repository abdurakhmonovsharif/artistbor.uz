import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Artistbor Admin",
  description: "Artistbor admin dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950 dark:bg-[#0f172a] dark:text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
