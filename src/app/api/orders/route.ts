import { NextRequest } from "next/server";
import { OrderType, PaymentType, Role } from "@/lib/enums";
import { requireAuth, jsonError } from "@/lib/auth";
import { quoteSchema } from "@/lib/validators";
import { createOrder } from "@/lib/services/orders";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = quoteSchema.parse(await req.json());

    let customerId = auth.id;
    if (auth.role === Role.ADMIN) {
      if (!body.customerId) {
        return Response.json(
          { error: "customerId required when admin creates order" },
          { status: 400 }
        );
      }
      const customer = await prisma.user.findFirst({
        where: { id: body.customerId, role: Role.CUSTOMER },
      });
      if (!customer) {
        return Response.json({ error: "Customer not found" }, { status: 404 });
      }
      customerId = customer.id;
    } else if (auth.role !== Role.CUSTOMER) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const order = await createOrder({
      pickupAddress: body.pickupAddress,
      pickupPin: body.pickupPin,
      pickupLat: body.pickupLat,
      pickupLng: body.pickupLng,
      dropAddress: body.dropAddress,
      dropPin: body.dropPin,
      dropLat: body.dropLat,
      dropLng: body.dropLng,
      lengthCm: body.lengthCm,
      breadthCm: body.breadthCm,
      heightCm: body.heightCm,
      actualWeightKg: body.actualWeightKg,
      orderType: body.orderType as OrderType,
      paymentType: body.paymentType as PaymentType,
      customerId,
      createdById: auth.id,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
    });

    return Response.json({ order }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const zoneId = searchParams.get("zoneId") || undefined;
    const agentId = searchParams.get("agentId") || undefined;

    const where: Record<string, unknown> = {};
    if (auth.role === Role.CUSTOMER) where.customerId = auth.id;
    else if (auth.role === Role.AGENT) where.agentId = auth.id;
    // ADMIN: all orders, with optional filters
    if (status) where.status = status;
    if (agentId && auth.role === Role.ADMIN) where.agentId = agentId;
    if (zoneId && auth.role === Role.ADMIN) {
      where.OR = [{ pickupZoneId: zoneId }, { dropZoneId: zoneId }];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        pickupZone: true,
        dropZone: true,
      },
    });
    return Response.json({ orders });
  } catch (err) {
    return jsonError(err);
  }
}
