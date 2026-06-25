import { NextRequest, NextResponse } from "next/server";
import { captureLineupSnapshot } from "@/lib/lineup-intake";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      homeTeam?: string;
      awayTeam?: string;
      sourceUrl?: string;
      rawText?: string;
      phase?: string;
    };

    const snapshot = await captureLineupSnapshot({
      homeTeam: body.homeTeam ?? "",
      awayTeam: body.awayTeam ?? "",
      sourceUrl: body.sourceUrl,
      rawText: body.rawText,
      phase: body.phase
    });

    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "首发快照保存失败"
      },
      { status: 400 }
    );
  }
}
