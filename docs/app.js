const STORAGE_KEY = "football_betting_review_records_v1";

const sampleBets = [
  {date:"2026-05-01",league:"英超",match:"Arsenal vs Liverpool",market:"胜平负",pick:"主胜",odds:2.05,stake:100,bankroll_before:10000,result:"win",profit_loss:105,pre_match_reason:"主队阵容完整，客队连续一周双赛存在体能劣势，盘口从平半升到半球，赔率位置合理。",information_quality:4,market_logic:4,discipline_flags:"正常"},
  {date:"2026-05-02",league:"德甲",match:"Dortmund vs Leverkusen",market:"半全场",pick:"平负",odds:5.8,stake:300,bankroll_before:10105,result:"loss",profit_loss:-300,pre_match_reason:"觉得会爆冷，临场想搏高赔。",information_quality:1,market_logic:1,discipline_flags:"冲动, 追回"}
];

let records = loadRecords();

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatMoney(value) {
  const n = toNumber(value);
  return `${n >= 0 ? "+" : "-"}¥${Math.abs(n).toFixed(2)}`;
}

function formatPercent(value) {
  return `${(toNumber(value) * 100).toFixed(2)}%`;
}

function impliedProbability(odds) {
  odds = toNumber(odds);
  return odds > 0 ? 1 / odds : 0;
}

function stakeRatio(record) {
  const bankroll = toNumber(record.bankroll_before);
  return bankroll > 0 ? toNumber(record.stake) / bankroll : 0;
}

function isWin(record) {
  return ["win", "赢", "中"].includes(String(record.result || "").toLowerCase());
}

function scoreReasonQuality(reason) {
  const text = String(reason || "").trim();
  if (!text) return 0;
  let score = 1;
  const keywords = ["伤停","轮换","赛程","战意","盘口","赔率","阵容","主客","体能","injury","lineup","schedule","motivation","odds","market","rotation"];
  const lower = text.toLowerCase();
  const matched = keywords.filter(k => lower.includes(k.toLowerCase())).length;
  if (text.length >= 20) score += 1;
  if (text.length >= 50) score += 1;
  if (matched >= 1) score += 1;
  if (matched >= 3) score += 1;
  return Math.min(score, 5);
}

function scoreStakeDiscipline(record) {
  const ratio = stakeRatio(record);
  const flags = String(record.discipline_flags || "").toLowerCase();
  let score = 5;
  if (ratio > 0.01) score -= 1;
  if (ratio > 0.02) score -= 1;
  if (ratio > 0.03) score -= 1;
  if (ratio > 0.05) score -= 1;
  const badFlags = ["冲动","上头","追回","翻本","emotion","chase","tilt","revenge"];
  if (badFlags.some(f => flags.includes(f))) score -= 2;
  return Math.max(score, 0);
}

function scoreSingleBet(record) {
  const reasonScore = scoreReasonQuality(record.pre_match_reason);
  const informationQuality = clamp(toNumber(record.information_quality), 0, 5);
  const marketLogic = clamp(toNumber(record.market_logic), 0, 5);
  const stakeDiscipline = scoreStakeDiscipline(record);
  const decisionScore = ((reasonScore + informationQuality + marketLogic + stakeDiscipline) / 20) * 100;
  let grade = "F";
  if (decisionScore >= 85) grade = "A";
  else if (decisionScore >= 70) grade = "B";
  else if (decisionScore >= 55) grade = "C";
  else if (decisionScore >= 40) grade = "D";
  return {reasonScore, informationQuality, marketLogic, stakeDiscipline, decisionScore: round(decisionScore, 2), grade, impliedProbability: impliedProbability(record.odds), stakeRatio: stakeRatio(record)};
}

function calculateMaxDrawdown(profits) {
  let equity = 0, peak = 0, maxDrawdown = 0;
  for (const p of profits) {
    equity += p;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }
  return maxDrawdown;
}

function summarize() {
  if (!records.length) return {totalBets:0,totalStake:0,totalProfit:0,roi:0,winRate:0,averageOdds:0,maxSingleLoss:0,maxDrawdown:0,impulseRatio:0,averageDecisionScore:0};
  const totalStake = records.reduce((s, r) => s + toNumber(r.stake), 0);
  const totalProfit = records.reduce((s, r) => s + toNumber(r.profit_loss), 0);
  const wins = records.filter(isWin).length;
  const averageOdds = records.reduce((s, r) => s + toNumber(r.odds), 0) / records.length;
  const scores = records.map(scoreSingleBet);
  const averageDecisionScore = scores.reduce((s, x) => s + x.decisionScore, 0) / scores.length;
  const impulseCount = records.filter(r => /冲动|上头|追回|翻本|emotion|chase|tilt|revenge/i.test(String(r.discipline_flags || ""))).length;
  return {
    totalBets: records.length,
    totalStake,
    totalProfit,
    roi: totalStake ? totalProfit / totalStake : 0,
    winRate: wins / records.length,
    averageOdds,
    maxSingleLoss: Math.min(...records.map(r => toNumber(r.profit_loss))),
    maxDrawdown: calculateMaxDrawdown(records.map(r => toNumber(r.profit_loss))),
    impulseRatio: impulseCount / records.length,
    averageDecisionScore
  };
}

function render() {
  saveRecords();
  renderSummary();
  renderDiagnosis();
  renderTable();
  drawEquityChart();
}

function renderSummary() {
  const s = summarize();
  const metrics = [
    ["总笔数", s.totalBets],
    ["总投入", `¥${s.totalStake.toFixed(2)}`],
    ["总盈亏", formatMoney(s.totalProfit)],
    ["ROI", formatPercent(s.roi)],
    ["命中率", formatPercent(s.winRate)],
    ["平均赔率", s.averageOdds.toFixed(2)],
    ["最大单笔亏损", formatMoney(s.maxSingleLoss)],
    ["最大回撤", `¥${s.maxDrawdown.toFixed(2)}`],
    ["冲动下注比例", formatPercent(s.impulseRatio)],
    ["平均决策分", s.averageDecisionScore.toFixed(2)]
  ];
  document.getElementById("summary").innerHTML = metrics.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderDiagnosis() {
  const s = summarize();
  const messages = [];
  if (!records.length) {
    messages.push("先录入数据。没有数据时谈模型，就是空想。");
  } else {
    if (s.impulseRatio > 0.15) messages.push("冲动下注比例过高。你不是在投资，是在用情绪给平台送钱。");
    if (s.averageDecisionScore < 60) messages.push("平均决策质量低于 60。当前最大问题不是预测能力，而是下注前没有足够证据链。");
    if (s.roi < 0) messages.push("ROI 为负。先降低单笔仓位，不要急着加码。");
    if (s.maxDrawdown > s.totalStake * 0.3) messages.push("回撤过大。本金管理已经失控，需要降低下注频率和单笔金额。");
    if (s.averageDecisionScore >= 75 && s.roi > 0) messages.push("样本表现不错，但不要过早自信。至少 300 笔后再判断模型是否有效。");
    if (!messages.length) messages.push("暂无明显灾难性问题。继续积累样本，重点看 50 笔以上趋势，不要被单场输赢牵着走。");
  }
  document.getElementById("diagnosis").innerHTML = messages.map(m => `<p>${m}</p>`).join("");
}

function renderTable() {
  const tbody = document.querySelector("#betTable tbody");
  tbody.innerHTML = records.map((r, index) => {
    const score = scoreSingleBet(r);
    const pl = toNumber(r.profit_loss);
    return `<tr>
      <td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.match)}</td><td>${escapeHtml(r.market)}</td><td>${escapeHtml(r.pick)}</td>
      <td>${toNumber(r.odds).toFixed(2)}</td><td>¥${toNumber(r.stake).toFixed(2)}</td>
      <td class="${pl >= 0 ? "profit" : "loss"}">${formatMoney(pl)}</td><td>${formatPercent(score.stakeRatio)}</td>
      <td>${score.decisionScore}</td><td class="grade-${score.grade.toLowerCase()}">${score.grade}</td>
      <td><button class="small-btn danger" onclick="deleteRecord(${index})">删除</button></td>
    </tr>`;
  }).join("");
}

function drawEquityChart() {
  const canvas = document.getElementById("equityChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 800;
  const cssHeight = 220;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const padding = 28;
  const equity = [0];
  for (const r of records) equity.push(equity[equity.length - 1] + toNumber(r.profit_loss));
  const minY = Math.min(...equity, 0);
  const maxY = Math.max(...equity, 0);
  const range = maxY - minY || 1;
  const zeroY = cssHeight - padding - ((0 - minY) / range) * (cssHeight - padding * 2);

  ctx.strokeStyle = "rgba(156,168,199,.4)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padding, zeroY); ctx.lineTo(cssWidth - padding, zeroY); ctx.stroke();

  if (equity.length < 2) {
    ctx.fillStyle = "#9ca8c7";
    ctx.fillText("暂无资金曲线数据", padding, padding);
    return;
  }

  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 3;
  ctx.beginPath();
  equity.forEach((value, i) => {
    const x = padding + (i / (equity.length - 1)) * (cssWidth - padding * 2);
    const y = cssHeight - padding - ((value - minY) / range) * (cssHeight - padding * 2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#9ca8c7";
  ctx.fillText(`最高: ¥${maxY.toFixed(2)}`, padding, 18);
  ctx.fillText(`最低: ¥${minY.toFixed(2)}`, padding, cssHeight - 8);
}

function deleteRecord(index) { records.splice(index, 1); render(); }
function saveRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function loadRecords() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;","\"":"&quot;"}[c])); }

function recordFromForm(form) {
  const data = new FormData(form);
  return {
    date:data.get("date"), league:data.get("league"), match:data.get("match"), market:data.get("market"), pick:data.get("pick"),
    odds:toNumber(data.get("odds")), stake:toNumber(data.get("stake")), bankroll_before:toNumber(data.get("bankroll_before")),
    result:data.get("result"), profit_loss:toNumber(data.get("profit_loss")), pre_match_reason:data.get("pre_match_reason"),
    information_quality:toNumber(data.get("information_quality")), market_logic:toNumber(data.get("market_logic")), discipline_flags:data.get("discipline_flags")
  };
}

function splitCsvLine(line) {
  const result = []; let current = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
    else if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) { result.push(current); current = ""; }
    else current += char;
  }
  result.push(current);
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ""));
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    const row = {}; headers.forEach((h, i) => row[h] = cells[i] ?? "");
    return {date:row.date, league:row.league, match:row.match, market:row.market, pick:row.pick, odds:toNumber(row.odds), stake:toNumber(row.stake), bankroll_before:toNumber(row.bankroll_before), result:row.result, profit_loss:toNumber(row.profit_loss), pre_match_reason:row.pre_match_reason, information_quality:toNumber(row.information_quality), market_logic:toNumber(row.market_logic), discipline_flags:row.discipline_flags};
  });
}

function toCsv(rows) {
  const headers = ["date","league","match","market","pick","odds","stake","bankroll_before","result","profit_loss","pre_match_reason","information_quality","market_logic","discipline_flags"];
  const escape = value => { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
  return [headers.join(","), ...rows.map(row => headers.map(h => escape(row[h])).join(","))].join("\n");
}

function download(filename, content) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

document.getElementById("betForm").addEventListener("submit", event => { event.preventDefault(); records.push(recordFromForm(event.target)); event.target.reset(); render(); });
document.getElementById("loadSample").addEventListener("click", () => { records = [...sampleBets]; render(); });
document.getElementById("exportCsv").addEventListener("click", () => download("football_betting_records.csv", toCsv(records)));
document.getElementById("clearAll").addEventListener("click", () => { if (confirm("确定清空本地数据？这个操作无法恢复。")) { records = []; render(); } });
document.getElementById("csvFile").addEventListener("change", event => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { records = parseCsv(reader.result); render(); }; reader.readAsText(file, "utf-8"); });
window.addEventListener("resize", drawEquityChart);
render();
