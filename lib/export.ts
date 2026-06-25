import type { BetWithMatch } from "@/lib/analytics";
import { MARKET_LABELS, RESULT_LABELS } from "@/lib/constants";
import { formatPercent, parseTags } from "@/lib/utils";

export function betRowsForExport(bets: BetWithMatch[]) {
  return bets.map((bet) => ({
    日期: bet.betTime.toISOString().slice(0, 10),
    比赛: `${bet.match.homeTeam} 对 ${bet.match.awayTeam}`,
    赛事: bet.match.competition,
    开赛时间: bet.match.kickoffTime.toISOString(),
    玩法类型: MARKET_LABELS[bet.marketType] ?? bet.marketType,
    投注方向: bet.selection,
    盘口: bet.line ?? "",
    赔率: bet.odds,
    本金: bet.stake,
    赛果:
      bet.match.homeScore == null || bet.match.awayScore == null
        ? ""
        : `${bet.match.homeScore}-${bet.match.awayScore}`,
    结算结果: RESULT_LABELS[bet.result] ?? bet.result,
    盈亏: bet.profit,
    回报率: formatPercent(bet.roi),
    标签: parseTags(bet.tags).join(", "),
    备注: bet.notes
  }));
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function rowsToCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","))
  ].join("\n");
}
