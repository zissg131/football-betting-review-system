"use client";

import { useEffect } from "react";

export function CleanRefreshUrl({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has("refresh")) return;
    url.searchParams.delete("refresh");

    const nextPath = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}`;
    window.history.replaceState(null, "", nextPath);
  }, [enabled]);

  return null;
}
