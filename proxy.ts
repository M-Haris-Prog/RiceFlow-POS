import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

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

  const isLoggedIn = Boolean(session.userId);

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
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
