import { NextResponse } from "next/server";
import { getDailySalesReport } from "@/lib/reports";
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
  const dateParam = searchParams.get("date");
  if (dateParam && !startOfShopDay(dateParam)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const report = await getDailySalesReport(dateParam ?? undefined);
  return NextResponse.json(report);
}
