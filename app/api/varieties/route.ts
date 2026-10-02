import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const varieties = await prisma.variety.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ varieties });
}
