import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { Role } from "@/lib/enums";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-lastmile-secret-change-me"
);

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: JwtPayload) {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as Role,
  };
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const token = getBearerToken(req);
  if (!token) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  let payload: JwtPayload;
  try {
    payload = await verifyToken(token);
  } catch {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 401 });
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    phone: user.phone,
  };
}

export async function requireRole(req: NextRequest, roles: Role[]): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return user;
}

export function jsonError(err: unknown) {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { message: string }[] }).issues;
    return Response.json(
      { error: issues.map((i) => i.message).join("; ") || "Validation error" },
      { status: 400 }
    );
  }
  const status = (err as { status?: number })?.status || 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  return Response.json({ error: message }, { status });
}
