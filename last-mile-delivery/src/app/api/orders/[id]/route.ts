import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireAuth, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAuth(req);
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        agent: { select: { id: true, name: true, email: true, phone: true } },
        pickupZone: true,
        dropZone: true,
        trackingEvents: {
          orderBy: { createdAt: "asc" },
          include: { actor: { select: { id: true, name: true, role: true } } },
        },
        attempts: { orderBy: { attemptNo: "asc" } },
        notifications: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });

    if (auth.role === Role.CUSTOMER && order.customerId !== auth.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (auth.role === Role.AGENT && order.agentId !== auth.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({
      order: {
        ...order,
        chargeBreakdown: JSON.parse(order.chargeBreakdown),
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
