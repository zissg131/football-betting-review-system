import { createMatch } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

export default function NewMatchPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">新增比赛</h1>
        <p className="mt-1 text-sm text-muted-foreground">录入比赛基础信息和第一版赛前判断。</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>比赛设置</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMatch} className="grid gap-4 md:grid-cols-2">
            <Label>
              赛事
              <Input name="competition" required placeholder="英超" />
            </Label>
            <Label>
              开赛时间
              <Input type="datetime-local" name="kickoffTime" required />
            </Label>
            <Label>
              主队
              <Input name="homeTeam" required />
            </Label>
            <Label>
              客队
              <Input name="awayTeam" required />
            </Label>
            <Label>
              主队排名
              <Input type="number" name="homeRank" min="1" />
            </Label>
            <Label>
              客队排名
              <Input type="number" name="awayRank" min="1" />
            </Label>
            <Label>
              推荐方向
              <Input name="recommendedPick" placeholder="主队 -0.25" />
            </Label>
            <Label>
              推荐比分
              <Input name="predictedScore" placeholder="2-1" />
            </Label>
            <Label>
              信心等级
              <Input type="number" name="confidenceLevel" defaultValue="3" min="1" max="5" />
            </Label>
            <Label className="md:col-span-2">
              赛前摘要
              <Textarea name="preMatchSummary" />
            </Label>
            <div className="md:col-span-2">
              <Button type="submit">创建比赛</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
