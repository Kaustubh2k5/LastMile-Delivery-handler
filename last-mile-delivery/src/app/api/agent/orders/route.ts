import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agentLocationSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, [Role.AGENT]);
    const orders = await prisma.order.findMany({
      where: { agentId: auth.id },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        pickupZone: true,
        dropZone: true,
      },
    });
    return Response.json({ orders });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, [Role.AGENT]);
    const url = new URL(req.url);
    if (url.searchParams.get("location") === "1") {
      const body = agentLocationSchema.parse(await req.json());
      const user = await prisma.user.update({
        where: { id: auth.id },
        data: {
          currentLat: body.lat,
          currentLng: body.lng,
          ...(body.agentStatus && { agentStatus: body.agentStatus }),
        },
      });
      return Response.json({
        user: {
          id: user.id,
          currentLat: user.currentLat,
          currentLng: user.currentLng,
          agentStatus: user.agentStatus,
        },
      });
    }
    return Response.json({ error: "Unknown patch" }, { status: 400 });
  } catch (err) {
    return jsonError(err);
  }
}
