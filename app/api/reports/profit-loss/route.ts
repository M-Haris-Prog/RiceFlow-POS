import { NextResponse } from "next/server";
import { getProfitLossReport } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";
import { startOfShopDay } from "@/lib/dates";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  if ((fromParam && !startOfShopDay(fromParam)) || (toParam && !startOfShopDay(toParam))) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const report = await getProfitLossReport(fromParam ?? undefined, toParam ?? undefined);
  return NextResponse.json(report);
}
