import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteReturn, ReturnError } from "@/lib/returns";

// Deletes a refund (and its slip). Owners only, never cashiers.
export async function DELETE(_request: Request, { params }: { params: Promise<{ returnId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only an owner can delete a refund." }, { status: 403 });
  }

  const { returnId } = await params;
  try {
    const result = await deleteReturn(returnId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ReturnError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
