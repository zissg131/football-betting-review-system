import Link from "next/link";
import { MarketBarChart, PerformanceLineChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { MARKET_LABELS, RESULT_LABELS } from "@/lib/constants";
import { getDashboardData } from "@/lib/analytics";
import { formatCurrency, formatPercent, profitClass } from "@/lib/utils";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">仪表盘</h1>
          <p className="mt-1 text-sm text-muted-foreground">赛前决策、资金曲线与玩法表现。</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="总盈利"
          value={formatCurrency(data.totalProfit)}
          tone={data.totalProfit > 0 ? "positive" : data.totalProfit < 0 ? "negative" : "neutral"}
          sub={`下注金额 ${formatCurrency(data.totalStake)}`}
        />
        <MetricCard label="回报率" value={formatPercent(data.roi)} tone={data.roi > 0 ? "positive" : data.roi < 0 ? "negative" : "neutral"} />
        <MetricCard label="命中率" value={formatPercent(data.hitRate)} sub={`${data.totalBets} 笔投注`} />
        <MetricCard label="投注场次" value={String(data.totalMatches)} sub="有下注的比赛" />
        <MetricCard
          label="当前状态"
          value={data.streak.label}
          tone={data.streak.type === "positive" ? "positive" : data.streak.type === "negative" ? "negative" : "neutral"}
          sub={`最赚 ${data.bestMarket} / 最亏 ${data.worstMarket}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>近期投注走势</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceLineChart data={data.recentPerformance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>玩法收益分布</CardTitle>
          </CardHeader>
          <CardContent>
            <MarketBarChart data={data.marketStats.slice(0, 8)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>最近比赛</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentMatches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`} className="block rounded-xl border border-border bg-background/50 p-3 hover:bg-muted/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{match.homeTeam} 对 {match.awayTeam}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{match.competition} · {match.kickoffTime.toLocaleString("zh-CN")}</div>
                  </div>
                  <Badge tone="outline">{match.homeScore == null ? "未完赛" : `${match.homeScore}-${match.awayScore}`}</Badge>
                </div>
              </Link>
            ))}
            {!data.recentMatches.length ? <div className="text-sm text-muted-foreground">暂无比赛。</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最新投注</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>比赛</Th>
                  <Th>玩法</Th>
                  <Th>本金</Th>
                  <Th>结果</Th>
                  <Th className="text-right">盈亏</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentBets.map((bet) => (
                  <tr key={bet.id}>
                    <Td>{bet.match.homeTeam} 对 {bet.match.awayTeam}</Td>
                    <Td>{MARKET_LABELS[bet.marketType]}</Td>
                    <Td>{formatCurrency(bet.stake)}</Td>
                    <Td>{RESULT_LABELS[bet.result]}</Td>
                    <Td className={`text-right font-medium ${profitClass(bet.profit)}`}>{formatCurrency(bet.profit)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!data.recentBets.length ? <div className="py-6 text-sm text-muted-foreground">暂无投注记录。</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
