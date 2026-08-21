import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/auth";
import { resendVerification } from "@/lib/db/repositories/users";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    await resendVerification(body.email);
    return Response.json({
      message: "Verification email resent. Check your inbox.",
    });
  } catch (err) {
    return jsonError(err);
  }
}
