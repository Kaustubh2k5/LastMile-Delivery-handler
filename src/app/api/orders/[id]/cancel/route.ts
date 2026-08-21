import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, jsonError } from "@/lib/auth";
import { Role } from "@/lib/enums";
import { cancelOrder } from "@/lib/services/orders";

type Ctx = { params: { id: string } };

const schema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== Role.CUSTOMER && auth.role !== Role.ADMIN) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = schema.parse(await req.json().catch(() => ({})));
    const order = await cancelOrder({
      orderId: params.id,
      actorId: auth.id,
      actorRole: auth.role,
      reason: body.reason,
    });
    return Response.json({ order });
  } catch (err) {
    return jsonError(err);
  }
}
