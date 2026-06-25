import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { RESULT_LABELS, MARKET_LABELS } from "@/lib/constants";
import { settleManualResult, type BetResult, type MarketType } from "@/lib/settlement";
import { stringifyTags } from "@/lib/utils";

type ImportRow = Record<string, unknown>;

const MARKET_BY_LABEL = Object.fromEntries(Object.entries(MARKET_LABELS).map(([key, value]) => [value, key]));
const RESULT_BY_LABEL = Object.fromEntries(Object.entries(RESULT_LABELS).map(([key, value]) => [value, key]));

const FIELD_ALIASES = {
  competition: ["赛事", "联赛", "competition"],
  kickoffTime: ["开赛时间", "比赛时间", "kickoffTime", "kickoff_time"],
  match: ["比赛", "对阵", "match"],
  homeTeam: ["主队", "homeTeam", "home_team"],
  awayTeam: ["客队", "awayTeam", "away_team"],
  betTime: ["投注时间", "日期", "betTime", "bet_time"],
  marketType: ["玩法", "玩法类型", "marketType", "market_type"],
  selection: ["投注方向", "方向", "选择", "selection"],
  line: ["盘口", "line"],
  odds: ["赔率", "odds"],
  stake: ["本金", "金额", "下注金额", "stake"],
  result: ["结果", "结算结果", "输赢", "result"],
  score: ["比分", "赛果", "最终比分", "score"],
  tags: ["标签", "tags"],
  notes: ["备注", "notes"]
};

function readField(row: ImportRow, key: keyof typeof FIELD_ALIASES) {
  for (const alias of FIELD_ALIASES[key]) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string) {
  if (!value) return new Date();
  const normalized = value.replace(/\//g, "-");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseMatch(row: ImportRow) {
  let homeTeam = readField(row, "homeTeam");
  let awayTeam = readField(row, "awayTeam");
  const matchText = readField(row, "match");
  if ((!homeTeam || !awayTeam) && matchText) {
    const parts = matchText.split(/\s*(?:vs|VS|对|v)\s*/).filter(Boolean);
    if (parts.length >= 2) {
      homeTeam = parts[0].trim();
      awayTeam = parts.slice(1).join(" ").trim();
    }
  }
  return { homeTeam, awayTeam };
}

function parseScore(value: string) {
  if (!value) return {};
  const match = value.match(/(\d+)\s*[:：-]\s*(\d+)/);
  if (!match) return {};
  return {
    homeScore: Number(match[1]),
    awayScore: Number(match[2])
  };
}

function normalizeMarket(value: string): MarketType {
  const raw = value.trim();
  const mapped = MARKET_BY_LABEL[raw] ?? raw;
  const allowed = new Set(Object.keys(MARKET_LABELS));
  return (allowed.has(mapped) ? mapped : "custom") as MarketType;
}

function normalizeResult(value: string): BetResult {
  const raw = value.trim();
  const mapped = RESULT_BY_LABEL[raw] ?? raw;
  const allowed = new Set(Object.keys(RESULT_LABELS));
  return (allowed.has(mapped) ? mapped : "pending") as BetResult;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseDelimited(text: string, separator = ",") {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = separator === "," ? parseCsvLine(lines[0]) : lines[0].split(separator).map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const cells = separator === "," ? parseCsvLine(line) : line.split(separator).map((item) => item.trim());
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseMarkdownTable(text: string) {
  const tableLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));
  if (tableLines.length < 3) return [];
  const rows = tableLines.filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line));
  const split = (line: string) => line.slice(1, -1).split("|").map((cell) => cell.trim());
  const headers = split(rows[0]);
  return rows.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.search(/[\[{]/);
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start));
    return Array.isArray(parsed) ? parsed : parsed.bets ?? parsed.rows ?? null;
  } catch {
    return null;
  }
}

async function parseRows(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
  }

  const text = await file.text();
  const jsonRows = extractJson(text);
  if (jsonRows) return jsonRows as ImportRow[];
  const markdownRows = parseMarkdownTable(text);
  if (markdownRows.length) return markdownRows;
  if (name.endsWith(".tsv")) return parseDelimited(text, "\t");
  return parseDelimited(text, ",");
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "请上传文件" }, { status: 400 });
  }

  const rows = await parseRows(file);
  const errors: string[] = [];
  let imported = 0;

  for (const [index, row] of rows.entries()) {
    const { homeTeam, awayTeam } = parseMatch(row);
    const odds = parseNumber(readField(row, "odds"));
    const stake = parseNumber(readField(row, "stake"));
    const selection = readField(row, "selection");

    if (!homeTeam || !awayTeam || !odds || !stake || !selection) {
      errors.push(`第 ${index + 2} 行缺少主队、客队、方向、赔率或本金`);
      continue;
    }

    const competition = readField(row, "competition") || "未分类赛事";
    const kickoffTime = parseDate(readField(row, "kickoffTime") || readField(row, "betTime"));
    const betTime = parseDate(readField(row, "betTime"));
    const score = parseScore(readField(row, "score"));
    const result = normalizeResult(readField(row, "result"));
    const marketType = normalizeMarket(readField(row, "marketType"));
    const line = parseNumber(readField(row, "line"));
    const settlement = result === "pending" ? { result, profit: 0, roi: 0 } : settleManualResult(result, odds, stake);

    const match = await prisma.match.upsert({
      where: {
        id: `import-${competition}-${kickoffTime.toISOString()}-${homeTeam}-${awayTeam}`.replace(/\s+/g, "-")
      },
      update: {
        ...score,
        status: score.homeScore === undefined ? "scheduled" : "settled"
      },
      create: {
        id: `import-${competition}-${kickoffTime.toISOString()}-${homeTeam}-${awayTeam}`.replace(/\s+/g, "-"),
        competition,
        kickoffTime,
        homeTeam,
        awayTeam,
        ...score,
        status: score.homeScore === undefined ? "scheduled" : "settled"
      }
    });

    await prisma.bet.create({
      data: {
        matchId: match.id,
        betTime,
        marketType,
        selection,
        line,
        odds,
        stake,
        result: settlement.result,
        profit: settlement.profit,
        roi: settlement.roi,
        tags: stringifyTags(readField(row, "tags")),
        notes: readField(row, "notes")
      }
    });
    imported += 1;
  }

  return NextResponse.json({
    ok: true,
    imported,
    totalRows: rows.length,
    errors
  });
}
