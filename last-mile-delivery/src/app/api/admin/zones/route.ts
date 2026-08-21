import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { zoneSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN, Role.CUSTOMER, Role.AGENT]);
    const zones = await prisma.zone.findMany({
      include: { areas: true },
      orderBy: { name: "asc" },
    });
    return Response.json({ zones });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const body = zoneSchema.parse(await req.json());
    const zone = await prisma.zone.create({
      data: { name: body.name, code: body.code.toUpperCase() },
    });
    return Response.json({ zone }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
