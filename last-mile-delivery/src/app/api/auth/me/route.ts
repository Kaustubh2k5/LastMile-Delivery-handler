import { NextRequest } from "next/server";
import { requireAuth, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const user = await prisma.user.findUnique({ where: { id: auth.id } });
    if (!user) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        agentStatus: user.agentStatus,
        currentLat: user.currentLat,
        currentLng: user.currentLng,
        homeZoneId: user.homeZoneId,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
