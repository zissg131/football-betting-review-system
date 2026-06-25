export type MarketConsensusSignal =
  | "home_win_drift"
  | "draw_protection"
  | "away_supported"
  | "asian_line_drops"
  | "asian_home_water_rises"
  | "under_supported"
  | "over_heat_risk";

export type MarketConsensus = {
  sourceName: string;
  sourceUrl?: string;
  capturedAt: string;
  companyCount: number;
  asianSummary: string;
  moneylineSummary: string;
  totalGoalsSummary: string;
  signals: MarketConsensusSignal[];
  suggestedUse: string;
  avoid: string;
  confidence: number;
};

export function summarizeMarketSignals(signals: MarketConsensusSignal[]) {
  const labels: Record<MarketConsensusSignal, string> = {
    home_win_drift: "主胜升赔",
    draw_protection: "平局保护",
    away_supported: "客队受支撑",
    asian_line_drops: "让球退浅",
    asian_home_water_rises: "主队水位走高",
    under_supported: "小球受支撑",
    over_heat_risk: "大球追热风险"
  };

  return signals.map((signal) => labels[signal] ?? signal);
}

export function parseLeisuThreeInOneText(text: string): MarketConsensus | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || !/三合一|让球|胜负|总进球/.test(normalized)) return null;

  const companyMatch = normalized.match(/共\[\s*(\d+)\s*\/\s*(\d+)\s*\]间公司/);
  const companyCount = companyMatch ? Number(companyMatch[1]) : 0;
  const hasHomeDrift =
    /主胜.{0,40}(升|上升|走高|升赔)/.test(normalized) ||
    /胜负.{0,80}主胜.{0,80}(升|↑)/.test(normalized) ||
    /主胜普遍升赔/.test(normalized);
  const hasDrawProtection = /平局|平赔|平.*保护|和局/.test(normalized);
  const hasAwaySupport = /客胜.{0,40}(降|下降|走低|受支撑)|客队.{0,30}不败|加拿大.{0,30}受支撑/.test(normalized);
  const hasLineDrop = /退盘|退浅|0\.5.{0,20}0\.25|0\.25.{0,20}0\.0|让球.{0,40}(降|退)/.test(normalized);
  const hasHomeWaterRise = /主队水位.{0,20}(升|走高)|主胜水位.{0,20}(升|走高)/.test(normalized);
  const hasUnder = /小球.{0,40}(降|低水|受支撑)|大球.{0,40}(升|走高)|总进球.{0,80}小球/.test(normalized);

  const signals: MarketConsensusSignal[] = [];
  if (hasHomeDrift) signals.push("home_win_drift");
  if (hasDrawProtection) signals.push("draw_protection");
  if (hasAwaySupport) signals.push("away_supported");
  if (hasLineDrop) signals.push("asian_line_drops");
  if (hasHomeWaterRise) signals.push("asian_home_water_rises");
  if (hasUnder) signals.push("under_supported");

  if (!signals.length && !companyCount) return null;

  return {
    sourceName: "雷速三合一盘口",
    capturedAt: new Date().toISOString(),
    companyCount,
    asianSummary: hasLineDrop || hasHomeWaterRise ? "多家公司让球由瑞士浅让继续退浅，主队水位走高，盘口没有继续支持瑞士穿盘。" : "已读取让球盘口，需结合临场水位确认。",
    moneylineSummary: hasHomeDrift || hasDrawProtection || hasAwaySupport ? "胜负赔率倾向主胜升赔、平赔和客胜被压低，市场更偏向加拿大不败或平局保护。" : "已读取胜负赔率，未形成强共识。",
    totalGoalsSummary: hasUnder ? "总进球多数停留在2.25/2.5附近，大球水位走高，小球低水受支撑。" : "总进球盘口已读取，暂未形成明确大小球共识。",
    signals,
    suggestedUse: "优先把瑞士方向降为观察，若入场更适合加拿大受让、平局保护或小球结构；等待临场最后一次水位确认。",
    avoid: "禁止追瑞士独赢或瑞士让球重仓；若主胜继续升赔但盘口强行不退，应直接放弃主队方向。",
    confidence: companyCount >= 12 ? 78 : companyCount >= 6 ? 68 : 58
  };
}
