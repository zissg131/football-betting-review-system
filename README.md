# Football Betting Review System

这是一个足球投注复盘与风控模型仓库。它的目标不是制造“稳赚预测”，而是把每一笔下注拆成可记录、可评分、可统计、可改进的决策。

## 现实判断

现在仓库没有历史数据，所以不能直接做真正的赛果预测模型。硬做预测模型就是自欺：没有样本、没有赔率校准、没有回测，就没有模型可信度。

当前版本先做 **v0.1 复盘评分模型**：

- 记录下注前判断
- 计算隐含概率与盈亏
- 评估仓位纪律
- 评估信息质量
- 评估盘口/赔率逻辑
- 输出单笔决策评分与整体复盘统计

等你累计 300-500 条有效投注记录后，才有资格升级为真正的预测/筛选模型。

## 文件结构

```text
football-betting-review-system/
├── README.md
├── src/
│   └── review_model.py
├── templates/
│   └── bet_log_template.csv
├── docs/
│   └── model_spec.md
├── examples/
│   └── sample_bets.csv
└── .gitignore
```

## 快速开始

下载仓库后运行：

```bash
python src/review_model.py examples/sample_bets.csv
```

也可以复制模板自己填写：

```bash
cp templates/bet_log_template.csv my_bets.csv
python src/review_model.py my_bets.csv
```

## 关键输出

模型会输出：

- 总下注笔数
- 总投入
- 总盈亏
- ROI
- 命中率
- 平均赔率
- 最大单笔亏损
- 冲动下注比例
- 平均决策质量分
- 每笔下注的评分等级

## 纪律原则

1. 不记录输单，只记录赢单，模型会变成垃圾。
2. 不写下注理由，事后复盘没有意义。
3. 单笔仓位超过本金 3%，默认视为高风险。
4. 连续亏损后加注，直接判定为重大纪律问题。
5. 先做复盘，再谈预测。
