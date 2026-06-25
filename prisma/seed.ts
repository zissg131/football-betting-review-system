import { PrismaClient } from "@prisma/client";
import { settleBet } from "../lib/settlement";

const prisma = new PrismaClient();

async function main() {
  const matchData = {
    competition: "英超",
    kickoffTime: new Date("2026-08-15T20:00:00+08:00"),
    homeTeam: "阿森纳",
    awayTeam: "切尔西",
    homeRank: 2,
    awayRank: 5,
    homeScore: 2,
    awayScore: 1,
    status: "settled" as const,
    preMatchSummary: "主队近期压迫效率更稳定，客队客场转换速度快。",
    fundamentalAnalysis: "主队阵容完整，客队中场轮换压力较大。",
    oddsAnalysis: "主队让 -0.25 降水，市场偏向主队不败。",
    overUnderAnalysis: "节奏预期偏快，但客队反击质量决定上限。",
    gameScriptAnalysis: "前 30 分钟主队控球压制，若先破门会出现更多转换空间。",
    recommendedPick: "主队 -0.25",
    predictedScore: "2-1",
    confidenceLevel: 4,
    reviewText: "推荐方向与比赛节奏基本一致。"
  };

  const match = await prisma.match.upsert({
    where: { id: "seed-match-1" },
    update: matchData,
    create: {
      id: "seed-match-1",
      ...matchData
    }
  });

  const bet = settleBet({
    marketType: "asian_handicap",
    selection: "home",
    line: -0.25,
    odds: 1.92,
    stake: 500,
    homeScore: 2,
    awayScore: 1
  });

  await prisma.bet.upsert({
    where: { id: "seed-bet-1" },
    update: {
      matchId: match.id,
      betTime: new Date("2026-08-15T18:30:00+08:00"),
      marketType: "asian_handicap",
      selection: "home",
      line: -0.25,
      odds: 1.92,
      stake: 500,
      ...bet,
      tags: JSON.stringify(["主队压制", "盘口降水"]),
      notes: "赛前 90 分钟入场。"
    },
    create: {
      id: "seed-bet-1",
      matchId: match.id,
      betTime: new Date("2026-08-15T18:30:00+08:00"),
      marketType: "asian_handicap",
      selection: "home",
      line: -0.25,
      odds: 1.92,
      stake: 500,
      ...bet,
      tags: JSON.stringify(["主队压制", "盘口降水"]),
      notes: "赛前 90 分钟入场。"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
