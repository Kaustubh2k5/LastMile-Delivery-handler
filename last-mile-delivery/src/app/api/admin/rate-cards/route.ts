import { NextRequest } from "next/server";
import { OrderType, RateScope, Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateCardSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const rateCards = await prisma.rateCard.findMany({
      orderBy: [{ orderType: "asc" }, { scope: "asc" }, { minWeightKg: "asc" }],
    });
    return Response.json({ rateCards });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const body = rateCardSchema.parse(await req.json());
    const rateCard = await prisma.rateCard.create({
      data: {
        orderType: body.orderType as OrderType,
        scope: body.scope as RateScope,
        minWeightKg: body.minWeightKg,
        maxWeightKg: body.maxWeightKg ?? null,
        ratePerKg: body.ratePerKg,
        flatRate: body.flatRate ?? null,
        label: body.label ?? null,
        active: body.active ?? true,
      },
    });
    return Response.json({ rateCard }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
