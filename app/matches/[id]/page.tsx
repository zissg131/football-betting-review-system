import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { addBet, deleteBet, deleteMatch, settleMatch, updateBetManualResult, updateMatchAnalysis, updateReview } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { MARKET_OPTIONS, RESULT_OPTIONS, RESULT_LABELS } from "@/lib/constants";
import { formatCurrency, formatPercent, parseTags, profitClass, toDateInputValue } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: { bets: { orderBy: { betTime: "desc" } } }
  });

  if (!match) notFound();

  const analysisAction = updateMatchAnalysis.bind(null, match.id);
  const addBetAction = addBet.bind(null, match.id);
  const settleAction = settleMatch.bind(null, match.id);
  const reviewAction = updateReview.bind(null, match.id);
  const deleteMatchAction = deleteMatch.bind(null, match.id);
  const totalStake = match.bets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalProfit = match.bets.reduce((sum, bet) => sum + bet.profit, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{match.homeTeam} 对 {match.awayTeam}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {match.competition} · {match.kickoffTime.toLocaleString("zh-CN")} · 信心 {match.confidenceLevel}/5
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="outline">{match.homeScore == null ? "未完赛" : `${match.homeScore}-${match.awayScore}`}</Badge>
          <Badge tone={totalProfit > 0 ? "positive" : totalProfit < 0 ? "negative" : "neutral"}>
            {formatCurrency(totalProfit)}
          </Badge>
          <form action={deleteMatchAction}>
            <Button type="submit" variant="danger" size="sm">删除比赛</Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>赛前分析</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={analysisAction} className="grid gap-4 md:grid-cols-2">
              <Label>
                赛事
                <Input name="competition" defaultValue={match.competition} required />
              </Label>
              <Label>
                开赛时间
                <Input type="datetime-local" name="kickoffTime" defaultValue={toDateInputValue(match.kickoffTime)} required />
              </Label>
              <Label>
                主队
                <Input name="homeTeam" defaultValue={match.homeTeam} required />
              </Label>
              <Label>
                客队
                <Input name="awayTeam" defaultValue={match.awayTeam} required />
              </Label>
              <Label>
                主队排名
                <Input type="number" name="homeRank" defaultValue={match.homeRank ?? ""} />
              </Label>
              <Label>
                客队排名
                <Input type="number" name="awayRank" defaultValue={match.awayRank ?? ""} />
              </Label>
              <Label>
                推荐方向
                <Input name="recommendedPick" defaultValue={match.recommendedPick} />
              </Label>
              <Label>
                推荐比分
                <Input name="predictedScore" defaultValue={match.predictedScore} />
              </Label>
              <Label>
                信心等级
                <Input type="number" name="confidenceLevel" min="1" max="5" defaultValue={match.confidenceLevel} />
              </Label>
              <Label className="md:col-span-2">
                赛前摘要
                <Textarea name="preMatchSummary" defaultValue={match.preMatchSummary} />
              </Label>
              <Label className="md:col-span-2">
                基本面分析
                <Textarea name="fundamentalAnalysis" defaultValue={match.fundamentalAnalysis} />
              </Label>
              <Label className="md:col-span-2">
                盘口分析
                <Textarea name="oddsAnalysis" defaultValue={match.oddsAnalysis} />
              </Label>
              <Label className="md:col-span-2">
                大小球分析
                <Textarea name="overUnderAnalysis" defaultValue={match.overUnderAnalysis} />
              </Label>
              <Label className="md:col-span-2">
                赛态推演
                <Textarea name="gameScriptAnalysis" defaultValue={match.gameScriptAnalysis} />
              </Label>
              <div className="md:col-span-2">
                <Button type="submit">保存分析</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>赛果结算</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={settleAction} className="grid gap-4 sm:grid-cols-2">
                <Label>
                  主队进球
                  <Input type="number" name="homeScore" min="0" defaultValue={match.homeScore ?? ""} required />
                </Label>
                <Label>
                  客队进球
                  <Input type="number" name="awayScore" min="0" defaultValue={match.awayScore ?? ""} required />
                </Label>
                <div className="sm:col-span-2">
                  <Button type="submit">结算所有投注</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>持仓汇总</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">下注笔数</div>
                <div className="mt-2 text-2xl font-semibold">{match.bets.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">本金</div>
                <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalStake)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">回报率</div>
                <div className={`mt-2 text-2xl font-semibold ${profitClass(totalProfit)}`}>
                  {formatPercent(totalStake > 0 ? totalProfit / totalStake : 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增投注</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addBetAction} className="grid gap-4 md:grid-cols-4">
            <Label>
              投注时间
              <Input type="datetime-local" name="betTime" defaultValue={toDateInputValue(new Date())} />
            </Label>
            <Label>
              玩法
              <Select name="marketType" defaultValue="asian_handicap">
                {MARKET_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Label>
            <Label>
              方向
              <Input name="selection" placeholder="主队 / 客队 / 大球 / 小球" required />
            </Label>
            <Label>
              盘口
              <Input type="number" step="0.25" name="line" placeholder="-0.25 / 2.5" />
            </Label>
            <Label>
              赔率
              <Input type="number" step="0.01" min="1" name="odds" required />
            </Label>
            <Label>
              本金
              <Input type="number" step="0.01" min="0" name="stake" required />
            </Label>
            <Label>
              手动结果
              <Select name="result" defaultValue="pending">
                {RESULT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Label>
            <Label>
              标签
              <Input name="tags" placeholder="盘口降水, 主队优势" />
            </Label>
            <Label className="md:col-span-4">
              备注
              <Textarea name="notes" />
            </Label>
            <div className="md:col-span-4">
              <Button type="submit">新增投注</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>投注持仓</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>时间</Th>
                <Th>玩法</Th>
                <Th>方向</Th>
                <Th>盘口</Th>
                <Th>赔率</Th>
                <Th>本金</Th>
                <Th>结果</Th>
                <Th className="text-right">盈亏</Th>
                <Th>手动修正</Th>
              </tr>
            </thead>
            <tbody>
              {match.bets.map((bet) => {
                const manualAction = updateBetManualResult.bind(null, match.id, bet.id);
                const deleteAction = deleteBet.bind(null, match.id, bet.id);
                return (
                  <tr key={bet.id}>
                    <Td className="whitespace-nowrap text-muted-foreground">{bet.betTime.toLocaleString("zh-CN")}</Td>
                    <Td>{MARKET_OPTIONS.find(([value]) => value === bet.marketType)?.[1] ?? bet.marketType}</Td>
                    <Td>{bet.selection}</Td>
                    <Td>{bet.line ?? "-"}</Td>
                    <Td>{bet.odds}</Td>
                    <Td>{formatCurrency(bet.stake)}</Td>
                    <Td>{RESULT_LABELS[bet.result]}</Td>
                    <Td className={`text-right font-medium ${profitClass(bet.profit)}`}>{formatCurrency(bet.profit)}</Td>
                    <Td>
                      <div className="flex min-w-72 gap-2">
                        <form action={manualAction} className="flex flex-1 gap-2">
                          <Select name="result" defaultValue={bet.result} className="h-9">
                            {RESULT_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </Select>
                          <input type="hidden" name="tags" value={parseTags(bet.tags).join(", ")} />
                          <input type="hidden" name="notes" value={bet.notes} />
                          <Button type="submit" variant="outline" size="sm">更新</Button>
                        </form>
                        <form action={deleteAction}>
                          <Button type="submit" variant="danger" size="icon" aria-label="删除投注">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {!match.bets.length ? <div className="p-6 text-sm text-muted-foreground">暂无投注。</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>赛后复盘</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={reviewAction} className="grid gap-4 md:grid-cols-2">
            <Label className="md:col-span-2">
              赛后结论
              <Textarea name="reviewText" defaultValue={match.reviewText} />
            </Label>
            <Label>
              错误原因标签
              <Input name="mistakeTags" defaultValue={parseTags(match.mistakeTags).join(", ")} placeholder="低估伤停, 高估主场" />
            </Label>
            <Label>
              正确原因标签
              <Input name="successTags" defaultValue={parseTags(match.successTags).join(", ")} placeholder="节奏判断正确, 盘口验证" />
            </Label>
            <Label className="md:col-span-2">
              下次注意事项
              <Textarea name="nextActionText" defaultValue={match.nextActionText} />
            </Label>
            <div className="md:col-span-2">
              <Button type="submit">保存复盘</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
