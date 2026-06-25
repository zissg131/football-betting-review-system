import type { Bet, Match } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MARKET_LABELS } from "@/lib/constants";

export type BetWithMatch = Bet & { match: Match };

function settledBets(bets: BetWithMatch[]) {
  return bets.filter((bet) => bet.result !== "pending");
}

export function calculateHitRate(bets: BetWithMatch[]) {
  const settled = settledBets(bets);
  if (!settled.length) return 0;
  const hits = settled.filter((bet) => bet.result === "win" || bet.result === "half_win").length;
  return hits / settled.length;
}

export function calculateCurrentStreak(bets: BetWithMatch[]) {
  const ordered = settledBets(bets).sort((a, b) => b.betTime.getTime() - a.betTime.getTime());
  if (!ordered.length) return { label: "无记录", count: 0, type: "neutral" as const };
  const firstPositive = ordered[0].profit > 0;
  let count = 0;
  for (const bet of ordered) {
    if ((bet.profit > 0) === firstPositive && bet.profit !== 0) count += 1;
    else break;
  }
  return {
    label: firstPositive ? `${count} 连红` : `${count} 连黑`,
    count,
    type: firstPositive ? ("positive" as const) : ("negative" as const)
  };
}

export function groupBetStats<T extends string>(bets: BetWithMatch[], getKey: (bet: BetWithMatch) => T) {
  const groups = new Map<
    T,
    { key: T; bets: number; stake: number; settledStake: number; profit: number; wins: number; settled: number; pending: number }
  >();

  for (const bet of bets) {
    const key = getKey(bet) || ("未分类" as T);
    const current = groups.get(key) ?? { key, bets: 0, stake: 0, settledStake: 0, profit: 0, wins: 0, settled: 0, pending: 0 };
    current.bets += 1;
    current.stake += bet.stake;
    if (bet.result !== "pending") {
      current.settled += 1;
      current.settledStake += bet.stake;
      current.profit += bet.profit;
      if (bet.result === "win" || bet.result === "half_win") current.wins += 1;
    } else {
      current.pending += 1;
    }
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      profit: Number(item.profit.toFixed(2)),
      roi: item.settledStake > 0 ? item.profit / item.settledStake : 0,
      hitRate: item.settled > 0 ? item.wins / item.settled : 0
    }))
    .sort((a, b) => b.profit - a.profit);
}

function groupTeamStats(bets: BetWithMatch[]) {
  const expanded = bets.flatMap((bet) => [
    { bet, team: bet.match.homeTeam },
    { bet, team: bet.match.awayTeam }
  ]);
  return groupBetStats(
    expanded.map(({ bet, team }) => ({ ...bet, match: { ...bet.match, competition: team } })),
    (bet) => bet.match.competition
  );
}

function parseTags(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return value
      .split(/[，,、\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function scoreBucket(value?: number | null) {
  if (value == null) return "未记录";
  if (value >= 80) return "80-100";
  if (value >= 65) return "65-79";
  if (value >= 50) return "50-64";
  return "0-49";
}

function clvLabel(value?: string | null) {
  if (value === "positive") return "CLV为正";
  if (value === "negative") return "CLV为负";
  if (value === "neutral") return "CLV中性";
  return "未记录CLV";
}

function errorTagLossRanking(bets: BetWithMatch[]) {
  const rows = new Map<string, { tag: string; count: number; loss: number; profit: number }>();
  for (const bet of settledBets(bets)) {
    for (const tag of parseTags(bet.errorTags)) {
      const current = rows.get(tag) ?? { tag, count: 0, loss: 0, profit: 0 };
      current.count += 1;
      current.profit += bet.profit;
      if (bet.profit < 0) current.loss += Math.abs(bet.profit);
      rows.set(tag, current);
    }
  }
  return Array.from(rows.values())
    .map((item) => ({ ...item, loss: Number(item.loss.toFixed(2)), profit: Number(item.profit.toFixed(2)) }))
    .sort((a, b) => b.loss - a.loss);
}

export async function getDashboardData() {
  const [matches, bets] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoffTime: "desc" },
      take: 8,
      include: { bets: true }
    }),
    prisma.bet.findMany({
      orderBy: { betTime: "desc" },
      include: { match: true }
    })
  ]);

  const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
  const settled = settledBets(bets);
  const totalSettledStake = settled.reduce((sum, bet) => sum + bet.stake, 0);
  const pendingStake = bets.filter((bet) => bet.result === "pending").reduce((sum, bet) => sum + bet.stake, 0);
  const totalProfit = settled.reduce((sum, bet) => sum + bet.profit, 0);
  const marketStats = groupBetStats(bets, (bet) => MARKET_LABELS[bet.marketType] ?? bet.marketType);
  const streak = calculateCurrentStreak(bets);
  const recent = bets.slice(0, 10).reverse();
  const recentPerformance = recent.map((bet, index) => ({
    name: `#${index + 1}`,
    profit: bet.profit,
    cumulative: recent.slice(0, index + 1).reduce((sum, item) => sum + item.profit, 0)
  }));

  return {
    totalMatches: new Set(bets.map((bet) => bet.matchId)).size,
    totalBets: bets.length,
    totalStake,
    totalSettledStake,
    pendingStake,
    totalProfit,
    roi: totalSettledStake > 0 ? totalProfit / totalSettledStake : 0,
    hitRate: calculateHitRate(bets),
    streak,
    bestMarket: marketStats[0]?.key ?? "暂无",
    worstMarket: marketStats.at(-1)?.key ?? "暂无",
    marketStats,
    recentPerformance,
    recentMatches: matches,
    recentBets: bets.slice(0, 8)
  };
}

export async function getBetLogData(searchParams: Record<string, string | string[] | undefined>) {
  const market = String(searchParams.market ?? "");
  const result = String(searchParams.result ?? "");
  const competition = String(searchParams.competition ?? "");
  const team = String(searchParams.team ?? "");
  const from = String(searchParams.from ?? "");
  const to = String(searchParams.to ?? "");

  return prisma.bet.findMany({
    where: {
      ...(market ? { marketType: market } : {}),
      ...(result ? { result } : {}),
      ...(from || to
        ? {
            betTime: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {})
            }
          }
        : {}),
      match: {
        ...(competition ? { competition: { contains: competition } } : {}),
        ...(team
          ? {
              OR: [{ homeTeam: { contains: team } }, { awayTeam: { contains: team } }]
            }
          : {})
      }
    },
    orderBy: { betTime: "desc" },
    include: { match: true }
  });
}

export async function getReviewData() {
  const bets = await prisma.bet.findMany({
    orderBy: { betTime: "desc" },
    include: { match: true }
  });

  const byMarket = groupBetStats(bets, (bet) => MARKET_LABELS[bet.marketType] ?? bet.marketType);
  const byCompetition = groupBetStats(bets, (bet) => bet.match.competition || "未分类");
  const byTeam = groupTeamStats(bets);
  const byConfidence = groupBetStats(bets, (bet) => `${bet.match.confidenceLevel} 星`);
  const byLine = groupBetStats(bets, (bet) => (bet.line == null ? "无盘口" : String(bet.line)));
  const byModelScore = groupBetStats(bets, (bet) => scoreBucket(bet.modelScore ?? bet.match.confidenceLevel * 20));
  const byExecutionScore = groupBetStats(bets, (bet) => scoreBucket(bet.executionScore));
  const byClv = groupBetStats(bets, (bet) => clvLabel(bet.clvResult));
  const errors = errorTagLossRanking(bets);

  const settled = settledBets(bets);
  const totalStake = settled.reduce((sum, bet) => sum + bet.stake, 0);
  const totalProfit = settled.reduce((sum, bet) => sum + bet.profit, 0);
  const roi = totalStake > 0 ? totalProfit / totalStake : 0;
  const hitRate = calculateHitRate(bets);
  const pending = bets.length - settled.length;
  const sampleLevel = settled.length >= 30 ? "样本充分" : settled.length >= 10 ? "样本可观察" : settled.length > 0 ? "样本不足" : "暂无样本";
  const stablePositiveMarket = byMarket.find((item) => item.settled >= 5 && item.roi > 0.05);
  const weakMarket = byMarket.find((item) => item.settled >= 5 && item.roi < -0.05);
  const weakDeepLine = byLine.find((item) => item.settled >= 3 && Number(item.key) <= -1 && item.profit < 0);
  const positiveClv = bets.filter((bet) => bet.clvResult === "positive");
  const positiveClvLoss = positiveClv.filter((bet) => bet.result !== "pending" && bet.profit < 0);
  const negativeClvWin = bets.filter((bet) => bet.clvResult === "negative" && bet.profit > 0);

  const actionItems = [
    settled.length < 10 ? "先把有效结算样本积累到 10 笔以上，再判断真实优势。" : "保留正收益玩法，但不要超过既定单笔仓位。",
    weakMarket ? `暂停加码 ${weakMarket.key}，先复盘入场理由是否重复失效。` : "继续记录每笔投注的入场条件，避免只看赛果。",
    weakDeepLine ? `减少 ${weakDeepLine.key} 及更深让球盘投入。` : "深盘样本不足时，不把单场输赢当作盘口结论。"
  ];

  const summary = bets.length
    ? `${sampleLevel}：已结算 ${settled.length} 笔，ROI ${(roi * 100).toFixed(1)}%。${
        stablePositiveMarket ? `${stablePositiveMarket.key} 暂时表现最好。` : "目前还没有足够样本证明某个玩法稳定占优。"
      } ${weakMarket ? `${weakMarket.key} 是当前主要风险点。` : "下一步重点是提高记录质量和控制仓位。"}`
    : "当前还没有投注样本，先录入比赛和投注后再生成复盘判断。";

  return {
    byMarket,
    byCompetition,
    byTeam,
    byConfidence,
    byLine,
    byModelScore,
    byExecutionScore,
    byClv,
    errorTagLossRanking: errors,
    summary,
    overview: {
      totalBets: bets.length,
      settledBets: settled.length,
      pendingBets: pending,
      totalStake,
      totalProfit,
      roi,
      hitRate,
      sampleLevel,
      bestMarket: stablePositiveMarket?.key ?? "暂无确认优势",
      weakestMarket: weakMarket?.key ?? "暂无明确风险",
      easiestBadLine: weakDeepLine?.key ?? "暂无明确误判盘口",
      bestStructure: stablePositiveMarket ? `${stablePositiveMarket.key} + 正CLV优先` : "小注单关记录优先",
      positiveClvCount: positiveClv.length,
      positiveClvLossCount: positiveClvLoss.length,
      negativeClvWinCount: negativeClvWin.length,
      actionItems
    }
  };
}
