import Link from "next/link";
import type { ReactNode } from "react";
import { CleanRefreshUrl } from "@/components/clean-refresh-url";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineupIntakePanel } from "@/components/lineup-intake-panel";
import { Table, Td, Th } from "@/components/ui/table";
import { buildOverview, fetchExternalMatchDataset, type ExternalMatch } from "@/lib/external-matches";
import { summarizeMarketSignals } from "@/lib/market-consensus";
import { buildTradingDecision, type TradingDecision } from "@/lib/models/trading-decision";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ filter?: string; refresh?: string }>;

type ExecutionView = {
  status: string;
  statusTone: "positive" | "negative" | "neutral" | "outline";
  subtitle: string;
  currentAdvice: string;
  directionScore: number;
  valueScore: number;
  executionMaturity: number;
  plan: {
    main: string;
    protection: string;
    defensive: string;
    forbidden: string;
  };
  capital: Array<{
    label: string;
    value: string;
    tone: "positive" | "negative" | "neutral" | "outline";
  }>;
  abandon: string[];
  script: {
    main: string;
    priorityScores: string;
    riskScore: string;
    blowoutScore: string;
    halfFull: string;
    totals: string;
    risk: string;
  };
  sourceLabel: string;
  oddsRows: Array<{
    type: string;
    current: string;
    signal: string;
    reading: string;
    tone: "positive" | "negative" | "neutral" | "outline";
  }>;
  conditionRows: Array<{
    condition: string;
    state: string;
    result: string;
    tone: "positive" | "negative" | "neutral" | "outline";
  }>;
};

const DEFAULT_PANAMA_CROATIA_MATCH: ExternalMatch = {
  id: 20260624047,
  match_turn_str: "周二047",
  league_name: "世界杯",
  match_date: "2026-06-24",
  start_time: "2026-06-24 07:00:00",
  home_team_name: "巴拿马",
  away_team_name: "克罗地亚",
  home_score: null,
  away_score: null,
  half_home_score: null,
  half_away_score: null,
  home_red: 0,
  home_yellow: 0,
  away_red: 0,
  away_yellow: 0,
  match_status: "未开赛",
  status_str: "未开赛",
  live_minutes: "",
  has_tips: true,
  tips_count: 1,
  result_desc: "",
  sourceCategory: "manual-model",
  sourceLabel: "模型盘口",
  marketProvider: "模型盘口 / 手动录入",
  handicap: "-1",
  odds: {
    win: "4.52",
    draw: "3.44",
    lose: "2.04"
  },
  marketTip: "克罗地亚方向占优，等待首发和临场水位确认",
  maxDiff: 18
};

function ensureDefaultExecutionMatch(matches: ExternalMatch[]) {
  const targetDate = shanghaiToday();
  if (DEFAULT_PANAMA_CROATIA_MATCH.match_date !== targetDate) return matches;
  const exists = matches.some((match) => isPanamaCroatia(match) && isUpcoming(match));
  return exists ? matches : [DEFAULT_PANAMA_CROATIA_MATCH, ...matches];
}

function shanghaiToday() {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string) {
  return value.slice(0, 10);
}

function matchTimestamp(match: ExternalMatch) {
  return new Date(match.start_time.replace(" ", "T")).getTime();
}

function formatKickoff(match: ExternalMatch) {
  const date = new Date(match.start_time.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return match.start_time;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  }).format(date);
}

function isUpcoming(match: ExternalMatch) {
  const statusText = `${match.match_status} ${match.status_str}`.toLowerCase();
  const explicitlyScheduled =
    statusText.includes("未") ||
    statusText.includes("scheduled") ||
    statusText.includes("not started") ||
    statusText.includes("ns");
  if (statusText.includes("完") || statusText.includes("finished") || statusText.includes("settled")) return false;
  if (!explicitlyScheduled && (match.home_score !== null || match.away_score !== null)) return false;
  if (match.result_desc) return false;

  const kickoff = matchTimestamp(match);
  if (Number.isNaN(kickoff)) return true;
  return kickoff > Date.now();
}

function hasLineup(match: ExternalMatch) {
  return Boolean(match.homeLineup?.length && match.awayLineup?.length);
}

function isPanamaCroatia(match: ExternalMatch) {
  return match.home_team_name.includes("巴拿马") && match.away_team_name.includes("克罗地亚");
}

function isWorldCup(match: ExternalMatch) {
  return match.league_name.includes("世界杯");
}

function displayTurn(match: ExternalMatch) {
  return match.match_turn_str ? ` · ${match.match_turn_str}` : "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreTone(score: number): "positive" | "negative" | "neutral" | "outline" {
  if (score >= 75) return "positive";
  if (score < 45) return "negative";
  return "neutral";
}

function statePill(tone: "positive" | "negative" | "neutral" | "outline", children: ReactNode) {
  const cls =
    tone === "positive"
      ? "border-positive/25 bg-positive/10 text-positive"
      : tone === "negative"
        ? "border-negative/30 bg-negative/10 text-negative"
        : tone === "outline"
          ? "border-border bg-muted/25 text-foreground"
          : "border-yellow-400/25 bg-yellow-400/10 text-yellow-200";

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

function marketLabel(match: ExternalMatch) {
  return match.marketProvider || "模型盘口";
}

function oddsText(match: ExternalMatch) {
  const home = match.odds?.win ?? "-";
  const draw = match.odds?.draw ?? "-";
  const away = match.odds?.lose ?? "-";
  return `${match.home_team_name} ${home} / 平 ${draw} / ${match.away_team_name} ${away}`;
}

function asianText(match: ExternalMatch) {
  if (isPanamaCroatia(match)) return "克罗地亚 -1 / -1.25";
  return match.handicap ? `让球 ${match.handicap}` : "待补充";
}

function hasMarketData(match: ExternalMatch) {
  return Boolean(match.marketConsensus || match.odds || match.handicap || match.bettingData?.length || match.goalRateData);
}

function bettingDataText(match: ExternalMatch) {
  if (!match.bettingData?.length) return "待补充";
  return match.bettingData
    .map((item) => `${item.option}：人气${item.popularity}% / 赔率${item.odds} / 差异${item.diff}`)
    .join("；");
}

function marketTipText(match: ExternalMatch) {
  if (match.marketTip) return `提点 ${match.marketTip}`;
  if (match.maxDiff != null) return `最大差异 ${match.maxDiff}%`;
  return "待补充";
}

function buildExecutionView(match: ExternalMatch, decision: TradingDecision): ExecutionView {
  const lineupConfirmed = hasLineup(match);
  const panamaCroatia = isPanamaCroatia(match);
  const marketReady = hasMarketData(match);
  const sourceSnapshotRead = Boolean(match.lineupProvider || match.lineupNotes);
  const waterConfirmed = false;
  const lineStable = panamaCroatia ? false : Boolean(match.handicap);
  const abandonTriggered = decision.executionScore < 35;

  let executionMaturity = decision.executionScore;
  if (!lineupConfirmed) executionMaturity = Math.min(executionMaturity, 50);
  if (lineupConfirmed && lineStable && !waterConfirmed) executionMaturity = clamp(executionMaturity, 60, 70);
  if (abandonTriggered) executionMaturity = Math.min(executionMaturity, 35);

  let status = "等待确认｜暂不下注";
  let statusTone: ExecutionView["statusTone"] = "neutral";
  let currentAdvice = "等待确认，暂不下注";
  let subtitle = "距离可执行还差：首发确认 / 临场水位 / 盘口未升深";

  if (abandonTriggered) {
    status = "放弃｜不下注";
    statusTone = "negative";
    currentAdvice = "放弃，只保留记录观察";
    subtitle = "已触发放弃条件：盘口或模型信号不支持真实下注";
  } else if (lineupConfirmed && lineStable && waterConfirmed) {
    status = "可执行｜按资金方案下注";
    statusTone = "positive";
    currentAdvice = "可执行，按资金方案下注";
    executionMaturity = Math.max(executionMaturity, 75);
    subtitle = "核心条件已满足，仍需控制单场风险";
  } else if (lineupConfirmed && lineStable) {
    status = "可小注｜等待临场水位";
    statusTone = "neutral";
    currentAdvice = "可小注，等待临场水位";
    subtitle = "距离可执行还差：临场水位 / 热度确认";
  }

  if (!marketReady) {
    executionMaturity = Math.min(executionMaturity, 35);
    status = "等待盘口｜暂不下注";
    statusTone = "outline";
    currentAdvice = "盘口缺失，只记录不下注";
    subtitle = "距离可执行还差：胜平负赔率 / 让球盘口 / 临场水位";
  }

  if (panamaCroatia) {
    executionMaturity = 40;
    status = "等待确认｜暂不下注";
    statusTone = "neutral";
    currentAdvice = "等待确认，暂不下注";
    subtitle = "距离可执行还差：首发确认 / 临场水位 / 盘口未升深";
  }

  const plan = panamaCroatia
    ? {
        main: "克罗地亚胜",
        protection: "克罗地亚 -0.75 / -1 小注观察",
        defensive: "2-3球 / 让平保护",
        forbidden: "临场升至克罗地亚 -1.5 以上且高水，禁止重仓"
      }
    : {
        main: decision.recommendedStructure.main,
        protection: decision.recommendedStructure.secondary,
        defensive: decision.recommendedStructure.hedge,
        forbidden: decision.recommendedStructure.forbidden
      };

  const capital = !marketReady
    ? [
        { label: "主仓", value: "盘口缺失，0单位", tone: "outline" as const },
        { label: "小注", value: "等待胜平负/让球数据，0单位", tone: "outline" as const },
        { label: "防守", value: "仅记录观察，0单位", tone: "outline" as const },
        { label: "禁止", value: "禁止无盘口入场，0单位", tone: "negative" as const }
      ]
    : panamaCroatia
    ? [
        { label: "主仓", value: "克罗地亚胜，1单位", tone: "positive" as const },
        { label: "小注", value: "克罗地亚 -0.75 / -1，0.3单位", tone: "neutral" as const },
        { label: "防守", value: "让平 / 小3.5，0.2单位", tone: "outline" as const },
        { label: "禁止", value: "克罗地亚 -1.5以上重仓，0单位", tone: "negative" as const }
      ]
    : [
        { label: "主仓", value: `${plan.main}，1单位`, tone: "positive" as const },
        { label: "小注", value: `${plan.protection}，0.3单位`, tone: "neutral" as const },
        { label: "防守", value: `${plan.defensive}，0.2单位`, tone: "outline" as const },
        { label: "禁止", value: `${plan.forbidden}，0单位`, tone: "negative" as const }
      ];

  const abandon = panamaCroatia
    ? [
        "克罗地亚首发缺少核心中锋或主力门将",
        "临场升至 -1.5 以上且高水",
        "欧赔客胜明显升赔，但亚盘强行升深",
        "热门资金过度集中，盘口不降反升",
        "模型方向与大小球路径冲突超过25%",
        "临场继续降赔但不升盘，疑似诱买热门"
      ]
    : decision.abandonConditions;

  const script = panamaCroatia
    ? {
        main: "克罗地亚控球压制，巴拿马低位防守，比赛大概率落在2-3球区间。",
        priorityScores: "0-1 / 0-2 / 1-2",
        riskScore: "1-1",
        blowoutScore: "0-3",
        halfFull: "克罗地亚胜胜观察，但不作为主仓方向。",
        totals: "优先2-3球区间；未拿到完整大小球盘口前，不做大小球主推。",
        risk: "如果临场盘面与基本面冲突，优先降低仓位，不硬上。"
      }
    : {
        main: `${decision.gameScript.firstGoalLean}方向更可能先打开局面，节奏倾向${decision.gameScript.firstHalfTempo}。`,
        priorityScores: decision.gameScript.scoreRange,
        riskScore: "平局保护 / 小胜结构",
        blowoutScore: decision.gameScript.favoritePowerTime === "上半场" ? "早进球后扩大比分" : "下半场发力后扩大比分",
        halfFull: decision.gameScript.halfFullTimeFit,
        totals: decision.gameScript.overUnderFit,
        risk: decision.gameScript.risk
      };

  const coreOddsRows = match.marketConsensus
    ? [
        {
          type: "让球",
          current: match.marketConsensus.asianSummary,
          signal: summarizeMarketSignals(match.marketConsensus.signals).slice(0, 2).join(" / ") || "已读取",
          reading: match.marketConsensus.suggestedUse,
          tone: match.marketConsensus.signals.includes("asian_line_drops") ? "negative" as const : "neutral" as const
        },
        {
          type: "胜负",
          current: match.marketConsensus.moneylineSummary,
          signal: summarizeMarketSignals(match.marketConsensus.signals).filter((item) => item.includes("主胜") || item.includes("平局") || item.includes("客队")).join(" / ") || "已读取",
          reading: match.marketConsensus.signals.includes("home_win_drift") ? "纸面优势不等于可买主胜" : decision.direction,
          tone: match.marketConsensus.signals.includes("home_win_drift") ? "negative" as const : "neutral" as const
        },
        {
          type: "大小球",
          current: match.marketConsensus.totalGoalsSummary,
          signal: match.marketConsensus.signals.includes("under_supported") ? "小球受支撑" : "已读取",
          reading: match.marketConsensus.signals.includes("under_supported") ? "优先小球或2球以内路径，不追大球" : decision.gameScript.overUnderFit,
          tone: match.marketConsensus.signals.includes("under_supported") ? "neutral" as const : "outline" as const
        }
      ]
    : panamaCroatia
      ? [
        {
          type: "欧赔",
          current: "巴拿马 4.52 / 平 3.44 / 克罗地亚 2.04",
          signal: "客胜偏低",
          reading: "克罗地亚方向占优",
          tone: "positive" as const
        },
        {
          type: "亚盘",
          current: "克罗地亚 -1 / -1.25",
          signal: "深盘观察",
          reading: "防临场升至 -1.5",
          tone: "neutral" as const
        },
        {
          type: "大小球",
          current: "待补充",
          signal: "数据不足",
          reading: "暂不做大小球主推",
          tone: "outline" as const
        }
      ]
      : [
        {
          type: "欧赔",
          current: oddsText(match),
          signal: match.odds ? "已有赔率" : "待补充",
          reading: match.odds ? decision.direction : "不能与其他来源混算",
          tone: match.odds ? "positive" as const : "outline" as const
        },
        {
          type: "亚盘",
          current: asianText(match),
          signal: match.handicap ? "盘口观察" : "数据不足",
          reading: match.handicap ? decision.entryCondition : "等待手动录入或数据源更新",
          tone: match.handicap ? "neutral" as const : "outline" as const
        },
        {
          type: "大小球",
          current: match.goalRateData?.tip ?? "待补充",
          signal: match.goalRateData ? "模型提示" : "数据不足",
          reading: decision.gameScript.overUnderFit,
          tone: match.goalRateData ? "neutral" as const : "outline" as const
        }
      ];
  const oddsRows = [
    ...coreOddsRows,
    ...(match.bettingData?.length
      ? [
          {
            type: "胜平负差异",
            current: bettingDataText(match),
            signal: marketTipText(match),
            reading:
              match.maxDiff && match.maxDiff >= 25
                ? "差异过大，热门方向需要降仓或等待更好价格"
                : "用于校验市场热度，不等同于直接下注方向",
            tone: match.maxDiff && match.maxDiff >= 25 ? "negative" as const : "neutral" as const
          }
        ]
      : [])
  ];

  const conditionRows = panamaCroatia
    ? [
        { condition: "首发确认", state: "未确认", result: "不下注", tone: "negative" as const },
        { condition: "克罗地亚核心中后场齐整", state: "待确认", result: "不下注", tone: "outline" as const },
        { condition: "亚盘维持 -1 / -1.25 且水位正常", state: "当前观察", result: "可继续等待", tone: "neutral" as const },
        { condition: "盘口不升至 -1.5 高水", state: "待临场确认", result: "风险项", tone: "neutral" as const },
        { condition: "欧赔客胜不明显升赔", state: "当前正常", result: "方向可保留", tone: "positive" as const },
        { condition: "热门资金不过度集中", state: "待确认", result: "防诱盘", tone: "outline" as const }
      ]
    : [
        ...(sourceSnapshotRead
          ? [
              {
                condition: "临场页面读取",
                state: match.lineupProvider ? `已读取 ${match.lineupProvider}` : "已读取",
                result: match.lineupNotes || "已保存页面快照",
                tone: "positive" as const
              }
            ]
          : []),
        { condition: "首发确认", state: lineupConfirmed ? "已确认" : "未确认", result: lineupConfirmed ? "可继续等待" : "不下注", tone: lineupConfirmed ? "positive" as const : "negative" as const },
        { condition: "核心球员与门将齐整", state: lineupConfirmed ? "待核对" : "待确认", result: lineupConfirmed ? "降低误判" : "不下注", tone: lineupConfirmed ? "neutral" as const : "outline" as const },
        { condition: "亚盘水位正常", state: match.handicap ? "当前观察" : "待补充", result: match.handicap ? "可继续等待" : "不下注", tone: match.handicap ? "neutral" as const : "outline" as const },
        { condition: "盘口未异常加深", state: "待临场确认", result: "风险项", tone: "neutral" as const },
        { condition: "欧赔方向未反向", state: match.odds ? "当前正常" : "待补充", result: match.odds ? "方向可保留" : "等待数据", tone: match.odds ? "positive" as const : "outline" as const },
        { condition: "热门资金不过度集中", state: "待确认", result: "防诱盘", tone: "outline" as const }
      ];

  return {
    status,
    statusTone,
    subtitle,
    currentAdvice,
    directionScore: panamaCroatia ? 75 : decision.winScore,
    valueScore: panamaCroatia ? 72 : decision.valueScore,
    executionMaturity,
    plan,
    capital,
    abandon,
    script,
    sourceLabel: match.marketConsensus ? `${marketLabel(match)} + ${match.marketConsensus.sourceName}` : marketLabel(match),
    oddsRows,
    conditionRows
  };
}

function ScoreCapsule({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-white/[0.08] bg-background/55 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${scoreTone(value) === "positive" ? "text-positive" : scoreTone(value) === "negative" ? "text-negative" : "text-foreground"}`}>
        {value}/100
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{children}</div>;
}

function DecisionCard({ match, decision }: { match: ExternalMatch; decision: TradingDecision }) {
  const view = buildExecutionView(match, decision);

  return (
    <Card className="overflow-hidden rounded-[24px] border-white/[0.09] bg-[linear-gradient(180deg,rgba(17,24,34,0.94),rgba(8,11,17,0.94))]">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {statePill(view.statusTone, `当前状态：${view.status}`)}
              <Badge tone="outline">{match.league_name}{displayTurn(match)}</Badge>
              <Badge tone="neutral">{formatKickoff(match)}</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
              {match.home_team_name} vs {match.away_team_name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{view.subtitle}</p>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2">
            <ScoreCapsule label="方向强度" value={view.directionScore} />
            <ScoreCapsule label="盘口价值" value={view.valueScore} />
            <ScoreCapsule label="执行成熟度" value={view.executionMaturity} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[22px] border border-yellow-400/20 bg-yellow-400/[0.06] p-4">
            <SectionTitle>当前建议</SectionTitle>
            <div className="mt-3 text-2xl font-semibold text-yellow-100">{view.currentAdvice}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">这不是下注按钮，而是当前执行闸门。首发和临场水位未确认前，只保留预案，不进入主仓。</p>
          </div>

          <div className="rounded-[22px] border border-primary/18 bg-primary/[0.045] p-4">
            <SectionTitle>预案方向</SectionTitle>
            <div className="mt-3 grid gap-3 text-sm">
              <PlanLine label="主方向" value={view.plan.main} tone="positive" />
              <PlanLine label="保护方向" value={view.plan.protection} tone="neutral" />
              <PlanLine label="防守方向" value={view.plan.defensive} tone="outline" />
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-negative/35 bg-negative/[0.065] p-4 text-sm leading-6 text-negative">
          <span className="font-semibold">禁止项：</span>
          {view.plan.forbidden}
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[22px] border-white/[0.07] bg-background/35">
            <CardHeader>
              <CardTitle>资金执行方案</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {view.capital.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 text-sm">
                  {statePill(item.tone, item.label)}
                  <span className={item.tone === "negative" ? "text-negative" : "text-foreground"}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[22px] border-white/[0.07] bg-background/35">
            <CardHeader>
              <CardTitle>执行条件</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>条件</Th>
                    <Th>当前状态</Th>
                    <Th>执行结果</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.conditionRows.map((row) => (
                    <tr key={row.condition}>
                      <Td>{row.condition}</Td>
                      <Td>{statePill(row.tone, row.state)}</Td>
                      <Td>{row.result}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[22px] border-white/[0.07] bg-background/35">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>盘口时间线</CardTitle>
            <div className="text-xs text-muted-foreground">数据源：{view.sourceLabel}</div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <thead>
                <tr>
                  <Th>类型</Th>
                  <Th>当前盘口</Th>
                  <Th>变化信号</Th>
                  <Th>解读</Th>
                </tr>
              </thead>
              <tbody>
                {view.oddsRows.map((row) => (
                  <tr key={row.type}>
                    <Td>{row.type}</Td>
                    <Td>{row.current}</Td>
                    <Td>{statePill(row.tone, row.signal)}</Td>
                    <Td className="max-w-xl text-muted-foreground">{row.reading}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        {match.marketConsensus ? <MarketConsensusCard match={match} /> : null}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[22px] border-white/[0.07] bg-background/35">
            <CardHeader>
              <CardTitle>比赛脚本</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <ScriptLine label="主脚本" value={view.script.main} strong />
              <ScriptLine label="优先比分" value={view.script.priorityScores} />
              <ScriptLine label="风险比分" value={view.script.riskScore} tone="negative" />
              <ScriptLine label="爆穿比分" value={view.script.blowoutScore} />
              <ScriptLine label="半全场" value={view.script.halfFull} />
              <ScriptLine label="大小球" value={view.script.totals} />
              <ScriptLine label="风险" value={view.script.risk} tone="neutral" />
            </CardContent>
          </Card>

          <Card className="rounded-[22px] border-white/[0.07] bg-background/35">
            <CardHeader>
              <CardTitle>角球模型</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <CornerMetric label="总角球" value={decision.cornerModel.expectedTotalCorners} />
                <CornerMetric label="主队角球" value={decision.cornerModel.homeCornerAdvantage} />
                <CornerMetric label="客队角球" value={decision.cornerModel.awayCornerAdvantage} />
              </div>
              <div className="rounded-2xl border border-primary/18 bg-primary/[0.045] p-3 text-sm leading-6">
                <div className="text-xs text-primary">模型提示</div>
                <div className="mt-1">{decision.cornerModel.cornerPick}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">{decision.cornerModel.cornerRisk}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[22px] border-negative/35 bg-negative/[0.045]">
          <CardHeader>
            <CardTitle className="text-negative">立即放弃下注的情况</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {view.abandon.map((item) => (
                <div key={item} className="rounded-2xl border border-negative/20 bg-background/35 px-3 py-2 text-sm leading-6 text-negative">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <details className="rounded-[22px] border border-white/[0.07] bg-background/30 p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">赛后复盘：比赛结束后自动生成</summary>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            {decision.reviewFocus.map((item) => (
              <div key={item} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                {item}
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function MarketConsensusCard({ match }: { match: ExternalMatch }) {
  const consensus = match.marketConsensus;
  if (!consensus) return null;
  const labels = summarizeMarketSignals(consensus.signals);

  return (
    <Card className="rounded-[22px] border-primary/18 bg-primary/[0.035]">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>雷速三合一盘口共识</CardTitle>
          <div className="mt-2 text-xs text-muted-foreground">
            {consensus.sourceName} · {consensus.companyCount || "多"}家公司 · 可信度 {consensus.confidence}/100
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <Badge key={label} tone={label.includes("主胜") || label.includes("退浅") ? "negative" : label.includes("小球") ? "neutral" : "outline"}>
              {label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
          <div className="text-xs text-muted-foreground">让球</div>
          <div className="mt-1 text-foreground">{consensus.asianSummary}</div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
          <div className="text-xs text-muted-foreground">胜负</div>
          <div className="mt-1 text-foreground">{consensus.moneylineSummary}</div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
          <div className="text-xs text-muted-foreground">总进球</div>
          <div className="mt-1 text-foreground">{consensus.totalGoalsSummary}</div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-3 xl:col-span-2">
          <div className="text-xs text-primary">模型使用方式</div>
          <div className="mt-1 text-foreground">{consensus.suggestedUse}</div>
        </div>
        <div className="rounded-2xl border border-negative/30 bg-negative/[0.06] p-3">
          <div className="text-xs text-negative">禁止</div>
          <div className="mt-1 text-negative">{consensus.avoid}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanLine({ label, value, tone }: { label: string; value: string; tone: "positive" | "negative" | "neutral" | "outline" }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/35 p-3 sm:flex-row sm:items-center sm:justify-between">
      {statePill(tone, label)}
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function ScriptLine({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "negative" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 ${strong ? "text-base font-semibold text-foreground" : tone === "negative" ? "text-negative" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function CornerMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function queueFilter(match: ExternalMatch, decision: TradingDecision, filter?: string) {
  const view = buildExecutionView(match, decision);
  if (!filter || filter === "today" || filter === "future") return true;
  if (filter === "entry") return view.status.startsWith("可执行") || view.status.startsWith("可小注");
  if (filter === "wait") return view.status.startsWith("等待");
  if (filter === "record") return view.status.includes("暂不下注");
  if (filter === "abandon") return view.status.startsWith("放弃");
  if (filter === "worldcup") return isWorldCup(match);
  if (filter === "value") return view.valueScore >= 70;
  if (filter === "risk") return decision.tags.some((tag) => tag.tone === "negative") || view.abandon.length >= 4;
  return true;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-2 text-xs transition ${
        active ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-muted/20 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function DailyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const activeFilter = params.filter ?? "today";
  const dataset = await fetchExternalMatchDataset({ forceRefresh: params.refresh === "1" });
  const targetDate = shanghaiToday();
  const matches = ensureDefaultExecutionMatch(dataset.matches);
  const overview = buildOverview(matches, targetDate);
  const todayUpcomingMatches = overview.todayMatches.filter((match) => isUpcoming(match));
  const futureUpcomingMatches = overview.futureMatches.filter((match) => isUpcoming(match));
  const candidateSource =
    activeFilter === "today"
      ? todayUpcomingMatches.length
        ? overview.todayMatches
        : futureUpcomingMatches
      : activeFilter === "future"
        ? futureUpcomingMatches
        : overview.allMatches;
  const usingFutureFallback = activeFilter === "today" && todayUpcomingMatches.length === 0 && futureUpcomingMatches.length > 0;
  const refreshHref = activeFilter === "today" ? "/daily?refresh=1" : `/daily?filter=${activeFilter}&refresh=1`;
  const strictUpcomingToday = todayUpcomingMatches.length;
  const candidates = candidateSource
    .filter((match) => isUpcoming(match))
    .sort((a, b) => {
      if (isPanamaCroatia(a)) return -1;
      if (isPanamaCroatia(b)) return 1;
      return matchTimestamp(a) - matchTimestamp(b);
    })
    .slice(0, 18)
    .map((match) => ({ match, decision: buildTradingDecision(match, overview.allMatches) }))
    .filter(({ match, decision }) => queueFilter(match, decision, activeFilter));
  const marketCovered = candidates.filter(({ match }) => hasMarketData(match)).length;
  const marketMissing = candidates
    .filter(({ match }) => !hasMarketData(match))
    .map(({ match }) => `${match.home_team_name} vs ${match.away_team_name}`)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <CleanRefreshUrl enabled={params.refresh === "1"} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.26em] text-primary">Pre-match execution terminal</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">赛前决策队列</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            页面现在只回答四件事：能不能下、下什么、下多少、什么情况撤。胜率判断、盘口价值和执行建议分开显示。
          </p>
        </div>
        <Link href={refreshHref} className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary">
          刷新数据
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink href="/daily?filter=today" active={activeFilter === "today"}>今日</FilterLink>
        <FilterLink href="/daily?filter=future" active={activeFilter === "future"}>未来</FilterLink>
        <FilterLink href="/daily?filter=entry" active={activeFilter === "entry"}>可入场</FilterLink>
        <FilterLink href="/daily?filter=wait" active={activeFilter === "wait"}>等待确认</FilterLink>
        <FilterLink href="/daily?filter=record" active={activeFilter === "record"}>只记录</FilterLink>
        <FilterLink href="/daily?filter=abandon" active={activeFilter === "abandon"}>放弃</FilterLink>
        <FilterLink href="/daily?filter=worldcup" active={activeFilter === "worldcup"}>世界杯</FilterLink>
        <FilterLink href="/daily?filter=value" active={activeFilter === "value"}>高价值</FilterLink>
        <FilterLink href="/daily?filter=risk" active={activeFilter === "risk"}>高风险</FilterLink>
      </div>

      <LineupIntakePanel />

      {usingFutureFallback ? (
        <Card className="border-primary/20 bg-primary/[0.045]">
          <CardContent className="p-4 text-sm leading-6 text-muted-foreground">
            今日剩余未开赛场次已结束，当前自动展示未来赛程的赛前决策队列。盘口和赔率优先使用进球之星差异源，未覆盖的字段会标为待补充。
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MiniMetric label="数据源" value={dataset.sourceStats.filter((item) => item.connected).length} suffix="个已连接" />
        <MiniMetric label="今日比赛" value={overview.todayMatches.length} suffix="场" />
        <MiniMetric label="待开赛" value={strictUpcomingToday} suffix="场" />
        <MiniMetric label="决策队列" value={candidates.length} suffix="场" />
      </div>

      <Card className="border-white/[0.07] bg-card/65">
        <CardContent className="flex flex-col gap-3 p-4 text-sm leading-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-medium text-foreground">盘口覆盖：{marketCovered}/{candidates.length || 0} 场</div>
            <div className="mt-1 text-muted-foreground">
              已把进球之星胜平负差异、北单让球、雷速三合一快照统一接入盘口时间线；缺源场次不生成主仓建议。
            </div>
          </div>
          {marketMissing.length ? (
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              待补：{marketMissing.join("、")}
            </div>
          ) : (
            <Badge tone="positive">当前筛选已覆盖</Badge>
          )}
        </CardContent>
      </Card>

      <div className="space-y-5">
        {candidates.map(({ match, decision }) => (
          <DecisionCard key={`${match.id}-${match.start_time}`} match={match} decision={decision} />
        ))}
        {!candidates.length ? (
          <Card>
            <CardContent className="p-8 text-sm text-muted-foreground">当前筛选下没有可展示的赛前比赛。</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-[22px] border border-white/[0.07] bg-card/65 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        <span className="pb-1 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}
