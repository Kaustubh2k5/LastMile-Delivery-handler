import { randomBytes } from "crypto";
import { Role } from "@/lib/enums";
import { withTransaction } from "@/lib/db/transaction";
import { DomainEventType } from "@/lib/events/types";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function newVerifyToken() {
  return randomBytes(32).toString("hex");
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  currentLat?: number | null;
  currentLng?: number | null;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const passwordHash = await hashPassword(input.password);
  const verifyToken = newVerifyToken();
  const emailVerifyExpires = new Date(Date.now() + VERIFY_TTL_MS);

  const isAgent = input.role === Role.AGENT;

  const user = await withTransaction(async ({ tx, enqueue }) => {
    const created = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        phone: input.phone || null,
        role: isAgent ? Role.AGENT : Role.CUSTOMER,
        emailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpires,
        currentLat: isAgent && input.currentLat ? input.currentLat : null,
        currentLng: isAgent && input.currentLng ? input.currentLng : null,
        agentStatus: isAgent ? "OFFLINE" : null,
      },
    });

    await enqueue(DomainEventType.USER_REGISTERED, {
      userId: created.id,
      email: created.email,
      name: created.name,
      verifyToken,
    });

    return created;
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    phone: user.phone,
    emailVerified: user.emailVerified,
  };
}

export async function verifyEmailByToken(token: string) {
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token },
  });
  if (!user) {
    throw Object.assign(new Error("Invalid verification link"), { status: 400 });
  }
  if (user.emailVerified) {
    return user;
  }
  if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
    throw Object.assign(new Error("Verification link expired"), { status: 400 });
  }

  return withTransaction(async ({ tx, enqueue }) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });
    await enqueue(DomainEventType.USER_EMAIL_VERIFIED, {
      userId: updated.id,
      email: updated.email,
      name: updated.name,
    });
    return updated;
  });
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) {
    throw Object.assign(new Error("Account not found"), { status: 404 });
  }
  if (user.emailVerified) {
    throw Object.assign(new Error("Email already verified"), { status: 400 });
  }

  const verifyToken = newVerifyToken();
  return withTransaction(async ({ tx, enqueue }) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: verifyToken,
        emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS),
      },
    });
    await enqueue(DomainEventType.USER_VERIFICATION_RESENT, {
      userId: updated.id,
      email: updated.email,
      name: updated.name,
      verifyToken,
    });
    return updated;
  });
}
