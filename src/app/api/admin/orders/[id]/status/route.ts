import { NextRequest } from "next/server";
import { OrderStatus, Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { statusUpdateSchema } from "@/lib/validators";
import { transitionStatus } from "@/lib/services/tracking";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireRole(req, [Role.ADMIN]);
    const body = statusUpdateSchema.parse(await req.json());
    const order = await transitionStatus({
      orderId: params.id,
      toStatus: body.status as OrderStatus,
      actorId: auth.id,
      actorRole: auth.role,
      note: body.note,
      failureReason: body.failureReason,
      override: true,
    });
    return Response.json({ order });
  } catch (err) {
    return jsonError(err);
  }
}
