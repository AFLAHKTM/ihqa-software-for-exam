import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type UserRole =
  | "STUDENT"
  | "JUDGE"
  | "SUPER_ADMIN"
  | "EXAM_CONTROLLER"
  | "EVALUATOR"
  | "DISTRICT_COORDINATOR";

export type SessionScope = "STUDENT" | "JUDGE" | "ADMIN";

export interface SessionUser {
  userId: number;
  username: string;
  fullName: string;
  role: UserRole;
  studentId?: number | null;
  judgeId?: number | null;
}

const COOKIE_BY_SCOPE: Record<SessionScope, string> = {
  STUDENT: "ihqa_student_session",
  JUDGE: "ihqa_judge_session",
  ADMIN: "ihqa_admin_session",
};

export function roleToScope(role: UserRole): SessionScope {
  if (role === "STUDENT") return "STUDENT";
  if (role === "JUDGE") return "JUDGE";
  return "ADMIN";
}

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "ihqa-kerala-2026-local-development-signing-secret-change-in-prod";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.userId || !payload.role || !payload.username) return null;
    return {
      userId: Number(payload.userId),
      username: String(payload.username),
      fullName: String(payload.fullName || payload.username),
      role: payload.role as UserRole,
      studentId: payload.studentId ? Number(payload.studentId) : null,
      judgeId: payload.judgeId ? Number(payload.judgeId) : null,
    };
  } catch {
    return null;
  }
}

export async function getSession(
  scope?: SessionScope
): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  if (scope) {
    const token = cookieStore.get(COOKIE_BY_SCOPE[scope])?.value;
    if (!token) return null;
    const user = await verifySessionToken(token);
    if (!user || roleToScope(user.role) !== scope) return null;
    return user;
  }

  for (const s of ["STUDENT", "JUDGE", "ADMIN"] as SessionScope[]) {
    const token = cookieStore.get(COOKIE_BY_SCOPE[s])?.value;
    if (token) {
      const user = await verifySessionToken(token);
      if (user) return user;
    }
  }
  return null;
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();
  const cookieName = COOKIE_BY_SCOPE[roleToScope(user.role)];
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie(scope?: SessionScope): Promise<void> {
  const cookieStore = await cookies();
  if (scope) {
    cookieStore.delete(COOKIE_BY_SCOPE[scope]);
    return;
  }
  cookieStore.delete(COOKIE_BY_SCOPE.STUDENT);
  cookieStore.delete(COOKIE_BY_SCOPE.JUDGE);
  cookieStore.delete(COOKIE_BY_SCOPE.ADMIN);
}

export const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "EXAM_CONTROLLER",
  "EVALUATOR",
  "DISTRICT_COORDINATOR",
];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}
