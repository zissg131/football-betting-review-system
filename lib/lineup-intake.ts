import { promises as fs } from "fs";
import path from "path";
import { parseLeisuThreeInOneText, type MarketConsensus } from "@/lib/market-consensus";

export type LineupSnapshot = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sourceUrl: string;
  sourceName: string;
  phase: string;
  capturedAt: string;
  homePlayers: string[];
  awayPlayers: string[];
  rawTextExcerpt: string;
  confidence: number;
  notes: string;
  marketConsensus?: MarketConsensus;
};

export type LineupWatchSource = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sourceUrl: string;
  sourceName: string;
  enabled: boolean;
  registeredAt: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastMessage?: string;
};

const SNAPSHOT_PATH = path.join(process.cwd(), "data", "lineup_snapshots.json");
const WATCH_PATH = path.join(process.cwd(), "data", "lineup_watch_sources.json");

function normalizedTeam(team: string) {
  return team
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）\-_]/g, "");
}

function splitPlayers(value: string) {
  return value
    .replace(/\(.*?\)|（.*?）/g, "")
    .split(/[、,，;；|/]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 18);
}

function findTeamLine(text: string, team: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalized = normalizedTeam(team);
  return lines.find((line) => normalizedTeam(line).includes(normalized) && /[:：]/.test(line));
}

function summarizeLeisuText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join(" ");
  const weather = joined.match(/天气[:：]\s*([^温]+)\s*温度[:：]\s*([^\s]+)\s*风速\s*([^\s]+)\s*气压[:：]\s*([^\s]+)\s*湿度[:：]\s*([^\s]+)/);
  const possessionIndex = lines.findIndex((line) => line.includes("控球率"));
  const attackIndex = lines.findIndex((line) => line === "进攻");
  const dangerIndex = lines.findIndex((line) => line === "危险进攻");
  const shotIndex = lines.findIndex((line) => line.includes("射门"));
  const groupLine = lines.find((line) => /世界杯.*组/.test(line));
  const kickoffLine = lines.find((line) => /开赛/.test(line) && /\d{4}\/\d{2}\/\d{2}/.test(line));
  const notes: string[] = [];

  if (kickoffLine) notes.push(`开赛信息：${kickoffLine}`);
  if (weather) notes.push(`天气：${weather[1].trim()}，${weather[2]}，风速${weather[3]}，气压${weather[4]}，湿度${weather[5]}`);
  else if (joined.includes("天气")) notes.push("已读取天气模块");
  if (groupLine) notes.push(`赛事：${groupLine}`);
  if (possessionIndex > 0) notes.push(`控球率：${lines[possessionIndex - 1]}-${lines[possessionIndex + 1] ?? ""}`);
  if (attackIndex > 0) notes.push(`进攻：${lines[attackIndex - 1]}-${lines[attackIndex + 1] ?? ""}`);
  if (dangerIndex > 0) notes.push(`危险进攻：${lines[dangerIndex - 1]}-${lines[dangerIndex + 1] ?? ""}`);
  if (shotIndex > 0) notes.push(`射门：${lines[shotIndex - 1]}-${lines[shotIndex + 1] ?? ""}`);

  return notes.length ? `雷速页面已读取：${notes.slice(0, 6).join("；")}` : "";
}

export function parseLineupText(text: string, homeTeam: string, awayTeam: string) {
  const compact = text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const homeLine = findTeamLine(compact, homeTeam);
  const awayLine = findTeamLine(compact, awayTeam);
  const homePlayers = homeLine ? splitPlayers(homeLine.split(/[:：]/).slice(1).join(":")) : [];
  const awayPlayers = awayLine ? splitPlayers(awayLine.split(/[:：]/).slice(1).join(":")) : [];
  const confidence = Math.round(((homePlayers.length >= 9 ? 45 : homePlayers.length * 4) + (awayPlayers.length >= 9 ? 45 : awayPlayers.length * 4)) / 0.9);
  const leisuNotes = summarizeLeisuText(compact);
  const marketConsensus = parseLeisuThreeInOneText(compact);
  const notes =
    homePlayers.length >= 9 && awayPlayers.length >= 9
      ? "已识别双方首发名单"
      : homePlayers.length || awayPlayers.length
        ? "已识别部分首发，建议补齐后再作为临场依据"
        : marketConsensus
          ? `已读取${marketConsensus.sourceName}：${marketConsensus.asianSummary}；${marketConsensus.moneylineSummary}；${marketConsensus.totalGoalsSummary}`
        : leisuNotes
          ? `${leisuNotes}；未在当前页面识别到首发名单`
        : "已保存网页快照，但未自动识别首发名单，可把 GPT 整理后的名单粘贴为“球队：球员1、球员2...”格式";

  return {
    homePlayers,
    awayPlayers,
    confidence: Math.min(100, Math.max(0, confidence)),
    notes,
    rawTextExcerpt: compact.slice(0, 1800),
    marketConsensus: marketConsensus ?? undefined
  };
}

async function ensureSnapshotFile() {
  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  try {
    await fs.access(SNAPSHOT_PATH);
  } catch {
    await fs.writeFile(SNAPSHOT_PATH, "[]", "utf8");
  }
}

async function ensureWatchFile() {
  await fs.mkdir(path.dirname(WATCH_PATH), { recursive: true });
  try {
    await fs.access(WATCH_PATH);
  } catch {
    await fs.writeFile(WATCH_PATH, "[]", "utf8");
  }
}

export async function readLineupSnapshots(): Promise<LineupSnapshot[]> {
  await ensureSnapshotFile();
  const raw = await fs.readFile(SNAPSHOT_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function readLineupWatchSources(): Promise<LineupWatchSource[]> {
  await ensureWatchFile();
  const raw = await fs.readFile(WATCH_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLineupWatchSources(sources: LineupWatchSource[]) {
  await ensureWatchFile();
  await fs.writeFile(WATCH_PATH, JSON.stringify(sources, null, 2), "utf8");
}

export function findLineupSnapshot(
  snapshots: LineupSnapshot[],
  match: { home_team_name: string; away_team_name: string; start_time: string }
) {
  const home = normalizedTeam(match.home_team_name);
  const away = normalizedTeam(match.away_team_name);
  return snapshots
    .filter((snapshot) => normalizedTeam(snapshot.homeTeam) === home && normalizedTeam(snapshot.awayTeam) === away)
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
}

async function fetchPageText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
      "user-agent": "Football Edge Tracker/1.0"
    }
  });
  if (!response.ok) throw new Error(`网页读取失败：${response.status}`);
  const html = await response.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function registerLineupWatchSource(input: { homeTeam: string; awayTeam: string; sourceUrl: string; message?: string }) {
  if (!input.sourceUrl.trim()) return null;
  const sources = await readLineupWatchSources();
  const home = normalizedTeam(input.homeTeam);
  const away = normalizedTeam(input.awayTeam);
  const sourceName = new URL(input.sourceUrl).hostname;
  const current = sources.find((item) => normalizedTeam(item.homeTeam) === home && normalizedTeam(item.awayTeam) === away);
  const nextSource: LineupWatchSource = {
    id: current?.id ?? `${Date.now()}-${home}-${away}`,
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    sourceUrl: input.sourceUrl.trim(),
    sourceName,
    enabled: true,
    registeredAt: current?.registeredAt ?? new Date().toISOString(),
    lastAttemptAt: current?.lastAttemptAt,
    lastSuccessAt: current?.lastSuccessAt,
    lastMessage: input.message ?? current?.lastMessage
  };
  await writeLineupWatchSources([nextSource, ...sources.filter((item) => item.id !== nextSource.id)].slice(0, 80));
  return nextSource;
}

export async function captureLineupSnapshot(input: {
  homeTeam: string;
  awayTeam: string;
  sourceUrl?: string;
  rawText?: string;
  phase?: string;
}) {
  const sourceUrl = input.sourceUrl?.trim() ?? "";
  const fetchedText = input.rawText?.trim() || (sourceUrl ? await fetchPageText(sourceUrl) : "");
  if (!input.homeTeam || !input.awayTeam) throw new Error("请填写主队和客队");
  if (!fetchedText) throw new Error("请提供网页 URL 或粘贴首发文字");

  const parsed = parseLineupText(fetchedText, input.homeTeam, input.awayTeam);
  const snapshot: LineupSnapshot = {
    id: `${Date.now()}-${normalizedTeam(input.homeTeam)}-${normalizedTeam(input.awayTeam)}`,
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    sourceUrl,
    sourceName: sourceUrl ? new URL(sourceUrl).hostname : "手动粘贴",
    phase: input.phase || "lineup",
    capturedAt: new Date().toISOString(),
    homePlayers: parsed.homePlayers,
    awayPlayers: parsed.awayPlayers,
    rawTextExcerpt: parsed.rawTextExcerpt,
    confidence: parsed.confidence,
    notes: parsed.notes,
    marketConsensus: parsed.marketConsensus
  };

  const snapshots = await readLineupSnapshots();
  const next = [
    snapshot,
    ...snapshots.filter(
      (item) => !(normalizedTeam(item.homeTeam) === normalizedTeam(snapshot.homeTeam) && normalizedTeam(item.awayTeam) === normalizedTeam(snapshot.awayTeam))
    )
  ].slice(0, 80);
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(next, null, 2), "utf8");
  if (sourceUrl) {
    await registerLineupWatchSource({
      homeTeam: snapshot.homeTeam,
      awayTeam: snapshot.awayTeam,
      sourceUrl,
      message: snapshot.notes
    });
  }
  return snapshot;
}

function matchWatchSource(
  match: { home_team_name: string; away_team_name: string },
  sources: LineupWatchSource[]
) {
  const home = normalizedTeam(match.home_team_name);
  const away = normalizedTeam(match.away_team_name);
  return sources.find((source) => source.enabled && normalizedTeam(source.homeTeam) === home && normalizedTeam(source.awayTeam) === away);
}

function minutesUntil(startTime: string, now: Date) {
  return (new Date(startTime.replace(" ", "T")).getTime() - now.getTime()) / 60000;
}

export async function autoCaptureDueLineups(
  matches: Array<{ home_team_name: string; away_team_name: string; start_time: string; match_status: string }>,
  now = new Date()
) {
  const sources = await readLineupWatchSources();
  const nextSources = [...sources];
  const results: Array<{ homeTeam: string; awayTeam: string; status: string; message: string }> = [];

  for (const match of matches) {
    if (match.match_status !== "未开赛") continue;
    const minutes = minutesUntil(match.start_time, now);
    if (minutes > 18 || minutes < -2) continue;
    const source = matchWatchSource(match, nextSources);
    if (!source) {
      results.push({
        homeTeam: match.home_team_name,
        awayTeam: match.away_team_name,
        status: "skipped",
        message: "没有登记自动采集 URL"
      });
      continue;
    }
    if (source.lastSuccessAt) {
      const successTime = new Date(source.lastSuccessAt).getTime();
      const kickoffTime = new Date(match.start_time.replace(" ", "T")).getTime();
      if (successTime >= kickoffTime - 20 * 60000) {
        results.push({
          homeTeam: match.home_team_name,
          awayTeam: match.away_team_name,
          status: "skipped",
          message: "赛前15分钟窗口已成功采集过"
        });
        continue;
      }
    }

    source.lastAttemptAt = now.toISOString();
    try {
      const snapshot = await captureLineupSnapshot({
        homeTeam: source.homeTeam,
        awayTeam: source.awayTeam,
        sourceUrl: source.sourceUrl,
        phase: "lineup"
      });
      source.lastSuccessAt = snapshot.capturedAt;
      source.lastMessage = snapshot.notes;
      results.push({
        homeTeam: source.homeTeam,
        awayTeam: source.awayTeam,
        status: "captured",
        message: snapshot.notes
      });
    } catch (error) {
      source.lastMessage = error instanceof Error ? error.message : "自动采集失败";
      results.push({
        homeTeam: source.homeTeam,
        awayTeam: source.awayTeam,
        status: "failed",
        message: source.lastMessage
      });
    }
  }

  await writeLineupWatchSources(nextSources);
  return {
    attempted: results.filter((item) => item.status === "captured" || item.status === "failed").length,
    captured: results.filter((item) => item.status === "captured").length,
    results
  };
}
