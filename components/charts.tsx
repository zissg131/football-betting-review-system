"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const tooltipStyle = {
  background: "hsl(220 13% 10%)",
  border: "1px solid hsl(220 10% 20%)",
  borderRadius: 12,
  color: "hsl(210 18% 92%)"
};

export function PerformanceLineChart({ data }: { data: { name: string; profit: number; cumulative: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" stroke="hsl(215 10% 58%)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(215 10% 58%)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(210 18% 92%)" }} />
          <Line type="monotone" dataKey="cumulative" name="累计盈亏" stroke="hsl(154 62% 49%)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="profit" name="单笔盈亏" stroke="hsl(358 72% 58%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarketBarChart({ data }: { data: { key: string; profit: number; roi: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="key" stroke="hsl(215 10% 58%)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(215 10% 58%)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(210 18% 92%)" }} />
          <Bar dataKey="profit" name="收益" fill="hsl(154 62% 49%)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
