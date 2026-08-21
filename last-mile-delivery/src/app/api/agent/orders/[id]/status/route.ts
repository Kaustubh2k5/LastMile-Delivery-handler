import { NextRequest } from "next/server";
import { OrderStatus, Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { statusUpdateSchema } from "@/lib/validators";
import { transitionStatus } from "@/lib/services/tracking";

type Ctx = { params: { id: string } };

const AGENT_STATUSES: OrderStatus[] = [
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.FAILED,
];

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireRole(req, [Role.AGENT]);
    const body = statusUpdateSchema.parse(await req.json());
    const toStatus = body.status as OrderStatus;

    if (!AGENT_STATUSES.includes(toStatus)) {
      return Response.json({ error: "Agent cannot set this status" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order || order.agentId !== auth.id) {
      return Response.json({ error: "Order not assigned to you" }, { status: 403 });
    }

    const updated = await transitionStatus({
      orderId: params.id,
      toStatus,
      actorId: auth.id,
      actorRole: auth.role,
      note: body.note,
      failureReason: body.failureReason,
    });
    return Response.json({ order: updated });
  } catch (err) {
    return jsonError(err);
  }
}
