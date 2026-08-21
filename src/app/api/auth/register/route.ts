import { NextRequest } from "next/server";
import { jsonError } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { registerUser } from "@/lib/db/repositories/users";

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());
    const user = await registerUser(body);
    return Response.json(
      {
        message:
          "Account created. Check your email for a verification link before signing in.",
        user,
        requiresEmailVerification: true,
      },
      { status: 201 }
    );
  } catch (err) {
    return jsonError(err);
  }
}
