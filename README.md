# 足球锋线追踪器

足球锋线追踪器是一个本地运行的足球赛前预测、投注记录、自动结算和复盘 Web App。它使用 Next.js App Router、TypeScript、Tailwind CSS、shadcn 风格组件、Prisma、SQLite、Recharts，并支持 CSV / XLSX 导出。

## 功能范围

- 仪表盘：总下注、总盈亏、回报率、命中率、当前连红/连黑、最佳/最差玩法、近期曲线、玩法收益柱状图。
- 今日总览：接入进球之星公开比分接口，展示当日比赛和本地规则投注建议。
- 比赛管理：新增比赛，按赛事、日期、结算状态、有无下注、信心等级和球队搜索筛选。
- 比赛详情：赛前分析、多笔下注、输入比分后自动结算、手动修正结果、赛后复盘。
- 投注记录：所有投注表格，按玩法、赛事、球队、日期和输赢筛选，导出 CSV / XLSX。
- 复盘分析：按玩法、赛事、球队、信心等级、盘口统计下注次数、命中率、总盈亏和回报率，并生成一句复盘总结。

## 本地运行

```bash
npm install
copy .env.example .env
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

打开 `http://localhost:3000`。

## 常用命令

```bash
npm run dev
npm run build
npm run test
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 数据库

SQLite 数据库由 Prisma 管理，schema 在 `prisma/schema.prisma`。

主要模型：

- `Match`：比赛、预测、分析、比分、复盘。
- `Bet`：投注玩法、方向、盘口、赔率、本金、结果、盈亏、回报率、标签。

SQLite 不原生支持字符串数组，所以 `tags`、`mistakeTags`、`successTags` 在数据库中以 JSON 字符串保存，应用层按字符串数组解析。

## 结算口径

- 胜平负：按最终比分判断主胜、平、客胜。
- 亚洲让球：支持整数、半球和四分之一盘口，四分之一盘口按两半本金拆分。
- 大小球：支持整数、半球和四分之一盘口，四分之一盘口按两半本金拆分。
- 比分、半全场、球员进球、自定义：第一版支持手动选择赛果结果，保留自动扩展空间。

盈利公式：

- `win = 本金 * (赔率 - 1)`
- `half_win = 本金 * (赔率 - 1) / 2`
- `push = 0`
- `half_loss = -本金 / 2`
- `loss = -本金`
- `回报率 = 盈亏 / 本金`

## 项目结构

```text
app/
  api/export/bets/route.ts
  bet-log/page.tsx
  matches/page.tsx
  matches/new/page.tsx
  matches/[id]/page.tsx
  review/page.tsx
components/
  ui/
  app-shell.tsx
  charts.tsx
  metric-card.tsx
lib/
  actions.ts
  analytics.ts
  constants.ts
  export.ts
  prisma.ts
  settlement.ts
  utils.ts
prisma/
  schema.prisma
  seed.ts
tests/
  settlement.test.ts
```

## 导出

在投注记录页面点击 `导出 CSV` 或 `导出 XLSX`，会按当前筛选条件导出投注记录。

## 上传自动录入

投注记录页面支持上传 JSON、CSV、TSV、XLSX、Markdown 表格和 TXT。推荐让 GPT 整理成以下字段：

```text
赛事,开赛时间,主队,客队,投注时间,玩法,投注方向,盘口,赔率,本金,结果,标签,备注
```

玩法可以写中文，例如 `胜平负`、`亚洲让球`、`大小球`、`比分`。结果可以写 `赢`、`赢半`、`走水`、`输半`、`输`、`未结算`。
