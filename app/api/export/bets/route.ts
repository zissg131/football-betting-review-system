import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getBetLogData } from "@/lib/analytics";
import { betRowsForExport, rowsToCsv } from "@/lib/export";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const bets = await getBetLogData(params);
  const rows = betRowsForExport(bets);

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "投注记录");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="football-edge-bets.xlsx"'
      }
    });
  }

  return new NextResponse(`\ufeff${rowsToCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="football-edge-bets.csv"'
    }
  });
}
