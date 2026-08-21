import { NextRequest } from "next/server";
import { Role } from "@/lib/enums";
import { requireRole, jsonError } from "@/lib/auth";
import { assignSchema } from "@/lib/validators";
import { autoAssign, manualAssign } from "@/lib/services/assignment";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireRole(req, [Role.ADMIN]);
    const body = assignSchema.parse(await req.json());
    if (body.auto) {
      const result = await autoAssign(params.id, auth.id, auth.role);
      return Response.json(result);
    }
    if (!body.agentId) {
      return Response.json({ error: "agentId or auto required" }, { status: 400 });
    }
    const order = await manualAssign(params.id, body.agentId, auth.id, auth.role);
    return Response.json({ order });
  } catch (err) {
    return jsonError(err);
  }
}
