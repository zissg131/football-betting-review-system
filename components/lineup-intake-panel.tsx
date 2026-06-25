"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LineupIntakePanel() {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [message, setMessage] = useState("");
  const [autoMessage, setAutoMessage] = useState("自动采集已开启：页面打开时每 60 秒检查一次赛前 15 分钟窗口。");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function sync() {
      try {
        const response = await fetch("/api/lineup-auto-sync", { method: "POST" });
        const payload = await response.json();
        if (!payload.ok) throw new Error(payload.message || "自动检查失败");
        if (stopped) return;
        setAutoMessage(
          `自动检查完成：已登记 ${payload.watchedSources} 个来源，本轮尝试 ${payload.attempted} 场，成功 ${payload.captured} 场。`
        );
        if (payload.captured > 0) window.location.reload();
      } catch (error) {
        if (!stopped) setAutoMessage(error instanceof Error ? error.message : "自动检查失败");
      }
    }

    sync();
    const timer = window.setInterval(sync, 60000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  async function submit() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/lineup-snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          homeTeam,
          awayTeam,
          sourceUrl,
          rawText,
          phase: "lineup"
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "保存失败");
      setMessage(`已保存并登记自动来源：主队 ${payload.snapshot.homePlayers.length} 人，客队 ${payload.snapshot.awayPlayers.length} 人。页面即将刷新。`);
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[22px] border border-primary/20 bg-background/45 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-medium">临场信息采集</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            保存比赛详情 URL 后，页面会在赛前 15 分钟窗口自动读取一次。网页无法读取时，把 GPT 整理后的格式粘贴为“阿根廷：球员1、球员2...”。保存后模型会重新计算执行分。
          </div>
          <div className="mt-2 text-xs text-primary">{autoMessage}</div>
        </div>
        <Button type="button" onClick={submit} disabled={saving}>
          {saving ? "保存中" : "读取并保存"}
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="主队，例如：阿根廷" value={homeTeam} onChange={(event) => setHomeTeam(event.target.value)} />
        <Input placeholder="客队，例如：对手球队" value={awayTeam} onChange={(event) => setAwayTeam(event.target.value)} />
      </div>
      <div className="mt-3">
        <Input placeholder="网页 URL，可选" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
      </div>
      <textarea
        className="mt-3 min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="粘贴首发文字，可选。例：阿根廷：马丁内斯、莫利纳、罗梅罗...&#10;对手：球员1、球员2..."
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
      />
      {message ? <div className="mt-3 text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}
