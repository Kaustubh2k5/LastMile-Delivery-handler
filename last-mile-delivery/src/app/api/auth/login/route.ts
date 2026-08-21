import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/enums";
import { verifyPassword, signToken, jsonError } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.role === Role.CUSTOMER && !user.emailVerified) {
      return Response.json(
        {
          error: "Please verify your email before signing in.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 }
      );
    }

    const { withTransaction } = await import("@/lib/db/transaction");
    const { DomainEventType } = await import("@/lib/events/types");

    await withTransaction(async ({ enqueue }) => {
      await enqueue(DomainEventType.USER_LOGGED_IN, {
        userId: user.id,
        email: user.email,
        name: user.name,
      });
    });

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    });
    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        phone: user.phone,
        agentStatus: user.agentStatus,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
