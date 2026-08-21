import { AgentStatus, OrderStatus, Role } from "@/lib/enums";
import { prisma } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import { assignOrderInDb } from "@/lib/db/repositories/orders";

export async function manualAssign(
  orderId: string,
  agentId: string,
  actorId: string,
  actorRole: Role
) {
  const agent = await prisma.user.findFirst({
    where: { id: agentId, role: Role.AGENT },
  });
  if (!agent) {
    throw Object.assign(new Error("Agent not found"), { status: 404 });
  }
  return assignOrderInDb({
    orderId,
    agentId,
    actorId,
    actorRole,
    note: `Manual assign to ${agent.name}`,
  });
}

export async function autoAssign(
  orderId: string,
  actorId: string,
  actorRole: Role
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }
  if (
    order.status !== OrderStatus.CREATED &&
    order.status !== OrderStatus.RESCHEDULED &&
    order.status !== OrderStatus.ASSIGNED
  ) {
    throw Object.assign(
      new Error(`Cannot auto-assign order in status ${order.status}`),
      { status: 400 }
    );
  }

  const agents = await prisma.user.findMany({
    where: { role: Role.AGENT, agentStatus: AgentStatus.AVAILABLE },
  });
  if (agents.length === 0) {
    throw Object.assign(new Error("NO_AVAILABLE_AGENT"), { status: 409 });
  }

  type Scored = { id: string; name: string; score: number; reason: string };
  const scored: Scored[] = agents.map((a) => {
    if (
      order.pickupLat != null &&
      order.pickupLng != null &&
      a.currentLat != null &&
      a.currentLng != null
    ) {
      const km = haversineKm(
        a.currentLat,
        a.currentLng,
        order.pickupLat,
        order.pickupLng
      );
      return {
        id: a.id,
        name: a.name,
        score: km,
        reason: `distance ${km.toFixed(2)} km`,
      };
    }
    if (a.homeZoneId && a.homeZoneId === order.pickupZoneId) {
      return { id: a.id, name: a.name, score: 50, reason: "same home zone" };
    }
    return { id: a.id, name: a.name, score: 1000, reason: "no location fallback" };
  });

  scored.sort((a, b) => a.score - b.score);
  const best = scored[0];

  const updated = await assignOrderInDb({
    orderId,
    agentId: best.id,
    actorId,
    actorRole,
    note: `Auto-assigned to ${best.name} (${best.reason})`,
  });

  return { order: updated, assignment: best };
}
