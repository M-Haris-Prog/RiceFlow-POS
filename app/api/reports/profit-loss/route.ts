import { NextResponse } from "next/server";
import { getProfitLossReport } from "@/lib/reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam ? new Date(toParam) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const report = await getProfitLossReport(from, to);
  return NextResponse.json(report);
}
