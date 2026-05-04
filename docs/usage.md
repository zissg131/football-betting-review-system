# 使用说明

## 方式一：本地直接打开

下载仓库后，直接打开：

```text
docs/index.html
```

这个方式不需要服务器，浏览器就能运行。

## 方式二：用 GitHub Pages 在线打开

进入仓库：

```text
zissg131/football-betting-review-system
```

然后按下面操作：

1. 打开仓库页面；
2. 点击 `Settings`；
3. 左侧找到 `Pages`；
4. Source 选择 `Deploy from a branch`；
5. Branch 选择 `main`；
6. Folder 选择 `/docs`；
7. 点击 `Save`；
8. 等 1-3 分钟，GitHub 会生成一个网址。

正常网址会类似：

```text
https://zissg131.github.io/football-betting-review-system/
```

如果页面 404，通常不是代码问题，而是 GitHub Pages 还没部署完成，等几分钟刷新。

## 输入数据说明

### 单笔录入

网页上可以直接填：

- 日期
- 赛事
- 比赛
- 玩法
- 选择
- 赔率
- 下注金额
- 下注前本金
- 结果
- 盈亏
- 信息质量
- 盘口逻辑
- 赛前理由
- 纪律标签

### CSV 导入

CSV 必须包含以下列：

```text
date,league,match,market,pick,odds,stake,bankroll_before,result,profit_loss,pre_match_reason,information_quality,market_logic,discipline_flags
```

建议直接复制：

```text
templates/bet_log_template.csv
```

## 字段解释

| 字段 | 说明 |
|---|---|
| date | 日期 |
| league | 联赛 |
| match | 比赛 |
| market | 玩法，例如胜平负、让球、大小球、半全场 |
| pick | 下注选择 |
| odds | 赔率 |
| stake | 下注金额 |
| bankroll_before | 下注前本金 |
| result | win / loss / push |
| profit_loss | 盈亏，盈利填正数，亏损填负数 |
| pre_match_reason | 下注前理由 |
| information_quality | 信息质量 0-5 |
| market_logic | 盘口逻辑 0-5 |
| discipline_flags | 纪律标签，例如正常、冲动、追回、翻本 |

## 数据保存位置

当前网站把数据保存在浏览器 localStorage。

这意味着：

- 不会自动上传到服务器；
- 换电脑、换浏览器后看不到旧数据；
- 清除浏览器缓存可能丢失数据；
- 你应该定期点击“导出 CSV”备份。

## 现实提醒

这个系统不会帮你预测比分。

它真正做的是：

- 暴露你的下注纪律；
- 暴露你是否在情绪化下注；
- 暴露你哪类玩法长期亏钱；
- 让你停止凭感觉复盘。
