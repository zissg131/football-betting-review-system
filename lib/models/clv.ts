export type ClvResult = "positive" | "neutral" | "negative";

export type ClvInput = {
  marketType: string;
  selection: string;
  entryOdds?: number | null;
  closingOdds?: number | null;
  entryLine?: number | null;
  closingLine?: number | null;
};

function directionMultiplier(selection: string) {
  const text = selection.toLowerCase();
  if (text.includes("客") || text.includes("away") || text.includes("受让") || text.includes("under") || text.includes("小")) return -1;
  return 1;
}

export function calculateClv(input: ClvInput) {
  const oddsMove =
    input.entryOdds && input.closingOdds ? Number((input.entryOdds - input.closingOdds).toFixed(3)) : 0;
  const lineMove =
    input.entryLine != null && input.closingLine != null
      ? Number(((input.closingLine - input.entryLine) * directionMultiplier(input.selection)).toFixed(3))
      : 0;
  const clvValue = Number((oddsMove + lineMove * 0.18).toFixed(3));
  const clvResult: ClvResult = clvValue > 0.015 ? "positive" : clvValue < -0.015 ? "negative" : "neutral";
  return { clvValue, clvResult };
}
