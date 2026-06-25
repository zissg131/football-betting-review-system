import { describe, expect, it } from "vitest";
import { analyzeOddsMovement, buildTradingDecision } from "@/lib/models/trading-decision";
import { calculateClv } from "@/lib/models/clv";
import { parseLineupText } from "@/lib/lineup-intake";
import { parseLeisuThreeInOneText } from "@/lib/market-consensus";
import type { ExternalMatch } from "@/lib/external-matches";

function match(overrides: Partial<ExternalMatch> = {}): ExternalMatch {
  return {
    id: 1,
    match_turn_str: "001",
    league_name: "世界杯",
    match_date: "2026-06-23",
    start_time: "2026-06-23 22:00:00",
    home_team_name: "法国",
    away_team_name: "伊拉克",
    home_score: null,
    away_score: null,
    half_home_score: null,
    half_away_score: null,
    home_red: 0,
    home_yellow: 0,
    away_red: 0,
    away_yellow: 0,
    match_status: "未开赛",
    status_str: "未",
    live_minutes: "",
    has_tips: false,
    tips_count: 0,
    result_desc: "",
    ...overrides
  };
}

describe("trading decision model", () => {
  it("separates win probability from market execution when odds are missing", () => {
    const decision = buildTradingDecision(match(), [], [], new Date("2026-06-23T08:00:00"));

    expect(decision.winScore).toBeGreaterThan(decision.valueScore);
    expect(decision.actionTag).toBe("等待盘口");
    expect(decision.riskNote).toContain("盘口");
  });

  it("downgrades a strong favorite when the handicap is deep and market tips conflict", () => {
    const decision = buildTradingDecision(
      match({
        handicap: "-3",
        odds: { win: "2.59", draw: "4.12", lose: "2.68" },
        marketTip: "平负",
        maxDiff: 43,
        bettingData: [
          { option: "胜", popularity: "38.68", odds: "1.13", probability: "82.55%", diff: "43%", tip: "平负", result: "" }
        ]
      }),
      [],
      [],
      new Date("2026-06-23T08:00:00")
    );

    expect(decision.winScore).toBeGreaterThan(70);
    expect(decision.valueScore).toBeLessThan(55);
    expect(decision.actionTag).not.toBe("可入场");
    expect(decision.tags.map((tag) => tag.label)).toContain("强队深盘风险");
    expect(decision.recommendedStructure.forbidden).toContain("禁止");
  });

  it("marks average win probability but strong price value as a small value spot", () => {
    const decision = buildTradingDecision(
      match({
        home_team_name: "奥地利",
        away_team_name: "塞内加尔",
        handicap: "0",
        odds: { win: "2.55", draw: "3.05", lose: "2.82" },
        marketTip: "胜",
        maxDiff: 16
      }),
      [],
      [],
      new Date("2026-06-23T08:00:00")
    );

    expect(decision.winScore).toBeLessThan(70);
    expect(decision.valueScore).toBeGreaterThanOrEqual(68);
    expect(decision.direction).toContain("价值盘");
  });

  it("detects odds movement labels from snapshots", () => {
    const tags = analyzeOddsMovement([
      { phase: "initial", snapshotTime: "2026-06-22T10:00:00", homeWinOdds: 1.78, asianLine: -1 },
      { phase: "closing", snapshotTime: "2026-06-23T21:00:00", homeWinOdds: 1.62, asianLine: -1 }
    ]);

    expect(tags.map((tag) => tag.label)).toContain("降赔不升盘");
  });

  it("calculates positive CLV when closing odds move lower after entry", () => {
    const clv = calculateClv({
      marketType: "moneyline",
      selection: "法国胜",
      entryOdds: 1.92,
      closingOdds: 1.78
    });

    expect(clv.clvResult).toBe("positive");
    expect(clv.clvValue).toBeGreaterThan(0);
  });

  it("parses pasted lineup text into both teams", () => {
    const parsed = parseLineupText(
      "阿根廷：马丁内斯、莫利纳、罗梅罗、奥塔门迪、塔利亚菲科、德保罗、麦卡利斯特、恩佐、梅西、劳塔罗、阿尔瓦雷斯\n伊拉克：门将、后卫1、后卫2、中场1、中场2、前锋1",
      "阿根廷",
      "伊拉克"
    );

    expect(parsed.homePlayers.length).toBeGreaterThanOrEqual(10);
    expect(parsed.awayPlayers.length).toBeGreaterThanOrEqual(6);
    expect(parsed.notes).toContain("识别");
  });

  it("uses confirmed lineup snapshots to avoid waiting for lineup", () => {
    const decision = buildTradingDecision(
      match({
        handicap: "-0.5",
        odds: { win: "1.75", draw: "3.50", lose: "4.60" },
        marketTip: "胜",
        maxDiff: 14,
        homeLineup: [
          { name: "Lionel Messi", position: "Forward" },
          { name: "Emiliano Martinez", position: "Goalkeeper" }
        ],
        awayLineup: [{ name: "Goalkeeper", position: "Goalkeeper" }],
        lineupProvider: "手动粘贴"
      }),
      [],
      [],
      new Date("2026-06-23T18:30:00")
    );

    expect(decision.lineupImpact.lineupImpactScore).toBeGreaterThan(68);
    expect(decision.riskNote).not.toContain("首发未确认");
  });

  it("parses Leisu 3-in-1 odds consensus from readable text", () => {
    const consensus = parseLeisuThreeInOneText(
      "三合一 共[19/19]间公司 让球 主胜水位走高 0.5退到0.25 胜负 主胜普遍升赔 平赔下降 客胜下降 总进球 大球升水 小球低水"
    );

    expect(consensus?.companyCount).toBe(19);
    expect(consensus?.signals).toContain("home_win_drift");
    expect(consensus?.signals).toContain("asian_line_drops");
    expect(consensus?.signals).toContain("under_supported");
  });

  it("downgrades a home favorite when Leisu consensus rejects the home side", () => {
    const decision = buildTradingDecision(
      match({
        home_team_name: "瑞士",
        away_team_name: "加拿大",
        handicap: "-0.25",
        odds: { win: "2.45", draw: "3.0", lose: "3.2" },
        marketConsensus: {
          sourceName: "雷速三合一盘口",
          capturedAt: "2026-06-24T18:11:00.000Z",
          companyCount: 19,
          asianSummary: "让球由瑞士 -0.5 退至 -0.25，主队水位走高。",
          moneylineSummary: "主胜升赔，平赔与客胜下压。",
          totalGoalsSummary: "小球低水受支撑。",
          signals: ["home_win_drift", "draw_protection", "away_supported", "asian_line_drops", "under_supported"],
          suggestedUse: "加拿大受让、平局保护或小球结构。",
          avoid: "禁止瑞士独赢或让球重仓。",
          confidence: 78
        }
      }),
      [],
      [],
      new Date("2026-06-24T22:00:00")
    );

    expect(decision.tags.map((tag) => tag.label)).toContain("跨公司盘口共识");
    expect(decision.tags.map((tag) => tag.label)).toContain("主胜升赔");
    expect(decision.recommendedStructure.main).toContain("加拿大");
    expect(decision.recommendedStructure.forbidden).toContain("禁止");
  });
});
