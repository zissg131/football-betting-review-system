import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
        size === "sm" && "h-9 px-3",
        size === "md" && "h-10 px-4",
        size === "icon" && "h-10 w-10",
        variant === "default" && "border-primary bg-primary text-primary-foreground hover:bg-foreground",
        variant === "outline" && "border-border bg-muted/40 text-foreground hover:bg-muted",
        variant === "ghost" && "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        variant === "danger" && "border-negative/40 bg-negative/10 text-negative hover:bg-negative/20",
        className
      )}
      {...props}
    />
  );
}
