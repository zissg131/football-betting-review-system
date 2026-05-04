# Football Betting Review System

一个可以直接在浏览器打开的足球投注复盘分析系统。

它的目标不是制造“稳赚预测”，而是把每一笔下注拆成可记录、可评分、可统计、可改进的决策。

## 当前版本

v0.1：静态网页复盘模型。

功能包括：

- 单笔投注录入；
- CSV 批量导入；
- CSV 导出备份；
- 自动计算 ROI；
- 自动计算命中率；
- 自动计算平均赔率；
- 自动计算最大单笔亏损；
- 自动计算最大回撤；
- 自动计算冲动下注比例；
- 自动计算单笔决策质量分；
- 自动生成残酷诊断；
- 绘制资金曲线。

## 在线使用

启用 GitHub Pages 后，可以通过下面的网址打开：

```text
https://zissg131.github.io/football-betting-review-system/
```

如果还打不开，去仓库 `Settings -> Pages` 设置：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/docs`

保存后等 1-3 分钟。

## 本地使用

下载仓库后，直接打开：

```text
docs/index.html
```

不需要安装 Python，不需要服务器。

## 文件结构

```text
football-betting-review-system/
├── README.md
├── docs/
│   ├── index.html       # 网页入口
│   ├── styles.css       # 页面样式
│   ├── app.js           # 分析模型与交互逻辑
│   ├── usage.md         # 使用说明
│   └── model_spec.md    # 模型评分规则
├── templates/
│   └── bet_log_template.csv
├── examples/
│   └── sample_bets.csv
└── .gitignore
```

## 数据字段

CSV 必须包含：

```text
date,league,match,market,pick,odds,stake,bankroll_before,result,profit_loss,pre_match_reason,information_quality,market_logic,discipline_flags
```

## 现实判断

现在没有足够历史数据，所以不能直接做真正的赛果预测模型。硬做预测模型就是自欺：没有样本、没有赔率校准、没有回测，就没有模型可信度。

当前版本先做复盘评分模型。

等你累计 300-500 条有效投注记录后，再升级为真正的预测/筛选模型。

## 纪律原则

1. 不记录输单，只记录赢单，模型会变成垃圾。
2. 不写下注理由，事后复盘没有意义。
3. 单笔仓位超过本金 3%，默认视为高风险。
4. 连续亏损后加注，直接判定为重大纪律问题。
5. 先做复盘，再谈预测。
