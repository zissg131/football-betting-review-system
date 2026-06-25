import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, profitClass } from "@/lib/utils";

export default async function MatchesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const competition = String(params.competition ?? "");
  const team = String(params.team ?? "");
  const date = String(params.date ?? "");
  const settled = String(params.settled ?? "");
  const hasBet = String(params.hasBet ?? "");
  const confidence = String(params.confidence ?? "");

  const matches = await prisma.match.findMany({
    where: {
      ...(competition ? { competition: { contains: competition } } : {}),
      ...(team ? { OR: [{ homeTeam: { contains: team } }, { awayTeam: { contains: team } }] } : {}),
      ...(date
        ? {
            kickoffTime: {
              gte: new Date(`${date}T00:00:00`),
              lte: new Date(`${date}T23:59:59`)
            }
          }
        : {}),
      ...(settled === "yes" ? { status: "settled" } : {}),
      ...(settled === "no" ? { status: { not: "settled" } } : {}),
      ...(confidence ? { confidenceLevel: Number(confidence) } : {}),
      ...(hasBet === "yes" ? { bets: { some: {} } } : {}),
      ...(hasBet === "no" ? { bets: { none: {} } } : {})
    },
    orderBy: { kickoffTime: "desc" },
    include: { bets: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">比赛管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">比赛、预测、投注状态和赛后盈亏。</p>
        </div>
        <Link href="/matches/new">
          <Button>
            <Plus className="h-4 w-4" />
            新增比赛
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Label>
              赛事
              <Input name="competition" defaultValue={competition} placeholder="英超" />
            </Label>
            <Label>
              球队
              <Input name="team" defaultValue={team} placeholder="阿森纳" />
            </Label>
            <Label>
              日期
              <Input type="date" name="date" defaultValue={date} />
            </Label>
            <Label>
              结算
              <Select name="settled" defaultValue={settled}>
                <option value="">全部</option>
                <option value="yes">已结算</option>
                <option value="no">未结算</option>
              </Select>
            </Label>
            <Label>
              有下注
              <Select name="hasBet" defaultValue={hasBet}>
                <option value="">全部</option>
                <option value="yes">有</option>
                <option value="no">无</option>
              </Select>
            </Label>
            <Label>
              信心
              <Select name="confidence" defaultValue={confidence}>
                <option value="">全部</option>
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>{level} 星</option>
                ))}
              </Select>
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
                <Th>赛事</Th>
                <Th>开赛时间</Th>
                <Th>比赛</Th>
                <Th>赛前预测</Th>
                <Th>比分</Th>
                <Th>投注状态</Th>
                <Th className="text-right">盈亏</Th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const profit = match.bets.reduce((sum, bet) => sum + bet.profit, 0);
                return (
                  <tr key={match.id}>
                    <Td>{match.competition}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{match.kickoffTime.toLocaleString("zh-CN")}</Td>
                    <Td>
                      <Link href={`/matches/${match.id}`} className="font-medium hover:underline">
                        {match.homeTeam} 对 {match.awayTeam}
                      </Link>
                    </Td>
                    <Td className="max-w-72 truncate text-muted-foreground">{match.recommendedPick || match.preMatchSummary || "-"}</Td>
                    <Td>{match.homeScore == null ? "-" : `${match.homeScore}-${match.awayScore}`}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Badge tone={match.status === "settled" ? "positive" : "neutral"}>{STATUS_LABELS[match.status]}</Badge>
                        <Badge tone="outline">{match.bets.length} 笔</Badge>
                      </div>
                    </Td>
                    <Td className={`text-right font-medium ${profitClass(profit)}`}>{formatCurrency(profit)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {!matches.length ? <div className="p-6 text-sm text-muted-foreground">没有匹配的比赛。</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
