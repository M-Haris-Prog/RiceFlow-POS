import { NextResponse } from "next/server";
import { getDailySalesReport } from "@/lib/reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const report = await getDailySalesReport(date);
  return NextResponse.json(report);
}
