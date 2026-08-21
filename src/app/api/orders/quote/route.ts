import { NextRequest } from "next/server";
import { OrderType, PaymentType } from "@/lib/enums";
import { requireAuth, jsonError } from "@/lib/auth";
import { quoteSchema } from "@/lib/validators";
import { quoteOrder } from "@/lib/services/orders";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = quoteSchema.parse(await req.json());
    const quote = await quoteOrder({
      pickupPin: body.pickupPin,
      dropPin: body.dropPin,
      lengthCm: body.lengthCm,
      breadthCm: body.breadthCm,
      heightCm: body.heightCm,
      actualWeightKg: body.actualWeightKg,
      orderType: body.orderType as OrderType,
      paymentType: body.paymentType as PaymentType,
    });
    return Response.json({ quote });
  } catch (err) {
    return jsonError(err);
  }
}
