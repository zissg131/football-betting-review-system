import { NextResponse } from "next/server";
import { buildOverview, fetchExternalMatchDataset } from "@/lib/external-matches";

export async function GET() {
  try {
    const data = await fetchExternalMatchDataset();
    return NextResponse.json({
      ok: true,
      source: data.source,
      sourceStats: data.sourceStats,
      dates: data.dates,
      overview: buildOverview(data.matches),
      rawCount: data.matches.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "外部数据读取失败"
      },
      { status: 502 }
    );
  }
}
