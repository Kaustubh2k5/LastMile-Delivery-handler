import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { areaSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const areas = await prisma.area.findMany({
      include: { zone: true },
      orderBy: { pinCode: "asc" },
    });
    return Response.json({ areas });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const body = areaSchema.parse(await req.json());
    const area = await prisma.area.create({
      data: {
        zoneId: body.zoneId,
        name: body.name,
        pinCode: body.pinCode.trim(),
        city: body.city,
      },
      include: { zone: true },
    });
    return Response.json({ area }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
