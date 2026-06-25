export const MARKET_LABELS: Record<string, string> = {
  moneyline: "胜平负",
  handicap: "让球胜平负",
  asian_handicap: "亚洲让球",
  over_under: "大小球",
  half_full_time: "半全场",
  correct_score: "比分",
  total_goals: "总进球",
  btts: "双方进球",
  player_goal: "球员进球",
  custom: "自定义"
};

export const RESULT_LABELS: Record<string, string> = {
  pending: "未结算",
  win: "赢",
  half_win: "赢半",
  push: "走水",
  half_loss: "输半",
  loss: "输"
};

export const STATUS_LABELS: Record<string, string> = {
  scheduled: "未开赛",
  live: "进行中",
  finished: "已完赛",
  settled: "已结算"
};

export const MARKET_OPTIONS = Object.entries(MARKET_LABELS);
export const RESULT_OPTIONS = Object.entries(RESULT_LABELS);
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS);
