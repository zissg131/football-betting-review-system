import { NextResponse } from "next/server";
import { fetchExternalMatchDataset } from "@/lib/external-matches";
import { autoCaptureDueLineups, readLineupWatchSources } from "@/lib/lineup-intake";

export async function POST() {
  try {
    const sources = await readLineupWatchSources();
    const enabledSources = sources.filter((source) => source.enabled);
    if (!enabledSources.length) {
      return NextResponse.json({
        ok: true,
        watchedSources: 0,
        attempted: 0,
        captured: 0,
        results: [],
        message: "尚未登记自动采集 URL，已跳过外部读取"
      });
    }

    const data = await fetchExternalMatchDataset();
    const sync = await autoCaptureDueLineups(data.matches);
    return NextResponse.json({
      ok: true,
      watchedSources: enabledSources.length,
      ...sync
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "自动采集失败"
      },
      { status: 500 }
    );
  }
}
