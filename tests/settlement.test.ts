import { describe, expect, it } from "vitest";
import {
  profitForResult,
  settleAsianHandicap,
  settleBet,
  settleBtts,
  settleManualResult,
  settleMoneyline,
  settleOverUnder
} from "@/lib/settlement";

describe("profitForResult", () => {
  it("calculates full, half, push and loss outcomes", () => {
    expect(profitForResult("win", 1.9, 100)).toBe(90);
    expect(profitForResult("half_win", 1.9, 100)).toBe(45);
    expect(profitForResult("push", 1.9, 100)).toBe(0);
    expect(profitForResult("half_loss", 1.9, 100)).toBe(-50);
    expect(profitForResult("loss", 1.9, 100)).toBe(-100);
  });
});

describe("moneyline settlement", () => {
  it("wins home moneyline when home score is higher", () => {
    const result = settleMoneyline({
      marketType: "moneyline",
      selection: "home",
      odds: 2,
      stake: 100,
      homeScore: 2,
      awayScore: 1
    });

    expect(result).toEqual({ result: "win", profit: 100, roi: 1 });
  });

  it("loses draw selection when match has a winner", () => {
    const result = settleMoneyline({
      marketType: "moneyline",
      selection: "draw",
      odds: 3.2,
      stake: 100,
      homeScore: 1,
      awayScore: 2
    });

    expect(result).toEqual({ result: "loss", profit: -100, roi: -1 });
  });
});

describe("asian handicap settlement", () => {
  it("settles -0.25 as win when selected team wins", () => {
    const result = settleAsianHandicap({
      marketType: "asian_handicap",
      selection: "home",
      line: -0.25,
      odds: 1.92,
      stake: 100,
      homeScore: 1,
      awayScore: 0
    });

    expect(result).toEqual({ result: "win", profit: 92, roi: 0.92 });
  });

  it("settles -0.25 as half loss on draw", () => {
    const result = settleAsianHandicap({
      marketType: "asian_handicap",
      selection: "home",
      line: -0.25,
      odds: 1.92,
      stake: 100,
      homeScore: 1,
      awayScore: 1
    });

    expect(result).toEqual({ result: "half_loss", profit: -50, roi: -0.5 });
  });

  it("settles +0.25 as half win on draw", () => {
    const result = settleAsianHandicap({
      marketType: "asian_handicap",
      selection: "away",
      line: 0.25,
      odds: 1.8,
      stake: 100,
      homeScore: 1,
      awayScore: 1
    });

    expect(result).toEqual({ result: "half_win", profit: 40, roi: 0.4 });
  });

  it("settles level ball as push on draw", () => {
    const result = settleAsianHandicap({
      marketType: "asian_handicap",
      selection: "home",
      line: 0,
      odds: 1.86,
      stake: 100,
      homeScore: 0,
      awayScore: 0
    });

    expect(result).toEqual({ result: "push", profit: 0, roi: 0 });
  });
});

describe("over under settlement", () => {
  it("settles over 2.5 as win when total goals is 3", () => {
    const result = settleOverUnder({
      marketType: "over_under",
      selection: "over",
      line: 2.5,
      odds: 1.95,
      stake: 200,
      homeScore: 2,
      awayScore: 1
    });

    expect(result).toEqual({ result: "win", profit: 190, roi: 0.95 });
  });

  it("settles under 2.25 as half win when total goals is 2", () => {
    const result = settleOverUnder({
      marketType: "over_under",
      selection: "under",
      line: 2.25,
      odds: 1.9,
      stake: 100,
      homeScore: 1,
      awayScore: 1
    });

    expect(result).toEqual({ result: "half_win", profit: 45, roi: 0.45 });
  });

  it("settles over 3 as push when total goals is 3", () => {
    const result = settleOverUnder({
      marketType: "over_under",
      selection: "over",
      line: 3,
      odds: 1.9,
      stake: 100,
      homeScore: 2,
      awayScore: 1
    });

    expect(result).toEqual({ result: "push", profit: 0, roi: 0 });
  });
});

describe("manual and extensible markets", () => {
  it("uses manual result for correct score", () => {
    const result = settleBet({
      marketType: "correct_score",
      selection: "2-1",
      odds: 8,
      stake: 50,
      manualResult: "win"
    });

    expect(result).toEqual({ result: "win", profit: 350, roi: 7 });
  });

  it("settles btts yes automatically", () => {
    const result = settleBtts({
      marketType: "btts",
      selection: "yes",
      odds: 1.75,
      stake: 100,
      homeScore: 2,
      awayScore: 1
    });

    expect(result).toEqual({ result: "win", profit: 75, roi: 0.75 });
  });

  it("calculates manual half loss", () => {
    expect(settleManualResult("half_loss", 2.1, 100)).toEqual({
      result: "half_loss",
      profit: -50,
      roi: -0.5
    });
  });
});
