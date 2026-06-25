import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sub,
  tone = "neutral"
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="min-h-32">
      <CardContent className="flex h-full flex-col justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className={cn("mt-4 text-3xl font-semibold", tone === "positive" && "text-positive", tone === "negative" && "text-negative")}>
          {value}
        </div>
        {sub ? <div className="mt-3 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
