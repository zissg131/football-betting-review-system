import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { getReviewData } from "@/lib/analytics";
import { formatCurrency, formatPercent, profitClass } from "@/lib/utils";

type StatRow = {
  key: string;
  bets: number;
  settled: number;
  pending: number;
  hitRate: number;
  profit: number;
  roi: number;
};

function StatTable({ rows }: { rows: StatRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <Th>分类</Th>
            <Th>样本</Th>
            <Th>命中率</Th>
            <Th>总盈亏</Th>
            <Th>ROI</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <Td>{row.key}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <span>{row.settled}/{row.bets}</span>
                  {row.pending ? <Badge tone="neutral">待 {row.pending}</Badge> : null}
                </div>
              </Td>
              <Td>{formatPercent(row.hitRate)}</Td>
              <Td className={profitClass(row.profit)}>{formatCurrency(row.profit)}</Td>
              <Td className={profitClass(row.roi)}>{formatPercent(row.roi)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!rows.length ? <div className="p-5 text-sm text-muted-foreground">暂无数据。</div> : null}
    </div>
  );
}

function MetricBox({ label, value, tone }: { label: string; value: string | number; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/45 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default async function ReviewPage() {
  const data = await getReviewData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-primary/25 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_30%),linear-gradient(135deg,rgba(14,21,29,0.96),rgba(9,12,18,0.88))]">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-primary">Review Command</div>
                <h1 className="mt-3 text-3xl font-semibold">复盘分析终端</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{data.summary}</p>
              </div>
              <Badge tone={data.overview.sampleLevel === "样本充分" ? "positive" : data.overview.sampleLevel === "样本不足" ? "negative" : "neutral"}>
                {data.overview.sampleLevel}
              </Badge>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricBox label="净盈亏" value={formatCurrency(data.overview.totalProfit)} tone={data.overview.totalProfit >= 0 ? "positive" : "negative"} />
              <MetricBox label="ROI" value={formatPercent(data.overview.roi)} tone={data.overview.roi >= 0 ? "positive" : "negative"} />
              <MetricBox label="命中率" value={formatPercent(data.overview.hitRate)} />
              <MetricBox label="结算样本" value={`${data.overview.settledBets}/${data.overview.totalBets}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>下一步动作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-border/80 bg-background/45 p-3">
                <div className="text-xs text-muted-foreground">最赚钱玩法</div>
                <div className="mt-2 font-medium">{data.overview.bestMarket}</div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/45 p-3">
                <div className="text-xs text-muted-foreground">最亏损玩法</div>
                <div className="mt-2 font-medium">{data.overview.weakestMarket}</div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/45 p-3">
                <div className="text-xs text-muted-foreground">易误判盘口</div>
                <div className="mt-2 font-medium">{data.overview.easiestBadLine}</div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/45 p-3">
                <div className="text-xs text-muted-foreground">适合结构</div>
                <div className="mt-2 font-medium">{data.overview.bestStructure}</div>
              </div>
            </div>
            {data.overview.actionItems.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-border/70 bg-background/35 p-3 text-sm leading-6">
                <span className="text-primary">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricBox label="CLV为正下注数" value={data.overview.positiveClvCount} tone="positive" />
        <MetricBox label="CLV为正但输球" value={data.overview.positiveClvLossCount} tone={data.overview.positiveClvLossCount ? "negative" : "neutral"} />
        <MetricBox label="CLV为负但赢球" value={data.overview.negativeClvWinCount} tone={data.overview.negativeClvWinCount ? "negative" : "neutral"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>按玩法 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byMarket} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>按盘口类型 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byLine} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>按联赛 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byCompetition} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>按球队 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byTeam.slice(0, 20)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>按信心等级 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byConfidence} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>按模型分区间 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byModelScore} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>按执行分区间 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byExecutionScore} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>按 CLV 正负 ROI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatTable rows={data.byClv} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>错误标签亏损排行</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>错误标签</Th>
                <Th>出现次数</Th>
                <Th>亏损金额</Th>
                <Th>净盈亏</Th>
              </tr>
            </thead>
            <tbody>
              {data.errorTagLossRanking.map((item) => (
                <tr key={item.tag}>
                  <Td>{item.tag}</Td>
                  <Td>{item.count}</Td>
                  <Td className="text-negative">{formatCurrency(item.loss)}</Td>
                  <Td className={profitClass(item.profit)}>{formatCurrency(item.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!data.errorTagLossRanking.length ? <div className="p-5 text-sm text-muted-foreground">暂无错误标签样本。</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
