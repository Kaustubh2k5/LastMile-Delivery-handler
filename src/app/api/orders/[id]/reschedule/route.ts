import { NextRequest } from "next/server";
import { requireAuth, jsonError } from "@/lib/auth";
import { rescheduleSchema } from "@/lib/validators";
import { rescheduleOrder } from "@/lib/services/orders";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAuth(req);
    const body = rescheduleSchema.parse(await req.json());
    const order = await rescheduleOrder({
      orderId: params.id,
      customerId: auth.id,
      scheduledDate: new Date(body.scheduledDate),
      notes: body.notes,
      actorRole: auth.role,
    });
    return Response.json({ order });
  } catch (err) {
    return jsonError(err);
  }
}
