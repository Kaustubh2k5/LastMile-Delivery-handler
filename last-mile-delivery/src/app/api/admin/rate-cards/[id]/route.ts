import { NextRequest } from "next/server";
import { OrderType, RateScope, Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateCardSchema } from "@/lib/validators";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const body = rateCardSchema.partial().parse(await req.json());
    const rateCard = await prisma.rateCard.update({
      where: { id: params.id },
      data: {
        ...(body.orderType && { orderType: body.orderType as OrderType }),
        ...(body.scope && { scope: body.scope as RateScope }),
        ...(body.minWeightKg != null && { minWeightKg: body.minWeightKg }),
        ...(body.maxWeightKg !== undefined && { maxWeightKg: body.maxWeightKg }),
        ...(body.ratePerKg != null && { ratePerKg: body.ratePerKg }),
        ...(body.flatRate !== undefined && { flatRate: body.flatRate }),
        ...(body.label !== undefined && { label: body.label }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });
    return Response.json({ rateCard });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(req, [Role.ADMIN]);
    await prisma.rateCard.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
