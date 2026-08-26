import type { Metadata } from "next";
import localFont from "next/font/local";
import "antd/dist/reset.css";
import "./globals.css";
import { Providers } from "@/app/providers";
import { AntdRegistry } from "@ant-design/nextjs-registry";

const geist = localFont({
  src: [
    {
      path: "../../design-analysis/artistbor-dashboard-design/fonts/Geist-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../design-analysis/artistbor-dashboard-design/fonts/Geist-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../design-analysis/artistbor-dashboard-design/fonts/Geist-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-geist",
});

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
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${geist.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
