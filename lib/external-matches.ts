import { buildMatchIntelligence, teamStrength } from "@/lib/football-intelligence";
import { findLineupSnapshot, readLineupSnapshots, type LineupSnapshot } from "@/lib/lineup-intake";
import type { MarketConsensus } from "@/lib/market-consensus";

export type ExternalMatch = {
  id: number;
  match_turn_str: string;
  league_name: string;
  match_date: string;
  start_time: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  half_home_score: number | null;
  half_away_score: number | null;
  home_red: number;
  home_yellow: number;
  away_red: number;
  away_yellow: number;
  match_status: string;
  status_str: string;
  live_minutes: string;
  has_tips: boolean;
  tips_count: number;
  result_desc: string;
  sourceCategory?: string;
  sourceLabel?: string;
  externalEventId?: string;
  marketProvider?: string;
  handicap?: string;
  odds?: {
    win?: string;
    draw?: string;
    lose?: string;
  };
  bettingData?: MarketDiffOption[];
  goalRateData?: GoalRateDiff | null;
  marketTip?: string;
  maxDiff?: number;
  homeLineup?: ExternalLineupPlayer[];
  awayLineup?: ExternalLineupPlayer[];
  lineupProvider?: string;
  lineupUpdatedAt?: string;
  lineupNotes?: string;
  marketConsensus?: MarketConsensus;
};

export type ExternalLineupPlayer = {
  name: string;
  position?: string;
  squadNumber?: string;
  substitute?: boolean;
};

export type MarketDiffOption = {
  option: string;
  popularity: string;
  odds: string;
  probability: string;
  diff: string;
  tip: string;
  result: string;
};

export type GoalRateDiff = {
  homeRate: string;
  awayRate: string;
  diff: string;
  tip: string;
  result: string;
};

export type ExternalMatchResponse = {
  code: number;
  msg: string;
  data?: {
    date_list?: string[];
    match_list?: ExternalMatch[];
  };
};

export type WorldCupStanding = {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  live: boolean;
};

const SOURCE_URL = "https://goals.yangchong.top/api/v1/matches/external";
const THE_SPORTS_DB_URL = "https://www.thesportsdb.com/api/v1/json/123/eventsday.php";
const ALEX_API_URL = "https://alex.jjkj168.com/api";
const DATASET_CACHE_MS = 45_000;

let datasetCache:
  | {
      expiresAt: number;
      value: ExternalMatchDataset;
    }
  | null = null;

export type ExternalMatchDataset = {
  source: string;
  dates: string[];
  sourceStats: {
    key: string;
    label: string;
    provider?: string;
    description?: string;
    connected: boolean;
    count: number;
  }[];
  matches: ExternalMatch[];
};

const SOURCE_CATEGORIES = [
  { key: "jczq", label: "竞彩", provider: "进球之星", description: "实时赛程、比分、历史赛果" },
  { key: "bjdc", label: "北单", provider: "进球之星", description: "实时赛程、比分、历史赛果" },
  { key: "thesportsdb", label: "全球赛程", provider: "TheSportsDB", description: "免费公开赛程与赛果补充源" },
  { key: "lineup-cache", label: "临场首发", provider: "本地快照", description: "网页读取、手动粘贴与 TheSportsDB v1 阵容快照" },
  { key: "alex-jc", label: "竞彩差异", provider: "进球之星", description: "胜平负赔率、人气比、概率与差异值" },
  { key: "alex-bd", label: "北单盘口", provider: "进球之星", description: "让球盘口、胜平负赔率与差异提点" }
];

const TEAM_NAME_CN: Record<string, string> = {
  Argentina: "阿根廷",
  France: "法国",
  England: "英格兰",
  Portugal: "葡萄牙",
  Belgium: "比利时",
  Uruguay: "乌拉圭",
  Croatia: "克罗地亚",
  Colombia: "哥伦比亚",
  Austria: "奥地利",
  Senegal: "塞内加尔",
  Egypt: "埃及",
  Ghana: "加纳",
  Iran: "伊朗",
  Japan: "日本",
  Spain: "西班牙",
  Brazil: "巴西",
  Germany: "德国",
  Netherlands: "荷兰",
  "United States": "美国",
  USA: "美国",
  "New Zealand": "新西兰",
  "Cape Verde": "佛得角",
  Norway: "挪威",
  Iraq: "伊拉克",
  Jordan: "约旦",
  Algeria: "阿尔及利亚",
  阿尔及利: "阿尔及利亚",
  民主刚果: "刚果金",
  桑德维肯斯: "桑德维肯",
  Uzbekistan: "乌兹别克",
  Panama: "巴拿马",
  "DR Congo": "刚果金",
  Bohemians: "波希米亚人",
  "St Patrick's Athletic": "圣帕特里克竞技",
  Breidablik: "贝雷达比历",
  Vikingur: "维京古尔"
};

const EXTRA_TEAM_NAME_CN: Record<string, string> = {
  argentina: "阿根廷",
  france: "法国",
  england: "英格兰",
  portugal: "葡萄牙",
  belgium: "比利时",
  uruguay: "乌拉圭",
  croatia: "克罗地亚",
  colombia: "哥伦比亚",
  austria: "奥地利",
  senegal: "塞内加尔",
  egypt: "埃及",
  ghana: "加纳",
  iran: "伊朗",
  japan: "日本",
  spain: "西班牙",
  brazil: "巴西",
  germany: "德国",
  netherlands: "荷兰",
  unitedstates: "美国",
  usa: "美国",
  newzealand: "新西兰",
  capeverde: "佛得角",
  norway: "挪威",
  iraq: "伊拉克",
  jordan: "约旦",
  algeria: "阿尔及利亚",
  uzbekistan: "乌兹别克斯坦",
  panama: "巴拿马",
  drcongo: "刚果金",
  democraticrepublicofcongo: "刚果金",
  bohemians: "波希米亚人",
  stpatricksathletic: "圣帕特里克竞技",
  breidablik: "贝雷达比历",
  vikingur: "维京古尔",
  switzerland: "瑞士",
  canada: "加拿大",
  morocco: "摩洛哥",
  haiti: "海地",
  southafrica: "南非",
  southkorea: "韩国",
  curacao: "库拉索",
  ivorycoast: "科特迪瓦",
  cotedivoire: "科特迪瓦",
  ecuador: "厄瓜多尔",
  sweden: "瑞典",
  paraguay: "巴拉圭",
  australia: "澳大利亚",
  turkey: "土耳其",
  turkiye: "土耳其",
  scotland: "苏格兰",
  bosniaandherzegovina: "波黑",
  bosniaherzegovina: "波黑",
  qatar: "卡塔尔"
};

function canonicalNameKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "");
}

function formatShanghaiDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
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

function addDateDays(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function normalizeDate(value: string) {
  return value.slice(0, 10);
}

function matchTimestamp(match: ExternalMatch) {
  return new Date(match.start_time.replace(" ", "T")).getTime();
}

export function buildMatchAdvice(match: ExternalMatch, matches: ExternalMatch[] = []) {
  const intelligence = buildMatchIntelligence(match, matches);

  if (match.match_status === "进行中") {
    return {
      direction: intelligence.direction,
      confidence: intelligence.confidence,
      reason: intelligence.reason
    };
  }

  if (match.match_status !== "未开赛") {
    return {
      direction: "已过赛程",
      confidence: 0,
      reason: "该场已经不是赛前状态，不生成投注建议。"
    };
  }

  return {
    direction: intelligence.direction,
    confidence: intelligence.confidence,
    reason: intelligence.reason
  };
}

export function buildOverview(matches: ExternalMatch[], targetDate = shanghaiToday()) {
  const todayMatches = matches.filter((match) => normalizeDate(match.start_time) === targetDate);
  const futureMatches = matches
    .filter((match) => match.match_status === "未开赛" && normalizeDate(match.start_time) > targetDate)
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b));
  const upcoming = todayMatches.filter((match) => match.match_status === "未开赛").length;
  const live = todayMatches.filter((match) => match.match_status === "进行中").length;
  const finished = todayMatches.filter((match) => match.match_status === "完场").length;
  const recommended = todayMatches
    .map((match) => ({ match, advice: buildMatchAdvice(match, matches), intelligence: buildMatchIntelligence(match, matches) }))
    .filter((item) => item.advice.confidence >= 4);
  const standings = buildWorldCupStandings(matches);
  const potentialPairings = buildPotentialPairings(futureMatches, matches);

  return {
    targetDate,
    allMatches: matches,
    todayMatches,
    futureMatches,
    upcoming,
    live,
    finished,
    recommended,
    standings,
    potentialPairings
  };
}

function emptyStanding(team: string): WorldCupStanding {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    live: false
  };
}

function applyResult(
  table: Map<string, WorldCupStanding>,
  team: string,
  opponent: string,
  goalsFor: number,
  goalsAgainst: number,
  live: boolean
) {
  const standing = table.get(team) ?? emptyStanding(team);
  standing.played += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDiff = standing.goalsFor - standing.goalsAgainst;
  standing.live = standing.live || live;

  if (goalsFor > goalsAgainst) {
    standing.wins += 1;
    standing.points += 3;
  } else if (goalsFor === goalsAgainst) {
    standing.draws += 1;
    standing.points += 1;
  } else {
    standing.losses += 1;
  }

  table.set(team, standing);
  if (!table.has(opponent)) table.set(opponent, emptyStanding(opponent));
}

export function buildWorldCupStandings(matches: ExternalMatch[]) {
  const table = new Map<string, WorldCupStanding>();
  const worldCupMatches = matches.filter((match) => match.league_name.includes("世界杯"));

  for (const match of worldCupMatches) {
    if (!table.has(match.home_team_name)) table.set(match.home_team_name, emptyStanding(match.home_team_name));
    if (!table.has(match.away_team_name)) table.set(match.away_team_name, emptyStanding(match.away_team_name));

    const canCount =
      (match.match_status === "完场" || match.match_status === "进行中") &&
      match.home_score !== null &&
      match.away_score !== null;

    if (!canCount) continue;

    const live = match.match_status === "进行中";
    applyResult(table, match.home_team_name, match.away_team_name, match.home_score ?? 0, match.away_score ?? 0, live);
    applyResult(table, match.away_team_name, match.home_team_name, match.away_score ?? 0, match.home_score ?? 0, live);
  }

  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.localeCompare(b.team, "zh-CN");
  });
}

export function buildPotentialPairings(matches: ExternalMatch[], contextMatches: ExternalMatch[] = matches) {
  return matches.slice(0, 10).map((match) => {
    const advice = buildMatchAdvice(match, contextMatches);
    return {
      match,
      label: `${match.home_team_name} 对 ${match.away_team_name}`,
      note:
        advice.confidence >= 4
          ? `${advice.direction}，信心 ${advice.confidence}/5`
          : "优先观察首发、临场盘口和成交热度。"
    };
  });
}

function dedupeMatches(matches: ExternalMatch[]) {
  const seen = new Map<string, ExternalMatch>();

  function shouldReplace(existing: ExternalMatch, incoming: ExternalMatch) {
    if (existing.match_status !== "完场" && incoming.match_status === "完场") return true;
    if (existing.sourceCategory === "thesportsdb" && incoming.sourceCategory !== "thesportsdb") return true;
    return false;
  }

  for (const match of matches) {
    const key = `${match.league_name}-${match.start_time}-${match.home_team_name}-${match.away_team_name}`;
    const looseEntry = Array.from(seen.entries()).find(([, existing]) => {
      const sameTeams =
        existing.league_name === match.league_name &&
        existing.home_team_name === match.home_team_name &&
        existing.away_team_name === match.away_team_name;
      if (!sameTeams) return false;
      return normalizeDate(existing.start_time) === normalizeDate(match.start_time) || Math.abs(matchTimestamp(existing) - matchTimestamp(match)) <= 12 * 36e5;
    });

    if (looseEntry) {
      const [looseKey, existing] = looseEntry;
      if (shouldReplace(existing, match)) seen.set(looseKey, match);
      continue;
    }

    const existing = seen.get(key);
    if (existing && !shouldReplace(existing, match)) continue;
    seen.set(key, match);
  }
  return Array.from(seen.values()).sort((a, b) => matchTimestamp(a) - matchTimestamp(b));
}

type AlexDiffMatch = {
  id: string;
  league: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  score?: string;
  homeRank?: string;
  awayRank?: string;
  bettingData?: MarketDiffOption[];
  goalRateData?: GoalRateDiff | null;
};

type AlexBonusMatch = {
  id: string;
  order: string;
  league: string;
  time: string;
  homeTeam: string;
  handicap?: string;
  awayTeam: string;
  odds?: {
    win?: string;
    draw?: string;
    lose?: string;
  };
  isResultOut?: boolean;
};

type AlexResponse<T> = {
  success: boolean;
  data?: {
    matches?: T[];
    totalMatches?: number;
  };
  message?: string;
};

async function requestAlexJson<T>(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${ALEX_API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "Football Edge Tracker/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`进球之星盘口接口响应异常：${response.status}`);
  }

  const payload = (await response.json()) as AlexResponse<T>;
  if (!payload.success) {
    throw new Error(payload.message || "进球之星盘口接口返回失败");
  }

  return {
    matches: payload.data?.matches ?? [],
    count: payload.data?.totalMatches ?? payload.data?.matches?.length ?? 0,
    source: url.toString()
  };
}

function parseMarketDiff(value?: string) {
  if (!value) return 0;
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function marketTipFromOptions(options?: MarketDiffOption[]) {
  if (!options?.length) return "";
  const counts = new Map<string, number>();
  for (const item of options) {
    if (!item.tip) continue;
    counts.set(item.tip, (counts.get(item.tip) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function oddsFromOptions(options?: MarketDiffOption[]) {
  if (!options?.length) return undefined;
  const find = (label: string) => options.find((item) => item.option === label)?.odds;
  const odds = {
    win: find("胜"),
    draw: find("平"),
    lose: find("负")
  };
  return odds.win || odds.draw || odds.lose ? odds : undefined;
}

function mergeMarketData(match: ExternalMatch, diff?: AlexDiffMatch, bonus?: AlexBonusMatch): ExternalMatch {
  const bettingData = diff?.bettingData ?? match.bettingData;
  const goalRateData = diff?.goalRateData ?? match.goalRateData ?? null;
  const maxDiff = bettingData?.length ? Math.max(...bettingData.map((item) => parseMarketDiff(item.diff))) : match.maxDiff;
  const marketTip = marketTipFromOptions(bettingData) || goalRateData?.tip || match.marketTip;
  const optionOdds = oddsFromOptions(bettingData);

  return {
    ...match,
    home_team_name: normalizeTeamName(match.home_team_name),
    away_team_name: normalizeTeamName(match.away_team_name),
    handicap: bonus?.handicap ?? match.handicap,
    odds: bonus?.odds ?? match.odds ?? optionOdds,
    bettingData,
    goalRateData,
    maxDiff,
    marketTip,
    marketProvider: diff || bonus ? "进球之星盘口差异" : match.marketProvider,
    has_tips: match.has_tips || Boolean(diff || bonus),
    tips_count: match.tips_count + (diff?.bettingData?.length ?? 0) + (bonus?.odds ? 1 : 0)
  };
}

function matchMarketRecord(match: ExternalMatch, records: Array<AlexDiffMatch | AlexBonusMatch>) {
  const home = normalizedTeamKey(match.home_team_name);
  const away = normalizedTeamKey(match.away_team_name);
  const startDateText = normalizeDate(match.start_time).slice(5);
  const matchDateText = normalizeDate(match.match_date).slice(5);

  return records.find((record) => {
    const recordHome = normalizedTeamKey(record.homeTeam);
    const recordAway = normalizedTeamKey(record.awayTeam);
    const sameTeams = recordHome === home && recordAway === away;
    if (!sameTeams) return false;
    return record.time.includes(startDateText) || record.time.includes(matchDateText) || !record.time.includes("-");
  });
}

async function fetchAlexMarketDataset(targetDate: string) {
  const jcDates = Array.from({ length: 4 }, (_, index) => addDateDays(targetDate, index));

  const results = await Promise.allSettled([
    ...jcDates.map((date) => requestAlexJson<AlexDiffMatch>("/matches", { date })),
    requestAlexJson<AlexDiffMatch>("/danchang/matches"),
    requestAlexJson<AlexBonusMatch>("/bonus/matches")
  ]);

  const jcResults = results.slice(0, jcDates.length);
  const danchang = results.at(-2);
  const bonus = results.at(-1);
  const jcMatches = jcResults.flatMap((result) => (result.status === "fulfilled" ? result.value.matches : []));
  const bdDiffMatches = danchang?.status === "fulfilled" ? danchang.value.matches : [];
  const bonusMatches: AlexBonusMatch[] = bonus?.status === "fulfilled" ? (bonus.value.matches as AlexBonusMatch[]) : [];

  return {
    jcMatches,
    bdDiffMatches,
    bonusMatches,
    sourceStats: [
      {
        key: "alex-jc",
        connected: jcResults.some((result) => result.status === "fulfilled"),
        count: jcMatches.length
      },
      {
        key: "alex-bd",
        connected: danchang?.status === "fulfilled" || bonus?.status === "fulfilled",
        count: Math.max(bdDiffMatches.length, bonusMatches.filter((match) => !match.isResultOut).length)
      }
    ]
  };
}

function enrichMatchesWithMarket(matches: ExternalMatch[], marketData: Awaited<ReturnType<typeof fetchAlexMarketDataset>>) {
  const diffRecords = [...marketData.bdDiffMatches, ...marketData.jcMatches];
  return matches.map((match) => {
    const diff = matchMarketRecord(match, diffRecords) as AlexDiffMatch | undefined;
    const bonus = matchMarketRecord(match, marketData.bonusMatches) as AlexBonusMatch | undefined;
    return mergeMarketData(match, diff, bonus);
  });
}

async function requestExternalMatches(category = "jczq", type = "now", date?: string) {
  const url = new URL(SOURCE_URL);
  url.searchParams.set("category", category);
  url.searchParams.set("type", type);
  if (date) url.searchParams.set("date", date);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`外部数据源响应异常：${response.status}`);
  }

  const payload = (await response.json()) as ExternalMatchResponse;
  const label = SOURCE_CATEGORIES.find((item) => item.key === category)?.label ?? category;
  return {
    category,
    label,
    payload,
    matches: (payload.data?.match_list ?? []).map((match) => ({
      ...match,
      home_team_name: normalizeTeamName(match.home_team_name),
      away_team_name: normalizeTeamName(match.away_team_name),
      sourceCategory: category,
      sourceLabel: label
    })),
    dates: payload.data?.date_list ?? [],
    source: url.toString()
  };
}

type TheSportsDbEvent = {
  idEvent?: string;
  strTimestamp?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strLeague?: string | null;
  intRound?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
};

type TheSportsDbResponse = {
  events?: TheSportsDbEvent[] | null;
};

type TheSportsDbLineupRow = {
  idEvent?: string;
  strPosition?: string | null;
  strHome?: string | null;
  strSubstitute?: string | null;
  intSquadNumber?: string | null;
  strPlayer?: string | null;
};

type TheSportsDbLineupResponse = {
  lineup?: TheSportsDbLineupRow[] | null;
};

function normalizeTeamName(team?: string | null) {
  const clean = team?.trim();
  if (!clean) return "未知球队";
  return TEAM_NAME_CN[clean] ?? EXTRA_TEAM_NAME_CN[canonicalNameKey(clean)] ?? clean;
}

function normalizedTeamKey(team: string) {
  return canonicalNameKey(normalizeTeamName(team))
    .replace(/国家队|足球队|队$/g, "")
    .replace(/共和国/g, "");
}

function normalizeLeagueName(league?: string | null) {
  if (!league) return "未知赛事";
  if (league === "FIFA World Cup") return "世界杯";
  return league;
}

function sportsDbStatus(event: TheSportsDbEvent) {
  if (event.strStatus === "FT" || (event.intHomeScore !== null && event.intHomeScore !== undefined)) return "完场";
  return "未开赛";
}

function sportsDbStartTime(event: TheSportsDbEvent) {
  if (event.strTimestamp) {
    const utcDate = new Date(event.strTimestamp.endsWith("Z") ? event.strTimestamp : `${event.strTimestamp}Z`);
    if (!Number.isNaN(utcDate.getTime())) return formatShanghaiDateTime(utcDate);
  }
  return `${event.dateEvent ?? shanghaiToday()} ${event.strTime ?? "00:00:00"}`.slice(0, 19);
}

async function requestTheSportsDbMatches(date: string) {
  const url = new URL(THE_SPORTS_DB_URL);
  url.searchParams.set("d", date);
  url.searchParams.set("s", "Soccer");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`TheSportsDB 数据源响应异常：${response.status}`);
  }

  const payload = (await response.json()) as TheSportsDbResponse;
  const matches = (payload.events ?? []).map((event) => {
    const homeScore = event.intHomeScore === null || event.intHomeScore === undefined ? null : Number(event.intHomeScore);
    const awayScore = event.intAwayScore === null || event.intAwayScore === undefined ? null : Number(event.intAwayScore);

    return {
      id: 900_000_000 + Number(event.idEvent ?? 0),
      match_turn_str: event.intRound ? `R${event.intRound}` : "TDB",
      league_name: normalizeLeagueName(event.strLeague),
      match_date: event.dateEvent ?? date,
      start_time: sportsDbStartTime(event),
      home_team_name: normalizeTeamName(event.strHomeTeam),
      away_team_name: normalizeTeamName(event.strAwayTeam),
      home_score: Number.isFinite(homeScore) ? homeScore : null,
      away_score: Number.isFinite(awayScore) ? awayScore : null,
      half_home_score: null,
      half_away_score: null,
      home_red: 0,
      home_yellow: 0,
      away_red: 0,
      away_yellow: 0,
      match_status: sportsDbStatus(event),
      status_str: sportsDbStatus(event),
      live_minutes: "",
      has_tips: false,
      tips_count: 0,
      result_desc: homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : "",
      sourceCategory: "thesportsdb",
      sourceLabel: "全球赛程",
      externalEventId: event.idEvent
    } satisfies ExternalMatch;
  });

  return {
    category: "thesportsdb",
    label: "全球赛程",
    payload,
    matches,
    dates: [date],
    source: url.toString()
  };
}

async function requestTheSportsDbLineup(eventId: string) {
  const url = new URL("https://www.thesportsdb.com/api/v1/json/123/lookuplineup.php");
  url.searchParams.set("id", eventId);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "Football Edge Tracker/1.0"
    }
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as TheSportsDbLineupResponse;
  const rows = payload.lineup ?? [];
  if (!rows.length) return null;

  const toPlayer = (row: TheSportsDbLineupRow) => ({
    name: row.strPlayer ?? "",
    position: row.strPosition ?? undefined,
    squadNumber: row.intSquadNumber ?? undefined,
    substitute: row.strSubstitute === "Yes"
  });

  return {
    eventId,
    homeLineup: rows.filter((row) => row.strHome === "Yes").map(toPlayer).filter((item) => item.name),
    awayLineup: rows.filter((row) => row.strHome !== "Yes").map(toPlayer).filter((item) => item.name),
    provider: "TheSportsDB v1 lineup",
    updatedAt: new Date().toISOString()
  };
}

async function fetchTheSportsDbLineupDataset(matches: ExternalMatch[]) {
  const candidates = matches
    .filter((match) => match.externalEventId && match.match_status === "未开赛")
    .slice(0, 20);
  const results = await Promise.allSettled(candidates.map((match) => requestTheSportsDbLineup(match.externalEventId!)));
  return results.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []));
}

function matchByTeamsAndDate(match: ExternalMatch, candidates: ExternalMatch[]) {
  const home = normalizedTeamKey(match.home_team_name);
  const away = normalizedTeamKey(match.away_team_name);
  const date = normalizeDate(match.start_time);
  return candidates.find(
    (candidate) =>
      normalizedTeamKey(candidate.home_team_name) === home &&
      normalizedTeamKey(candidate.away_team_name) === away &&
      normalizeDate(candidate.start_time) === date
  );
}

function lineupFromSnapshot(snapshot: LineupSnapshot) {
  return {
    homeLineup: snapshot.homePlayers.map((name) => ({ name })),
    awayLineup: snapshot.awayPlayers.map((name) => ({ name })),
    lineupProvider: snapshot.sourceName,
    lineupUpdatedAt: snapshot.capturedAt,
    lineupNotes: snapshot.notes,
    marketConsensus: snapshot.marketConsensus
  };
}

function enrichMatchesWithLineups(
  matches: ExternalMatch[],
  sportsDbMatches: ExternalMatch[],
  sportsDbLineups: Awaited<ReturnType<typeof fetchTheSportsDbLineupDataset>>,
  manualSnapshots: LineupSnapshot[]
) {
  const lineupByEvent = new Map(sportsDbLineups.map((lineup) => [lineup.eventId, lineup]));
  return matches.map((match) => {
    const manual = findLineupSnapshot(manualSnapshots, match);
    if (manual) {
      return {
        ...match,
        ...lineupFromSnapshot(manual)
      };
    }

    const sportsMatch = match.externalEventId ? match : matchByTeamsAndDate(match, sportsDbMatches);
    const lineup = sportsMatch?.externalEventId ? lineupByEvent.get(sportsMatch.externalEventId) : undefined;
    if (!lineup) return match;

    return {
      ...match,
      homeLineup: lineup.homeLineup,
      awayLineup: lineup.awayLineup,
      lineupProvider: lineup.provider,
      lineupUpdatedAt: lineup.updatedAt,
      lineupNotes: "TheSportsDB 返回首发/替补阵容，临场仍建议人工核对。"
    };
  });
}

export async function fetchExternalMatches(category = "jczq") {
  return requestExternalMatches(category, "now");
}

async function buildExternalMatchDataset(): Promise<ExternalMatchDataset> {
  const currentResults = await Promise.allSettled(
    SOURCE_CATEGORIES.filter((source) => ["jczq", "bjdc"].includes(source.key)).map((source) =>
      requestExternalMatches(source.key, "now")
    )
  );
  const currentSources = currentResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const historyRequests = currentSources.flatMap((source) =>
    (source.dates ?? [])
      .filter((date) => date < shanghaiToday())
      .slice(0, 7)
      .map((date) => requestExternalMatches(source.category, "history", date))
  );
  const historyResults = await Promise.allSettled(historyRequests);
  const today = shanghaiToday();
  const tomorrowText = addDateDays(today, 1);
  const sportsDbResults = await Promise.allSettled([requestTheSportsDbMatches(today), requestTheSportsDbMatches(tomorrowText)]);
  const sportsDbSources = sportsDbResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const sportsDbMatches = sportsDbSources.flatMap((source) => source.matches);
  const [sportsDbLineups, manualLineups] = await Promise.all([
    fetchTheSportsDbLineupDataset(sportsDbMatches),
    readLineupSnapshots()
  ]);
  const marketResult = await Promise.allSettled([fetchAlexMarketDataset(today)]);
  const marketData =
    marketResult[0]?.status === "fulfilled"
      ? marketResult[0].value
      : { jcMatches: [], bdDiffMatches: [], bonusMatches: [], sourceStats: [] };
  const currentMatches = currentSources.flatMap((source) => source.matches);
  const historyMatches = historyResults.flatMap((result) => (result.status === "fulfilled" ? result.value.matches : []));
  const dates = Array.from(new Set([...currentSources.flatMap((source) => source.dates), ...sportsDbSources.flatMap((source) => source.dates)]))
    .sort()
    .reverse();
  const sourceStats = SOURCE_CATEGORIES.map((source) => {
    const matched = [...currentSources, ...sportsDbSources].find((item) => item.category === source.key);
    const marketMatched = marketData.sourceStats.find((item) => item.key === source.key);
    if (source.key === "lineup-cache") {
      return {
        key: source.key,
        label: source.label,
        provider: source.provider,
        description: source.description,
        connected: sportsDbLineups.length > 0 || manualLineups.length > 0,
        count: sportsDbLineups.length + manualLineups.length
      };
    }
    return {
      key: source.key,
      label: source.label,
      provider: source.provider,
      description: source.description,
      connected: marketMatched ? marketMatched.connected : Boolean(matched),
      count: marketMatched ? marketMatched.count : (matched?.matches.length ?? 0)
    };
  });
  const mergedMatches = dedupeMatches([...historyMatches, ...currentMatches, ...sportsDbMatches]);
  const enrichedMatches = enrichMatchesWithMarket(mergedMatches, marketData);
  const matchesWithLineups = enrichMatchesWithLineups(enrichedMatches, sportsDbMatches, sportsDbLineups, manualLineups);

  return {
    source: "进球之星公开比分接口 + 进球之星盘口差异接口 + TheSportsDB 免费公开赛程/阵容接口 + 本地临场快照",
    dates,
    sourceStats,
    matches: matchesWithLineups
  };
}

export async function fetchExternalMatchDataset({ forceRefresh = false }: { forceRefresh?: boolean } = {}) {
  const now = Date.now();
  if (!forceRefresh && datasetCache && datasetCache.expiresAt > now) {
    return datasetCache.value;
  }

  const value = await buildExternalMatchDataset();
  datasetCache = {
    expiresAt: now + DATASET_CACHE_MS,
    value
  };
  return value;
}
