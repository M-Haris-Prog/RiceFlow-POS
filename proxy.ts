import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

// The only pages a cashier may open. API routes enforce roles themselves too.
const CASHIER_HOME = "/sales/new";
const CASHIER_PAGES = [CASHIER_HOME, "/bills"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  if (pathname === "/api/auth/login") {
    return response;
  }

  const session = await getIronSession<SessionData>(
    nextProxyCookies(request, response),
    sessionOptions
  );

  const isLoggedIn = Boolean(session.userId && session.role);
  const isCashier = session.role === "CASHIER";

  if (pathname.startsWith("/api")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return response;
  }

  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL(isCashier ? CASHIER_HOME : "/", request.url));
  }

  if (isCashier && !CASHIER_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL(CASHIER_HOME, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
