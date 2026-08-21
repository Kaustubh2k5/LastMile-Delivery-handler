import { NextRequest } from "next/server";
import { jsonError } from "@/lib/auth";
import { verifyEmailByToken } from "@/lib/db/repositories/users";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string };
    if (!body.token) {
      return Response.json({ error: "token required" }, { status: 400 });
    }
    const user = await verifyEmailByToken(body.token);
    return Response.json({
      message: "Email verified successfully. You can sign in now.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) {
      return Response.json({ error: "token required" }, { status: 400 });
    }
    const user = await verifyEmailByToken(token);
    return Response.json({
      message: "Email verified successfully.",
      email: user.email,
    });
  } catch (err) {
    return jsonError(err);
  }
}
