import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agentLocationSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, [Role.AGENT]);
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
  } catch (err) {
    return jsonError(err);
  }
}
