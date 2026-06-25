import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "足球锋线追踪器",
  description: "足球赛前预测、投注结算与赛后复盘工作台。"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
