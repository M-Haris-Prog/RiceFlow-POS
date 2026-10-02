import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  username?: string;
  displayName?: string;
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

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId || !session.username || !session.displayName) {
    return null;
  }
  return {
    id: session.userId,
    username: session.username,
    displayName: session.displayName,
  };
}
