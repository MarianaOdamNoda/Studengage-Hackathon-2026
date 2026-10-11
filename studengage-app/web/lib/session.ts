import { cookies } from "next/headers";

/** Demo login: a cookie naming who you are. No passwords — this is a local demo. */
export const SESSION_COOKIE = "sg_user";

export type SessionUser = { kind: "student"; id: number } | { kind: "staff"; id: number };

export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const m = raw?.match(/^(student|staff):(\d+)$/);
  return m ? { kind: m[1] as SessionUser["kind"], id: Number(m[2]) } : null;
}

export async function setSessionUser(user: SessionUser | null) {
  const jar = await cookies();
  if (!user) jar.delete(SESSION_COOKIE);
  else jar.set(SESSION_COOKIE, `${user.kind}:${user.id}`, { path: "/", httpOnly: true, sameSite: "lax" });
}
