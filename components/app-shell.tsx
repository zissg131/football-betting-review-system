"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, ClipboardList, Gauge, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "仪表盘", icon: Gauge },
  { href: "/daily", label: "今日总览", icon: BarChart3 },
  { href: "/matches", label: "比赛管理", icon: Trophy },
  { href: "/bet-log", label: "投注记录", icon: ClipboardList },
  { href: "/review", label: "复盘分析", icon: BarChart3 }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen terminal-grid">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/[0.07] bg-background/86 p-5 shadow-[18px_0_70px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:block">
        <div className="mb-10">
          <div className="text-lg font-semibold text-foreground">足球锋线追踪器</div>
          <div className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">赛前分析工作台</div>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                  active
                    ? "border-primary/25 bg-primary/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-white/[0.08] hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/matches/new" className="mt-6 block">
          <Button className="w-full">
            <Plus className="h-4 w-4" />
            新增比赛
          </Button>
        </Link>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">足球锋线追踪器</div>
            <Link href="/matches/new">
              <Button size="icon" aria-label="新增比赛">
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    active ? "border-primary/30 bg-primary/10 text-foreground" : "border-border/80 bg-muted/40 text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
