import type { ExternalMatch } from "@/lib/external-matches";
import {
  buildTradingDecision,
  PRACTICAL_JUDGMENT_METHODS,
  teamStrength,
  type Tone
} from "@/lib/models/trading-decision";

export { PRACTICAL_JUDGMENT_METHODS, teamStrength };

export type JudgmentSignal = {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  signal: string;
  detail: string;
  tone: Tone;
};

export type MatchIntelligence = {
  score: number;
  confidence: number;
  direction: string;
  entryCondition: string;
  riskNote: string;
  reason: string;
  tags: string[];
  signals: JudgmentSignal[];
};

export function buildMatchIntelligence(match: ExternalMatch, matches: ExternalMatch[] = [], now = new Date()): MatchIntelligence {
  const decision = buildTradingDecision(match, matches, [], now);

  return {
    score: decision.modelScore,
    confidence: decision.confidence,
    direction: decision.direction,
    entryCondition: decision.entryCondition,
    riskNote: decision.riskNote,
    reason: decision.reason,
    tags: decision.tags.map((tag) => tag.label),
    signals: [
      {
        key: "win",
        label: "胜率分",
        score: decision.winScore,
        maxScore: 100,
        signal: `${decision.winScore}/100`,
        detail: "用于判断球队胜负方向的概率优势，不直接等同下注建议。",
        tone: decision.winScore >= 70 ? "positive" : decision.winScore >= 55 ? "neutral" : "negative"
      },
      {
        key: "value",
        label: "价值分",
        score: decision.valueScore,
        maxScore: 100,
        signal: `${decision.valueScore}/100`,
        detail: "用于判断当前赔率、让球和大小球是否仍有价格价值。",
        tone: decision.valueScore >= 68 ? "positive" : decision.valueScore >= 52 ? "neutral" : "negative"
      },
      {
        key: "execution",
        label: "执行分",
        score: decision.executionScore,
        maxScore: 100,
        signal: `${decision.executionScore}/100`,
        detail: `真实下注执行建议：${decision.actionTag}。`,
        tone: decision.actionTone
      }
    ]
  };
}
