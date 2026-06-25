"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ImportResult = {
  ok: boolean;
  imported?: number;
  totalRows?: number;
  errors?: string[];
  message?: string;
};

export function BetImportUpload() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/import-bets", {
        method: "POST",
        body: formData
      });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, message: "上传失败，请检查文件格式" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>上传文档自动录入</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={submit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input name="file" type="file" accept=".json,.csv,.tsv,.xlsx,.xls,.md,.txt" required />
          <Button type="submit" disabled={loading}>
            <Upload className="h-4 w-4" />
            {loading ? "导入中" : "上传并录入"}
          </Button>
        </form>
        <div className="text-xs leading-6 text-muted-foreground">
          支持 JSON、CSV、XLSX、Markdown 表格和 TXT。推荐让 GPT 输出字段：
          赛事、开赛时间、主队、客队、投注时间、玩法、投注方向、盘口、赔率、本金、结果、标签、备注。
        </div>
        {result ? (
          <div className={result.ok ? "text-sm text-positive" : "text-sm text-negative"}>
            {result.ok
              ? `已导入 ${result.imported ?? 0} / ${result.totalRows ?? 0} 行`
              : result.message ?? "导入失败"}
            {result.errors?.length ? (
              <div className="mt-2 space-y-1 text-xs text-negative">
                {result.errors.slice(0, 5).map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
