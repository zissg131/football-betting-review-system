"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { BetResult, MarketType } from "@/lib/settlement";
import { prisma } from "@/lib/prisma";
import { settleBet, settleManualResult } from "@/lib/settlement";
import { calculateClv } from "@/lib/models/clv";
import { stringifyTags, toNumber, toOptionalNumber } from "@/lib/utils";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createMatch(formData: FormData) {
  const match = await prisma.match.create({
    data: {
      competition: text(formData, "competition") || "未命名赛事",
      kickoffTime: new Date(text(formData, "kickoffTime")),
      homeTeam: text(formData, "homeTeam") || "主队",
      awayTeam: text(formData, "awayTeam") || "客队",
      homeRank: toOptionalNumber(formData.get("homeRank")),
      awayRank: toOptionalNumber(formData.get("awayRank")),
      preMatchSummary: text(formData, "preMatchSummary"),
      recommendedPick: text(formData, "recommendedPick"),
      predictedScore: text(formData, "predictedScore"),
      confidenceLevel: Math.min(5, Math.max(1, toNumber(formData.get("confidenceLevel"), 3)))
    }
  });

  revalidatePath("/");
  redirect(`/matches/${match.id}`);
}

export async function updateMatchAnalysis(matchId: string, formData: FormData) {
  await prisma.match.update({
    where: { id: matchId },
    data: {
      competition: text(formData, "competition"),
      kickoffTime: new Date(text(formData, "kickoffTime")),
      homeTeam: text(formData, "homeTeam"),
      awayTeam: text(formData, "awayTeam"),
      homeRank: toOptionalNumber(formData.get("homeRank")),
      awayRank: toOptionalNumber(formData.get("awayRank")),
      preMatchSummary: text(formData, "preMatchSummary"),
      fundamentalAnalysis: text(formData, "fundamentalAnalysis"),
      oddsAnalysis: text(formData, "oddsAnalysis"),
      overUnderAnalysis: text(formData, "overUnderAnalysis"),
      gameScriptAnalysis: text(formData, "gameScriptAnalysis"),
      recommendedPick: text(formData, "recommendedPick"),
      predictedScore: text(formData, "predictedScore"),
      confidenceLevel: Math.min(5, Math.max(1, toNumber(formData.get("confidenceLevel"), 3)))
    }
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
}

export async function addBet(matchId: string, formData: FormData) {
  const marketType = text(formData, "marketType") as MarketType;
  const manualResult = text(formData, "result") as BetResult;
  const odds = toNumber(formData.get("odds"), 1);
  const stake = toNumber(formData.get("stake"), 0);
  const entryOdds = toOptionalNumber(formData.get("entryOdds")) ?? odds;
  const closingOdds = toOptionalNumber(formData.get("closingOdds"));
  const entryLine = toOptionalNumber(formData.get("entryLine")) ?? toOptionalNumber(formData.get("line"));
  const closingLine = toOptionalNumber(formData.get("closingLine"));
  const clv = calculateClv({
    marketType,
    selection: text(formData, "selection"),
    entryOdds,
    closingOdds,
    entryLine,
    closingLine
  });
  const settlement = manualResult && manualResult !== "pending"
    ? settleManualResult(manualResult, odds, stake)
    : { result: "pending" as BetResult, profit: 0, roi: 0 };

  await prisma.bet.create({
    data: {
      matchId,
      betTime: new Date(text(formData, "betTime") || Date.now()),
      marketType: marketType || "custom",
      selection: text(formData, "selection"),
      line: toOptionalNumber(formData.get("line")),
      odds,
      stake,
      entryOdds,
      closingOdds,
      entryLine,
      closingLine,
      clvValue: closingOdds || closingLine != null ? clv.clvValue : null,
      clvResult: closingOdds || closingLine != null ? clv.clvResult : null,
      result: settlement.result,
      profit: settlement.profit,
      roi: settlement.roi,
      tags: stringifyTags(formData.get("tags")),
      errorTags: stringifyTags(formData.get("errorTags")),
      notes: text(formData, "notes")
    }
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}

export async function updateBetManualResult(matchId: string, betId: string, formData: FormData) {
  const result = text(formData, "result") as BetResult;
  const bet = await prisma.bet.findUniqueOrThrow({ where: { id: betId } });
  const settlement = settleManualResult(result, bet.odds, bet.stake);
  await prisma.bet.update({
    where: { id: betId },
    data: {
      result: settlement.result,
      profit: settlement.profit,
      roi: settlement.roi,
      tags: stringifyTags(formData.get("tags")),
      errorTags: stringifyTags(formData.get("errorTags")),
      notes: text(formData, "notes")
    }
  });
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/bet-log");
}

export async function deleteBet(matchId: string, betId: string) {
  await prisma.bet.delete({ where: { id: betId } });
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}

export async function deleteMatch(matchId: string) {
  await prisma.match.delete({ where: { id: matchId } });
  revalidatePath("/");
  revalidatePath("/matches");
  redirect("/matches");
}

export async function settleMatch(matchId: string, formData: FormData) {
  const homeScore = toNumber(formData.get("homeScore"));
  const awayScore = toNumber(formData.get("awayScore"));
  const match = await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status: "settled" },
    include: { bets: true }
  });

  await Promise.all(
    match.bets.map((bet) => {
      const settlement = settleBet({
        marketType: bet.marketType as MarketType,
        selection: bet.selection,
        line: bet.line,
        odds: bet.odds,
        stake: bet.stake,
        homeScore,
        awayScore,
        manualResult: bet.result as BetResult
      });
      return prisma.bet.update({
        where: { id: bet.id },
        data: settlement
      });
    })
  );

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  revalidatePath("/bet-log");
  revalidatePath("/review");
}

export async function updateReview(matchId: string, formData: FormData) {
  await prisma.match.update({
    where: { id: matchId },
    data: {
      reviewText: text(formData, "reviewText"),
      mistakeTags: stringifyTags(formData.get("mistakeTags")),
      successTags: stringifyTags(formData.get("successTags")),
      nextActionText: text(formData, "nextActionText")
    }
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/review");
}
