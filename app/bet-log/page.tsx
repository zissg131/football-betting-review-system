import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BetImportUpload } from "@/components/bet-import-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { getBetLogData } from "@/lib/analytics";
import { MARKET_OPTIONS, MARKET_LABELS, RESULT_LABELS, RESULT_OPTIONS } from "@/lib/constants";
import { formatCurrency, formatPercent, parseTags, profitClass } from "@/lib/utils";

function exportHref(params: Record<string, string | string[] | undefined>, format: "csv" | "xlsx") {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" && value) query.set(key, value);
  });
  query.set("format", format);
  return `/api/export/bets?${query.toString()}`;
}

export default async function BetLogPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const bets = await getBetLogData(params);
  const market = String(params.market ?? "");
  const result = String(params.result ?? "");
  const competition = String(params.competition ?? "");
  const team = String(params.team ?? "");
  const from = String(params.from ?? "");
  const to = String(params.to ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">投注记录</h1>
          <p className="mt-1 text-sm text-muted-foreground">所有下注、赛果、盈亏和标签。</p>
        </div>
        <div className="flex gap-2">
          <a href={exportHref(params, "csv")}>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              导出 CSV
            </Button>
          </a>
          <a href={exportHref(params, "xlsx")}>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              导出 XLSX
            </Button>
          </a>
        </div>
      </div>

      <BetImportUpload />

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Label>
              玩法
              <Select name="market" defaultValue={market}>
                <option value="">全部</option>
                {MARKET_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Label>
            <Label>
              输赢
              <Select name="result" defaultValue={result}>
                <option value="">全部</option>
                {RESULT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Label>
            <Label>
              赛事
              <Input name="competition" defaultValue={competition} />
            </Label>
            <Label>
              球队
              <Input name="team" defaultValue={team} />
            </Label>
            <Label>
              开始
              <Input type="date" name="from" defaultValue={from} />
            </Label>
            <Label>
              结束
              <Input type="date" name="to" defaultValue={to} />
            </Label>
            <div className="md:col-span-3 xl:col-span-6">
              <Button type="submit" variant="outline">筛选</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>日期</Th>
                <Th>比赛</Th>
                <Th>玩法</Th>
                <Th>方向</Th>
                <Th>盘口</Th>
                <Th>赔率</Th>
                <Th>本金</Th>
                <Th>赛果</Th>
                <Th>盈亏</Th>
                <Th>回报率</Th>
                <Th>标签</Th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <tr key={bet.id}>
                  <Td className="whitespace-nowrap text-muted-foreground">{bet.betTime.toLocaleDateString("zh-CN")}</Td>
                  <Td>{bet.match.homeTeam} 对 {bet.match.awayTeam}</Td>
                  <Td>{MARKET_LABELS[bet.marketType]}</Td>
                  <Td>{bet.selection}</Td>
                  <Td>{bet.line ?? "-"}</Td>
                  <Td>{bet.odds}</Td>
                  <Td>{formatCurrency(bet.stake)}</Td>
                  <Td>{bet.match.homeScore == null ? RESULT_LABELS[bet.result] : `${bet.match.homeScore}-${bet.match.awayScore}`}</Td>
                  <Td className={`font-medium ${profitClass(bet.profit)}`}>{formatCurrency(bet.profit)}</Td>
                  <Td className={profitClass(bet.roi)}>{formatPercent(bet.roi)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {parseTags(bet.tags).map((tag) => (
                        <Badge key={tag} tone="neutral">{tag}</Badge>
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!bets.length ? <div className="p-6 text-sm text-muted-foreground">没有投注记录。</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
