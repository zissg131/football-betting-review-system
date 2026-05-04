# 足球数据读取方案

## 先说结论

当前项目不建议直接写网页爬虫抓第三方 App 或网站页面。

原因很直接：

1. 很多 App/网站有登录、签名、加密、反爬机制；
2. 这种爬虫不稳定，今天能用，明天就失效；
3. 把 API Key 或爬虫逻辑放在前端会泄露；
4. 违反平台规则的抓取方式不适合作为长期系统基础。

当前推荐方式：

```text
本地 Python 脚本 / 后端服务
        ↓
官方足球数据 API
        ↓
保存 JSON / CSV
        ↓
导入复盘网站或后续数据库
```

## 已添加脚本

```text
scripts/footystats_fetcher.py
```

这个脚本用于读取 FootyStats 官方 API，并保存：

```text
data/raw/*.json
data/processed/*.csv
```

## 使用前准备

安装 Python 3.10+。

然后设置 API Key：

```bash
export FOOTYSTATS_API_KEY="你的_api_key"
```

Windows PowerShell：

```powershell
$env:FOOTYSTATS_API_KEY="你的_api_key"
```

不要把 API Key 写进：

```text
docs/app.js
```

因为 GitHub Pages 前端代码是公开的，任何人都能看到。

## 读取某天比赛

```bash
python scripts/footystats_fetcher.py todays --date 2026-05-04 --timezone Asia/Shanghai
```

输出：

```text
data/raw/todays_matches_2026-05-04.json
data/processed/todays_matches_2026-05-04.csv
```

## 读取某个联赛赛季比赛

需要先知道 FootyStats 的 `season_id`。

```bash
python scripts/footystats_fetcher.py league-matches --season-id 2012 --max-pages 2
```

输出：

```text
data/raw/league_matches_season_2012_xxxxx.json
data/processed/league_matches_season_2012_xxxxx.csv
```

## 当前阶段不要做的事

不要急着做：

- 绕过登录抓雷速 App；
- 抓加密接口；
- 自动刷请求；
- 高频爬取盘口；
- 把 API Key 放进网页；
- 未回测就生成投注建议。

## 后续专业升级路线

### v0.2

- 导入官方 API 比赛数据；
- 自动匹配投注记录中的比赛；
- 增加联赛、球队、赔率字段。

### v0.3

- 增加盘口快照表；
- 记录初盘、即时盘、临场盘；
- 对比你的投注赔率和市场均值。

### v1.0

- 后端保存 API Key；
- 数据库保存投注记录；
- 自动计算泊松概率；
- 与市场赔率对比；
- 输出“价值差异”，但不直接给无脑投注结论。
