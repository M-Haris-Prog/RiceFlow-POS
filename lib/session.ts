import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type Role = "OWNER" | "CASHIER";

export interface SessionData {
  userId?: string;
  username?: string;
  displayName?: string;
  role?: Role;
}

export const sessionOptions: SessionOptions = {
  cookieName: "rice_shop_session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Sessions created before roles existed have no role, so they count as logged out.
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId || !session.username || !session.displayName || !session.role) {
    return null;
  }
  return {
    id: session.userId,
    username: session.username,
    displayName: session.displayName,
    role: session.role,
  };
}
