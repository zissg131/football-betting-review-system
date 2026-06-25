import type { ExternalMatch, MarketDiffOption } from "@/lib/external-matches";

export type Tone = "positive" | "negative" | "neutral" | "outline";

export type ActionTag = "可入场" | "等待首发" | "等待盘口" | "只记录不下注" | "放弃";

export type OddsSnapshotLike = {
  phase?: string;
  snapshotTime?: Date | string;
  source?: string;
  homeWinOdds?: number | null;
  drawOdds?: number | null;
  awayWinOdds?: number | null;
  asianLine?: number | null;
  asianHomeOdds?: number | null;
  asianAwayOdds?: number | null;
  overUnderLine?: number | null;
  overOdds?: number | null;
  underOdds?: number | null;
  homeCornerLine?: number | null;
  awayCornerLine?: number | null;
  totalCornerLine?: number | null;
  notes?: string | null;
};

export type OddsMovementTag = {
  label: string;
  explanation: string;
  tone: Tone;
};

export type TradingDecision = {
  winScore: number;
  valueScore: number;
  executionScore: number;
  modelScore: number;
  confidence: number;
  actionTag: ActionTag;
  actionTone: Tone;
  direction: string;
  reason: string;
  entryCondition: string;
  riskNote: string;
  recommendedStructure: {
    main: string;
    secondary: string;
    hedge: string;
    forbidden: string;
  };
  abandonConditions: string[];
  reviewFocus: string[];
  tags: OddsMovementTag[];
  oddsTimeline: Array<OddsSnapshotLike & { phaseLabel: string }>;
  gameScript: {
    firstHalfTempo: string;
    firstGoalLean: string;
    favoritePowerTime: string;
    protectsLead: string;
    comebackAbility: string;
    halfFullTimeFit: string;
    overUnderFit: string;
    cornerFit: string;
    scoreRange: string;
    risk: string;
  };
  cornerModel: {
    expectedTotalCorners: number;
    homeCornerAdvantage: number;
    awayCornerAdvantage: number;
    cornerPick: string;
    cornerRisk: string;
  };
  lineupImpact: {
    homeFormation: string;
    awayFormation: string;
    homeKeyAbsences: string[];
    awayKeyAbsences: string[];
    homeRotationCount: number;
    awayRotationCount: number;
    homeHasMainStriker: boolean;
    awayHasMainStriker: boolean;
    homeMainKeeperStarts: boolean;
    awayMainKeeperStarts: boolean;
    lineupImpactScore: number;
    lineupNotes: string;
  };
};

export const PRACTICAL_JUDGMENT_METHODS = [
  {
    title: "胜率与盘口分离",
    description: "先判断谁更可能占优，再判断赔率和盘口是否已经把优势定价过度，避免强队思维直接推到让胜。"
  },
  {
    title: "盘口深浅校验",
    description: "强弱差越大越要检查让球是否过深，深盘强队常见风险是赢球不赢盘。"
  },
  {
    title: "欧亚与热度冲突",
    description: "赔率、让球、人气比例和差异提示不一致时，优先降低执行分，而不是提高仓位。"
  },
  {
    title: "首发影响",
    description: "中锋、门将、五后卫、轮换数量会改变穿盘、大球、双进和角球判断。"
  },
  {
    title: "比赛路径",
    description: "把上半场节奏、先进球倾向、强队发力时间和领先后节奏纳入玩法结构。"
  },
  {
    title: "CLV 复盘",
    description: "赛后不仅看输赢，还要看是否拿到比收盘更好的价格，区分判断质量和短期结果。"
  }
];

const STRENGTH: Record<string, number> = {
  阿根廷: 93,
  法国: 92,
  英格兰: 90,
  葡萄牙: 89,
  西班牙: 89,
  巴西: 91,
  德国: 87,
  荷兰: 86,
  比利时: 84,
  乌拉圭: 83,
  克罗地亚: 82,
  哥伦比亚: 82,
  日本: 80,
  美国: 76,
  奥地利: 76,
  挪威: 75,
  塞内加尔: 74,
  伊朗: 72,
  加纳: 70,
  阿尔及利亚: 71,
  埃及: 71,
  乌兹别克: 68,
  伊拉克: 64,
  约旦: 63,
  新西兰: 62,
  巴拿马: 62,
  刚果金: 65,
  佛得角: 63
};

const PHASE_LABELS: Record<string, string> = {
  initial: "初盘",
  t24h: "开赛前24小时",
  t6h: "开赛前6小时",
  t1h: "开赛前1小时",
  lineup: "首发后",
  closing: "收盘",
  current: "当前"
};

const EXTRA_STRENGTH: Record<string, number> = {
  瑞士: 79,
  加拿大: 72,
  摩洛哥: 83,
  海地: 58,
  南非: 66,
  韩国: 78,
  捷克: 74,
  墨西哥: 79,
  库拉索: 58,
  科特迪瓦: 76,
  厄瓜多尔: 77,
  瑞典: 76,
  巴拉圭: 73,
  澳大利亚: 75,
  土耳其: 76,
  苏格兰: 73,
  波黑: 69,
  卡塔尔: 66,
  突尼斯: 70,
  沙特: 67
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function strength(team: string) {
  return STRENGTH[team] ?? EXTRA_STRENGTH[team] ?? 72;
}

export function teamStrength(team: string) {
  const raw = strength(team);
  if (raw >= 88) return 5;
  if (raw >= 80) return 4;
  if (raw >= 72) return 3;
  if (raw >= 64) return 2;
  return 1;
}

function kickoffHours(match: ExternalMatch, now = new Date()) {
  return (new Date(match.start_time.replace(" ", "T")).getTime() - now.getTime()) / 36e5;
}

function isUpcoming(match: ExternalMatch) {
  return match.match_status === "未开赛";
}

function marketOptionTip(options?: MarketDiffOption[]) {
  if (!options?.length) return "";
  const tips = options.map((item) => item.tip).filter(Boolean);
  return tips[0] ?? "";
}

function optionDiff(options?: MarketDiffOption[]) {
  if (!options?.length) return 0;
  return Math.max(
    ...options.map((item) => {
      const parsed = toNumber(item.diff);
      return parsed ?? 0;
    })
  );
}

function favoriteSide(gap: number) {
  if (gap >= 7) return "home";
  if (gap <= -7) return "away";
  return "balanced";
}

function favoredName(match: ExternalMatch, gap: number) {
  if (gap >= 7) return match.home_team_name;
  if (gap <= -7) return match.away_team_name;
  return "均势方";
}

function marketSupportsFavorite(match: ExternalMatch, gap: number) {
  if (match.marketConsensus?.signals.includes("home_win_drift") && gap > 0) return false;
  if (match.marketConsensus?.signals.includes("asian_line_drops") && gap > 0) return false;
  const tip = match.marketTip || marketOptionTip(match.bettingData);
  if (!tip) return true;
  if (gap >= 7) return tip.includes("胜");
  if (gap <= -7) return tip.includes("负");
  return true;
}

function handicapDepth(match: ExternalMatch, gap: number) {
  const line = Math.abs(toNumber(match.handicap) ?? 0);
  if (Math.abs(gap) >= 24 && line >= 1.5) return "deep";
  if (Math.abs(gap) >= 15 && line >= 1) return "watch";
  if (line >= 2) return "deep";
  return "normal";
}

function confidenceFromExecution(score: number) {
  if (score >= 78) return 5;
  if (score >= 64) return 4;
  if (score >= 48) return 3;
  if (score >= 34) return 2;
  return 1;
}

function actionFromExecution(executionScore: number, hasMarket: boolean, needsLineup: boolean): ActionTag {
  if (executionScore >= 75) return "可入场";
  if (!hasMarket && executionScore >= 45) return "等待盘口";
  if (needsLineup && executionScore >= 60) return "等待首发";
  if (executionScore >= 60) return "等待盘口";
  if (executionScore >= 45) return "只记录不下注";
  return "放弃";
}

function actionTone(action: ActionTag): Tone {
  if (action === "可入场") return "positive";
  if (action === "放弃") return "negative";
  if (action === "只记录不下注") return "outline";
  return "neutral";
}

function lineText(match: ExternalMatch) {
  return match.handicap ? `${match.handicap}` : "未给出";
}

function favoriteLineText(match: ExternalMatch, gap: number) {
  const line = toNumber(match.handicap);
  if (line === null) return lineText(match);
  const favoriteLine = gap < 0 ? -line : line;
  if (favoriteLine > 0) return `+${favoriteLine}`;
  return `${favoriteLine}`;
}

function buildRecommendedStructure(match: ExternalMatch, gap: number, valueScore: number, deepRisk: boolean) {
  const favorite = favoredName(match, gap);
  const side = favoriteSide(gap);
  const totalLean = match.goalRateData?.tip?.includes("大") ? "大球观察" : match.goalRateData?.tip?.includes("小") ? "小球观察" : "2-3球";
  const consensus = match.marketConsensus;
  const homeFavoriteRejected =
    gap > 0 && Boolean(consensus?.signals.some((signal) => ["home_win_drift", "asian_line_drops", "away_supported", "draw_protection"].includes(signal)));

  if (homeFavoriteRejected) {
    return {
      main: `${match.away_team_name} 受让 / 平局保护`,
      secondary: consensus?.signals.includes("under_supported") ? "小2.5 / 小2.75 等水位确认" : "等待临场胜负赔率是否继续压平赔",
      hedge: "比分 0-0 / 1-1 / 1-2 区间记录",
      forbidden: `禁止 ${match.home_team_name} 独赢或让球重仓，主胜升赔时不追主队`
    };
  }

  if (side === "balanced") {
    return {
      main: valueScore >= 68 ? `${totalLean} / 平局保护` : "不做胜负主推",
      secondary: "等待临场大小球水位",
      hedge: "比分 1-1 / 2-1 区间记录",
      forbidden: "禁止强行选边，禁止把均势盘加入串关凑场"
    };
  }

  if (deepRisk) {
    return {
      main: `${favorite} 不败或胜平负方向仅作底座`,
      secondary: `${favorite} 小胜结构 / 让平观察`,
      hedge: `${totalLean}，比分 1-0 / 2-1 / 2-0`,
      forbidden: `禁止 ${favorite} 深盘重仓，禁止追 ${lineText(match)} 以上穿盘`
    };
  }

  return {
    main: `${favorite} 胜`,
    secondary: match.handicap ? `${favorite} ${favoriteLineText(match, gap)} 小注观察` : `${favorite} 浅盘确认后再入场`,
    hedge: `${totalLean} / 让平保护`,
    forbidden: `禁止临场降赔后追高，禁止 ${favorite} -1.5 以上重仓`
  };
}

function positionIncludes(value: string | undefined, patterns: string[]) {
  const text = (value ?? "").toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

function hasMainStriker(players?: ExternalMatch["homeLineup"]) {
  if (!players?.length) return true;
  return players.some((player) =>
    positionIncludes(player.position, ["forward", "striker", "centre-forward", "winger", "attacker"]) ||
    /梅西|劳塔罗|阿尔瓦雷斯|messi|lautaro|alvarez|lukaku|mbappe|kane|ronaldo/i.test(player.name)
  );
}

function hasKeeper(players?: ExternalMatch["homeLineup"]) {
  if (!players?.length) return true;
  return players.some((player) => positionIncludes(player.position, ["goalkeeper", "keeper"]));
}

function buildLineupImpact(match?: Partial<TradingDecision["lineupImpact"]> & Pick<ExternalMatch, "homeLineup" | "awayLineup" | "lineupProvider" | "lineupNotes">): TradingDecision["lineupImpact"] {
  const homeLineupConfirmed = Boolean(match?.homeLineup?.some((player) => !player.substitute));
  const awayLineupConfirmed = Boolean(match?.awayLineup?.some((player) => !player.substitute));
  const homeRotationCount = match?.homeRotationCount ?? 0;
  const awayRotationCount = match?.awayRotationCount ?? 0;
  const homeHasMainStriker = match?.homeHasMainStriker ?? hasMainStriker(match?.homeLineup);
  const awayHasMainStriker = match?.awayHasMainStriker ?? hasMainStriker(match?.awayLineup);
  const homeMainKeeperStarts = match?.homeMainKeeperStarts ?? hasKeeper(match?.homeLineup);
  const awayMainKeeperStarts = match?.awayMainKeeperStarts ?? hasKeeper(match?.awayLineup);
  let score = homeLineupConfirmed || awayLineupConfirmed ? 78 : 68;
  if (!homeHasMainStriker || !awayHasMainStriker) score -= 7;
  if (!homeMainKeeperStarts || !awayMainKeeperStarts) score -= 6;
  if (homeRotationCount > 3 || awayRotationCount > 3) score -= 12;

  const notes = [
    homeLineupConfirmed || awayLineupConfirmed ? `首发快照来自 ${match?.lineupProvider ?? "临场采集"}` : "首发尚未确认",
    homeRotationCount > 3 || awayRotationCount > 3 ? "轮换超过3人时降低执行分" : "暂无明显轮换风险",
    !homeHasMainStriker || !awayHasMainStriker ? "正印中锋缺阵会降低穿盘能力" : "主力中锋状态待临场确认",
    !homeMainKeeperStarts || !awayMainKeeperStarts ? "主力门将缺阵会提高大球与双进风险" : "门将信息无负面信号"
  ].join("；");

  return {
    homeFormation: match?.homeFormation || "待确认",
    awayFormation: match?.awayFormation || "待确认",
    homeKeyAbsences: match?.homeKeyAbsences ?? [],
    awayKeyAbsences: match?.awayKeyAbsences ?? [],
    homeRotationCount,
    awayRotationCount,
    homeHasMainStriker,
    awayHasMainStriker,
    homeMainKeeperStarts,
    awayMainKeeperStarts,
    lineupImpactScore: clamp(score),
    lineupNotes: match?.lineupNotes || notes
  };
}

function buildGameScript(match: ExternalMatch, gap: number, deepRisk: boolean): TradingDecision["gameScript"] {
  const favorite = favoredName(match, gap);
  const strongGap = Math.abs(gap) >= 18;
  const totalTip = match.goalRateData?.tip ?? "";
  const tempo = totalTip.includes("小") || deepRisk ? "中慢" : totalTip.includes("大") ? "快" : "中";
  const firstGoalLean = strongGap ? favorite : "不明确";
  const powerTime = deepRisk ? "下半场" : strongGap ? "上半场" : "不明确";

  return {
    firstHalfTempo: tempo,
    firstGoalLean,
    favoritePowerTime: powerTime,
    protectsLead: deepRisk ? "领先后可能降速收缩" : "领先后仍需看临场节奏",
    comebackAbility: strongGap ? "弱队反扑能力偏弱，但可能制造定位球" : "双方都有反扑空间",
    halfFullTimeFit: deepRisk ? "平胜 / 胜胜小注观察" : strongGap ? "胜胜观察" : "不适合强做",
    overUnderFit: totalTip.includes("大") ? "适合观察大球，但需防早盘升高" : totalTip.includes("小") ? "适合观察小球低水" : "以2-3球区间为主",
    cornerFit: strongGap ? `${favorite} 压制角球方向` : "角球不作为主推",
    scoreRange: deepRisk ? "1-0 / 2-0 / 2-1" : strongGap ? "2-0 / 2-1 / 3-1" : "1-1 / 2-1 / 1-2",
    risk: deepRisk ? "强队早进球后可能降速，穿盘价值下降" : "若临场盘口与基本面冲突，优先降低仓位"
  };
}

function buildCornerModel(match: ExternalMatch, gap: number, lineup: TradingDecision["lineupImpact"]): TradingDecision["cornerModel"] {
  const favorite = favoredName(match, gap);
  const strongGap = Math.abs(gap) >= 16;
  let expected = strongGap ? 9.5 : 8.4;
  if (lineup.homeFormation.includes("4-3-3") || lineup.awayFormation.includes("4-3-3")) expected += 0.5;
  if (!lineup.homeHasMainStriker || !lineup.awayHasMainStriker) expected -= 0.4;
  const homeAdv = gap > 0 ? clamp(5.4 + gap / 18, 3.5, 7.5) : clamp(4.4 + gap / 24, 2.8, 5.2);
  const awayAdv = clamp(expected - homeAdv, 2.5, 7.2);

  return {
    expectedTotalCorners: Number(expected.toFixed(1)),
    homeCornerAdvantage: Number(homeAdv.toFixed(1)),
    awayCornerAdvantage: Number(awayAdv.toFixed(1)),
    cornerPick: strongGap ? `${favorite} 角球让球 / 强队角球大观察` : "总角球等待阵型确认",
    cornerRisk: strongGap
      ? "若强队早早领先并降速，角球会低于压制预期"
      : "均势局角球受比分路径影响较大，不建议作为主仓"
  };
}

function snapshotFromMatch(match: ExternalMatch): OddsSnapshotLike | null {
  const homeWinOdds = toNumber(match.odds?.win);
  const drawOdds = toNumber(match.odds?.draw);
  const awayWinOdds = toNumber(match.odds?.lose);
  const asianLine = toNumber(match.handicap);
  if (!homeWinOdds && !drawOdds && !awayWinOdds && asianLine == null) return null;
  return {
    phase: "current",
    source: match.marketProvider || "进球之星盘口差异",
    snapshotTime: match.start_time,
    homeWinOdds,
    drawOdds,
    awayWinOdds,
    asianLine,
    notes: match.marketTip ? `差异提点：${match.marketTip}` : ""
  };
}

export function analyzeOddsMovement(snapshots: OddsSnapshotLike[], match?: ExternalMatch): OddsMovementTag[] {
  const tags: OddsMovementTag[] = [];
  const ordered = [...snapshots].sort((a, b) => {
    const at = a.snapshotTime ? new Date(a.snapshotTime).getTime() : 0;
    const bt = b.snapshotTime ? new Date(b.snapshotTime).getTime() : 0;
    return at - bt;
  });
  const first = ordered[0];
  const last = ordered.at(-1);

  if (first && last && first !== last) {
    const homeOddsDrop = (first.homeWinOdds ?? 0) > 0 && (last.homeWinOdds ?? 0) > 0 && (last.homeWinOdds ?? 0) < (first.homeWinOdds ?? 0);
    const lineSame = (first.asianLine ?? null) === (last.asianLine ?? null);
    const lineRises = Math.abs(last.asianLine ?? 0) > Math.abs(first.asianLine ?? 0);
    const lowWater = (last.asianHomeOdds ?? 1) <= 0.9 || (last.homeWinOdds ?? 2) <= 1.65;
    const highWater = (last.asianHomeOdds ?? 1) >= 1.02;

    if (homeOddsDrop && lineSame) {
      tags.push({
        label: "降赔不升盘",
        explanation: "赔率压低但让球没有同步加深，说明市场认可胜率但盘口保护不足，需要防小胜或热度诱导。",
        tone: "negative"
      });
    }
    if (lineRises && lowWater) {
      tags.push({
        label: "升盘低水",
        explanation: "盘口加深后仍保持低水，方向阻力较小，但仍需确认首发和成交热度。",
        tone: "positive"
      });
    }
    if (lineRises && highWater) {
      tags.push({
        label: "升盘高水",
        explanation: "盘口加深但回报过高，可能是强行造深盘，穿盘稳定性不足。",
        tone: "negative"
      });
    }
    if (!lineRises && homeOddsDrop && (match?.maxDiff ?? 0) >= 18) {
      tags.push({
        label: "退盘不退热",
        explanation: "盘口没有继续支持强队，但热度或差异仍偏向热门，容易出现赢球不赢盘。",
        tone: "negative"
      });
    }
  }

  if (match) {
    const home = strength(match.home_team_name);
    const away = strength(match.away_team_name);
    const gap = home - away;
    const line = Math.abs(toNumber(match.handicap) ?? 0);
    const deepRisk = handicapDepth(match, gap) === "deep";
    const tip = match.marketTip || marketOptionTip(match.bettingData);
    const consensus = match.marketConsensus;

    if (consensus) {
      tags.push({
        label: "跨公司盘口共识",
        explanation: `雷速三合一读取 ${consensus.companyCount || "多"} 家公司：${consensus.suggestedUse}`,
        tone: consensus.confidence >= 70 ? "positive" : "neutral"
      });
      if (consensus.signals.includes("home_win_drift")) {
        tags.push({
          label: "主胜升赔",
          explanation: "多家公司主胜赔率走高，说明主队方向没有得到赔率端继续支持，不能只按纸面实力买主胜。",
          tone: "negative"
        });
      }
      if (consensus.signals.includes("asian_line_drops")) {
        tags.push({
          label: "让球退浅",
          explanation: "让球从更深位置退到浅盘，主队穿盘能力被市场削弱，优先防受让方和小胜不穿。",
          tone: "negative"
        });
      }
      if (consensus.signals.includes("under_supported")) {
        tags.push({
          label: "小球低水",
          explanation: "总进球盘口中小球价格被压低，比赛路径更偏慢节奏或互相满足结构，不宜追大球。",
          tone: "neutral"
        });
      }
    }

    if (tip && !marketSupportsFavorite(match, gap) && Math.abs(gap) >= 7) {
      tags.push({
        label: "欧亚分歧",
        explanation: "基本面强弱方向与差异提点不一致，不能用强队更强直接推出让胜。",
        tone: "negative"
      });
    }
    if (match.goalRateData?.tip && tip && match.goalRateData.tip !== tip) {
      tags.push({
        label: "大小球冲突",
        explanation: "胜负方向与进球率提示不一致，比分路径不清晰时优先降低执行分。",
        tone: "neutral"
      });
    }
    if (deepRisk) {
      tags.push({
        label: "强队深盘风险",
        explanation: "强队胜率较高，但让球盘口过深，存在赢球不赢盘风险。",
        tone: "negative"
      });
    }
    if ((match.maxDiff ?? optionDiff(match.bettingData)) >= 25) {
      tags.push({
        label: "热门过热",
        explanation: "市场差异值过大，热门方向容易被追捧，真实入场需要等待更好的价格或放弃。",
        tone: "negative"
      });
    }
    if (match.odds?.draw && toNumber(match.odds.draw)! <= 3.35 && Math.abs(gap) <= 12) {
      tags.push({
        label: "平局保护",
        explanation: "平赔处在保护区间，均势或浅盘场景不宜忽视平局路径。",
        tone: "neutral"
      });
    }
    if (Math.abs(gap) >= 12 && line >= 0.75 && line <= 1.25) {
      tags.push({
        label: "小胜结构",
        explanation: "强队优势存在，但盘口更像一球附近保护，推荐优先考虑小胜或让平结构。",
        tone: "neutral"
      });
    }
    if (Math.abs(gap) <= 10 && (match.maxDiff ?? 0) >= 15) {
      tags.push({
        label: "冷门防范",
        explanation: "基本面差距有限但市场差异明显，需保留冷门或反向记录。",
        tone: "negative"
      });
    }
  }

  const unique = new Map<string, OddsMovementTag>();
  for (const tag of tags) unique.set(tag.label, tag);
  return Array.from(unique.values());
}

function scoreValue(match: ExternalMatch, gap: number, hasMarket: boolean, deepRisk: boolean) {
  let score = hasMarket ? 56 : 38;
  const maxDiff = match.maxDiff ?? optionDiff(match.bettingData);
  const line = toNumber(match.handicap);
  const tip = match.marketTip || marketOptionTip(match.bettingData);
  const consensus = match.marketConsensus;
  const consensusRejectsHome =
    gap > 0 && Boolean(consensus?.signals.some((signal) => ["home_win_drift", "asian_line_drops", "away_supported", "draw_protection"].includes(signal)));
  if (maxDiff >= 10 && maxDiff <= 22) score += 9;
  if (maxDiff > 28) score -= 14;
  if (marketSupportsFavorite(match, gap)) score += Math.abs(gap) >= 7 ? 7 : 6;
  else if (consensusRejectsHome) score += 4;
  else score -= 20;
  if (Math.abs(gap) < 7 && tip) score += 5;
  if (Math.abs(gap) < 7 && line === 0 && maxDiff >= 12 && maxDiff <= 24) score += 4;
  if (deepRisk) score -= 15;
  if (match.goalRateData?.tip) score += 4;
  if (match.odds?.draw && toNumber(match.odds.draw)! <= 3.25) score -= 4;
  if (consensus) {
    score += consensus.confidence >= 70 ? 5 : 2;
    if (gap > 0 && consensus.signals.includes("home_win_drift") && !consensusRejectsHome) score -= 12;
    if (gap > 0 && consensus.signals.includes("asian_line_drops") && !consensusRejectsHome) score -= 10;
    if (consensusRejectsHome) score += 5;
    if (consensus.signals.includes("draw_protection")) score -= 3;
    if (consensus.signals.includes("under_supported")) score += 3;
  }
  return clamp(score);
}

export function buildTradingDecision(
  match: ExternalMatch,
  matches: ExternalMatch[] = [],
  snapshots: OddsSnapshotLike[] = [],
  now = new Date()
): TradingDecision {
  if (!isUpcoming(match)) {
    const action = match.match_status === "进行中" ? "只记录不下注" : "放弃";
    return {
      winScore: 0,
      valueScore: 0,
      executionScore: 0,
      modelScore: 0,
      confidence: 0,
      actionTag: action,
      actionTone: actionTone(action),
      direction: match.match_status === "进行中" ? "临场不追单" : "已过赛程，仅用于复盘",
      reason: "比赛不处于赛前状态，不能生成真实入场建议。",
      entryCondition: "只记录赛果、盘口变化和复盘归因。",
      riskNote: "赛前价格已经失效，任何追单都不纳入模型建议。",
      recommendedStructure: {
        main: "不下注",
        secondary: "记录盘口",
        hedge: "赛后复盘",
        forbidden: "禁止临场追单"
      },
      abandonConditions: ["非赛前状态"],
      reviewFocus: ["记录是否有情绪下注", "复盘盘口变化是否被忽略"],
      tags: [],
      oddsTimeline: [],
      gameScript: {
        firstHalfTempo: "不适用",
        firstGoalLean: "不适用",
        favoritePowerTime: "不适用",
        protectsLead: "不适用",
        comebackAbility: "不适用",
        halfFullTimeFit: "不适用",
        overUnderFit: "不适用",
        cornerFit: "不适用",
        scoreRange: "不适用",
        risk: "非赛前状态"
      },
      cornerModel: {
        expectedTotalCorners: 0,
        homeCornerAdvantage: 0,
        awayCornerAdvantage: 0,
        cornerPick: "不适用",
        cornerRisk: "非赛前状态"
      },
      lineupImpact: buildLineupImpact(match)
    };
  }

  const home = strength(match.home_team_name);
  const away = strength(match.away_team_name);
  const gap = home - away;
  const absGap = Math.abs(gap);
  const hasMarket = Boolean(match.handicap || match.odds || match.bettingData?.length || match.maxDiff || match.marketTip || match.marketConsensus);
  const depth = handicapDepth(match, gap);
  const deepRisk = depth === "deep";
  const lineup = buildLineupImpact(match);
  const hours = kickoffHours(match, now);
  const lineupConfirmed = Boolean(match.homeLineup?.length || match.awayLineup?.length);
  const needsLineup = hours <= 8 && !lineupConfirmed;
  const currentSnapshot = snapshotFromMatch(match);
  const timeline = [...snapshots, ...(currentSnapshot ? [currentSnapshot] : [])].map((item) => ({
    ...item,
    phaseLabel: PHASE_LABELS[item.phase || "current"] ?? item.phase ?? "当前"
  }));
  const tags = analyzeOddsMovement(timeline, match);

  const winScore = Math.round(clamp(50 + absGap * 1.25 + (favoriteSide(gap) === "balanced" ? -8 : 0)));
  const valueScore = scoreValue(match, gap, hasMarket, deepRisk);
  let executionScore = Math.round(winScore * 0.28 + valueScore * 0.44 + lineup.lineupImpactScore * 0.2 + 8);
  if (!hasMarket) executionScore -= 18;
  if (deepRisk) executionScore -= 12;
  const consensusRejectsHome =
    gap > 0 && Boolean(match.marketConsensus?.signals.some((signal) => ["home_win_drift", "asian_line_drops", "away_supported", "draw_protection"].includes(signal)));
  if (!marketSupportsFavorite(match, gap) && !consensusRejectsHome) executionScore -= 14;
  if (match.marketConsensus?.signals.includes("home_win_drift") && gap > 0) executionScore -= consensusRejectsHome ? 3 : 8;
  if (match.marketConsensus?.signals.includes("asian_line_drops") && gap > 0) executionScore -= consensusRejectsHome ? 3 : 6;
  if (hours > 36) executionScore -= 8;
  if (hours < 1.5) executionScore -= 10;
  executionScore = clamp(executionScore);

  const actionTag = actionFromExecution(executionScore, hasMarket, needsLineup);
  const favorite = favoredName(match, gap);
  const structure = buildRecommendedStructure(match, gap, valueScore, deepRisk);
  const gameScript = buildGameScript(match, gap, deepRisk);
  const cornerModel = buildCornerModel(match, gap, lineup);
  const modelScore = Math.round((winScore + valueScore + executionScore) / 3);
  const confidence = confidenceFromExecution(executionScore);

  let direction = "等待盘口与首发确认";
  if (winScore >= 72 && valueScore >= 68) direction = `${favorite} 方向可入场观察`;
  else if (winScore >= 72 && valueScore < 55) direction = `${favorite} 胜率高但盘口价值不足`;
  else if (winScore < 68 && valueScore >= 68) direction = "小注价值盘，严格控仓";
  else if (winScore < 58 && valueScore < 55) direction = "放弃或只记录";
  if (!hasMarket) direction = "等待盘口";
  if (executionScore < 45) direction = "放弃";

  const executionReasons = [
    !hasMarket ? "盘口未确认" : "",
    deepRisk ? "盘口过深" : "",
    !marketSupportsFavorite(match, gap) && !consensusRejectsHome ? "差异提点与强弱方向冲突" : "",
    hours > 36 ? "距离开赛较远" : "",
    hours < 1.5 ? "临场窗口过窄" : "",
    needsLineup ? "首发未确认" : ""
    , match.marketConsensus?.signals.includes("home_win_drift") && gap > 0 ? "三合一主胜升赔" : ""
    , match.marketConsensus?.signals.includes("asian_line_drops") && gap > 0 ? "让球退浅" : ""
  ].filter(Boolean);

  const reason = [
    `胜率判断：${favoriteSide(gap) === "balanced" ? "双方实力接近" : `${favorite} 纸面优势更明显`}，胜率分 ${winScore}/100`,
    `盘口价值：当前${match.handicap ? `让球 ${match.handicap}` : "缺少让球"}，价值分 ${valueScore}/100`,
    `执行建议：${executionReasons.length ? executionReasons.join("、") : "盘口与模型方向暂时一致"}，执行分 ${executionScore}/100`
  ].join("；");

  return {
    winScore,
    valueScore,
    executionScore,
    modelScore,
    confidence,
    actionTag,
    actionTone: actionTone(actionTag),
    direction,
    reason,
    entryCondition:
      actionTag === "可入场"
        ? "只在临场盘口没有继续恶化、首发无重大缺口、价格仍优于预期时入场。"
        : "先等待首发、临场盘口和水位确认；若条件不齐，只记录不下注。",
    riskNote:
      executionScore < winScore
        ? `模型胜率不等于下注价值：${executionReasons.join("、") || "仍需价格确认"}。`
        : "当前风险主要来自临场阵容、盘口继续变化和成交热度。",
    recommendedStructure: structure,
    abandonConditions: [
      "首发出现核心中锋或主力门将缺阵且盘口不降",
      "临场继续降赔但不升盘",
      "热门方向差异继续扩大超过25%",
      "盘口升到更深后仍给高水",
      "模型方向与大小球路径明显冲突"
    ],
    reviewFocus: [
      "赛果是否符合赛前比赛路径",
      "是否拿到正向 CLV",
      "输球是否源于深盘误判或追热",
      "禁止项是否被违反"
    ],
    tags,
    oddsTimeline: timeline,
    gameScript,
    cornerModel,
    lineupImpact: lineup
  };
}
