export type BetResult = "pending" | "win" | "half_win" | "push" | "half_loss" | "loss";

export type MarketType =
  | "moneyline"
  | "handicap"
  | "asian_handicap"
  | "over_under"
  | "half_full_time"
  | "correct_score"
  | "total_goals"
  | "btts"
  | "player_goal"
  | "custom";

export type SettlementInput = {
  marketType: MarketType;
  selection: string;
  line?: number | null;
  odds: number;
  stake: number;
  homeScore?: number | null;
  awayScore?: number | null;
  manualResult?: BetResult;
};

export type SettlementOutput = {
  result: BetResult;
  profit: number;
  roi: number;
};

const EPSILON = 0.000001;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function withRoi(result: BetResult, profit: number, stake: number): SettlementOutput {
  const rounded = roundMoney(profit);
  return {
    result,
    profit: rounded,
    roi: stake > 0 ? roundMoney(rounded / stake) : 0
  };
}

export function profitForResult(result: BetResult, odds: number, stake: number) {
  switch (result) {
    case "win":
      return roundMoney(stake * (odds - 1));
    case "half_win":
      return roundMoney((stake * (odds - 1)) / 2);
    case "push":
    case "pending":
      return 0;
    case "half_loss":
      return roundMoney(-stake / 2);
    case "loss":
      return roundMoney(-stake);
    default:
      return 0;
  }
}

export function settleManualResult(result: BetResult, odds: number, stake: number) {
  return withRoi(result, profitForResult(result, odds, stake), stake);
}

function normalizeSelection(selection: string) {
  const value = selection.trim().toLowerCase();
  if (["home", "主", "主队", "主胜", "h", "1"].includes(value)) return "home";
  if (["draw", "平", "平局", "x"].includes(value)) return "draw";
  if (["away", "客", "客队", "客胜", "a", "2"].includes(value)) return "away";
  if (["over", "大", "大球", "o"].includes(value)) return "over";
  if (["under", "小", "小球", "u"].includes(value)) return "under";
  if (["yes", "是", "双方进球", "btts yes"].includes(value)) return "yes";
  if (["no", "否", "btts no"].includes(value)) return "no";
  return value;
}

function resultFromProfit(profit: number, fullWinProfit: number, stake: number): BetResult {
  if (profit > fullWinProfit / 2 + EPSILON) return "win";
  if (profit > EPSILON) return "half_win";
  if (Math.abs(profit) <= EPSILON) return "push";
  if (profit < -stake / 2 - EPSILON) return "loss";
  return "half_loss";
}

export function settleMoneyline(input: SettlementInput) {
  if (input.homeScore == null || input.awayScore == null) return settleManualOrPending(input);
  const selection = normalizeSelection(input.selection);
  const actual =
    input.homeScore > input.awayScore
      ? "home"
      : input.homeScore < input.awayScore
        ? "away"
        : "draw";
  const result: BetResult = selection === actual ? "win" : "loss";
  return settleManualResult(result, input.odds, input.stake);
}

function splitQuarterLine(line: number) {
  const doubled = Math.round(line * 2) / 2;
  if (Math.abs(line - doubled) < EPSILON) return [doubled, doubled];
  const lower = line > 0 ? Math.floor(line * 2) / 2 : Math.ceil(line * 2) / 2;
  const upper = line > 0 ? lower + 0.5 : lower - 0.5;
  return [lower, upper];
}

function settleSpreadPart(adjustedMargin: number, odds: number, stakePart: number) {
  if (adjustedMargin > EPSILON) return stakePart * (odds - 1);
  if (Math.abs(adjustedMargin) <= EPSILON) return 0;
  return -stakePart;
}

export function settleAsianHandicap(input: SettlementInput) {
  if (input.homeScore == null || input.awayScore == null || input.line == null) {
    return settleManualOrPending(input);
  }

  const selection = normalizeSelection(input.selection);
  const selectedGoals = selection === "away" ? input.awayScore : input.homeScore;
  const opponentGoals = selection === "away" ? input.homeScore : input.awayScore;
  const parts = splitQuarterLine(input.line);
  const stakePart = input.stake / 2;
  const profit = parts.reduce((sum, line) => {
    return sum + settleSpreadPart(selectedGoals + line - opponentGoals, input.odds, stakePart);
  }, 0);

  return withRoi(resultFromProfit(profit, input.stake * (input.odds - 1), input.stake), profit, input.stake);
}

export function settleOverUnder(input: SettlementInput) {
  if (input.homeScore == null || input.awayScore == null || input.line == null) {
    return settleManualOrPending(input);
  }

  const selection = normalizeSelection(input.selection);
  const totalGoals = input.homeScore + input.awayScore;
  const parts = splitQuarterLine(input.line);
  const stakePart = input.stake / 2;
  const profit = parts.reduce((sum, line) => {
    const adjusted = selection === "under" ? line - totalGoals : totalGoals - line;
    return sum + settleSpreadPart(adjusted, input.odds, stakePart);
  }, 0);

  return withRoi(resultFromProfit(profit, input.stake * (input.odds - 1), input.stake), profit, input.stake);
}

export function settleBtts(input: SettlementInput) {
  if (input.homeScore == null || input.awayScore == null) return settleManualOrPending(input);
  const selection = normalizeSelection(input.selection);
  const actual = input.homeScore > 0 && input.awayScore > 0 ? "yes" : "no";
  return settleManualResult(selection === actual ? "win" : "loss", input.odds, input.stake);
}

export function settleManualOrPending(input: SettlementInput) {
  if (input.manualResult && input.manualResult !== "pending") {
    return settleManualResult(input.manualResult, input.odds, input.stake);
  }
  return withRoi("pending", 0, input.stake);
}

export function settleBet(input: SettlementInput): SettlementOutput {
  switch (input.marketType) {
    case "moneyline":
    case "handicap":
      return settleMoneyline(input);
    case "asian_handicap":
      return settleAsianHandicap(input);
    case "over_under":
    case "total_goals":
      return settleOverUnder(input);
    case "btts":
      return settleBtts(input);
    case "half_full_time":
    case "correct_score":
    case "player_goal":
    case "custom":
    default:
      return settleManualOrPending(input);
  }
}
