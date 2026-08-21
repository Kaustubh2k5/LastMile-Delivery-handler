import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const agents = await prisma.user.findMany({
      where: { role: Role.AGENT },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        agentStatus: true,
        currentLat: true,
        currentLng: true,
        homeZoneId: true,
        homeZone: true,
      },
      orderBy: { name: "asc" },
    });
    const customers = await prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
    });
    return Response.json({ agents, customers });
  } catch (err) {
    return jsonError(err);
  }
}
