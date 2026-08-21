import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(req, [Role.ADMIN]);
    await prisma.area.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
