import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "positive" | "negative" | "neutral" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "positive" && "border-positive/30 bg-positive/10 text-positive",
        tone === "negative" && "border-negative/30 bg-negative/10 text-negative",
        tone === "neutral" && "border-border bg-muted/60 text-muted-foreground",
        tone === "outline" && "border-border bg-transparent text-foreground",
        className
      )}
      {...props}
    />
  );
}
