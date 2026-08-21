import { NextRequest } from "next/server";
import { OrderType, Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { codSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const surcharges = await prisma.codSurcharge.findMany();
    return Response.json({ surcharges });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, [Role.ADMIN]);
    const body = codSchema.parse(await req.json());
    const surcharge = await prisma.codSurcharge.upsert({
      where: { orderType: body.orderType as OrderType },
      create: {
        orderType: body.orderType as OrderType,
        surchargeAmount: body.surchargeAmount,
      },
      update: { surchargeAmount: body.surchargeAmount },
    });
    return Response.json({ surcharge });
  } catch (err) {
    return jsonError(err);
  }
}
