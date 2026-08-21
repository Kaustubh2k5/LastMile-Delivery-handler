import {
  AgentStatus,
  OrderStatus,
  OrderType,
  PaymentType,
  Role,
} from "@/lib/enums";
import { withTransaction, TxClient } from "@/lib/db/transaction";
import { DomainEventType } from "@/lib/events/types";
import { prisma } from "@/lib/db";
import { calculateQuote } from "@/lib/services/pricing";

const orderInclude = {
  customer: true,
  agent: true,
  pickupZone: true,
  dropZone: true,
  trackingEvents: { orderBy: { createdAt: "asc" as const } },
  attempts: { orderBy: { attemptNo: "asc" as const } },
};

function orderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `LM-${ts}-${rand}`;
}

export type CreateOrderInput = {
  pickupAddress: string;
  pickupPin: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropAddress: string;
  dropPin: string;
  dropLat?: number | null;
  dropLng?: number | null;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  orderType: OrderType;
  paymentType: PaymentType;
  customerId: string;
  createdById: string;
  scheduledDate?: Date | null;
};

async function releaseAgent(tx: TxClient, agentId: string | null | undefined) {
  if (!agentId) return;
  await tx.user.update({
    where: { id: agentId },
    data: { agentStatus: AgentStatus.AVAILABLE },
  });
}

export async function createOrderInDb(input: CreateOrderInput) {
  const quote = await calculateQuote(input);

  return withTransaction(async ({ tx, enqueue }) => {
    const created = await tx.order.create({
      data: {
        orderNumber: orderNumber(),
        customerId: input.customerId,
        createdById: input.createdById,
        pickupAddress: input.pickupAddress,
        pickupPin: input.pickupPin.trim(),
        pickupLat: input.pickupLat ?? null,
        pickupLng: input.pickupLng ?? null,
        pickupZoneId: quote.pickupZone.id,
        dropAddress: input.dropAddress,
        dropPin: input.dropPin.trim(),
        dropLat: input.dropLat ?? null,
        dropLng: input.dropLng ?? null,
        dropZoneId: quote.dropZone.id,
        lengthCm: input.lengthCm,
        breadthCm: input.breadthCm,
        heightCm: input.heightCm,
        actualWeightKg: input.actualWeightKg,
        volumetricWeightKg: quote.volumetricWeightKg,
        billableWeightKg: quote.billableWeightKg,
        orderType: input.orderType,
        paymentType: input.paymentType,
        baseCharge: quote.baseCharge,
        codSurcharge: quote.codSurcharge,
        totalCharge: quote.totalCharge,
        chargeBreakdown: JSON.stringify(quote.chargeBreakdown),
        status: OrderStatus.CREATED,
        scheduledDate: input.scheduledDate ?? null,
      },
    });

    await tx.trackingEvent.create({
      data: {
        orderId: created.id,
        fromStatus: null,
        toStatus: OrderStatus.CREATED,
        actorId: input.createdById,
        actorRole:
          input.createdById === input.customerId ? Role.CUSTOMER : Role.ADMIN,
        note: "Order created",
      },
    });

    await tx.deliveryAttempt.create({
      data: {
        orderId: created.id,
        attemptNo: 1,
        scheduledDate: input.scheduledDate ?? new Date(),
      },
    });

    await enqueue(DomainEventType.ORDER_CREATED, {
      orderId: created.id,
      customerId: input.customerId,
    });

    return tx.order.findUniqueOrThrow({
      where: { id: created.id },
      include: orderInclude,
    });
  });
}

export async function cancelOrderInDb(opts: {
  orderId: string;
  actorId: string;
  actorRole: Role;
  reason?: string;
}) {
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }
  if (
    opts.actorRole === Role.CUSTOMER &&
    order.customerId !== opts.actorId
  ) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  const cancellable: string[] = [
    OrderStatus.CREATED,
    OrderStatus.ASSIGNED,
    OrderStatus.RESCHEDULED,
  ];
  if (!cancellable.includes(order.status)) {
    throw Object.assign(
      new Error(
        `Cannot cancel order in status ${order.status}. Cancel only before pickup.`
      ),
      { status: 400 }
    );
  }
  if (order.status === OrderStatus.CANCELLED) {
    throw Object.assign(new Error("Order already cancelled"), { status: 400 });
  }

  const fromStatus = order.status as OrderStatus;
  const reason = opts.reason?.trim() || "Cancelled by customer";

  return withTransaction(async ({ tx, enqueue }) => {
    await releaseAgent(tx, order.agentId);

    await tx.trackingEvent.create({
      data: {
        orderId: order.id,
        fromStatus,
        toStatus: OrderStatus.CANCELLED,
        actorId: opts.actorId,
        actorRole: opts.actorRole,
        note: reason,
      },
    });

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelReason: reason,
        agentId: null,
      },
      include: orderInclude,
    });

    await enqueue(DomainEventType.ORDER_CANCELLED, {
      orderId: updated.id,
      customerId: updated.customerId,
      reason,
    });

    return updated;
  });
}

export async function rescheduleOrderInDb(opts: {
  orderId: string;
  customerId: string;
  scheduledDate: Date;
  notes?: string;
  actorRole: Role;
}) {
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }
  if (order.customerId !== opts.customerId && opts.actorRole !== Role.ADMIN) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (order.status !== OrderStatus.FAILED) {
    throw Object.assign(new Error("Only FAILED orders can be rescheduled"), {
      status: 400,
    });
  }

  const attemptCount = await prisma.deliveryAttempt.count({
    where: { orderId: order.id },
  });

  return withTransaction(async ({ tx, enqueue }) => {
    await tx.deliveryAttempt.create({
      data: {
        orderId: order.id,
        attemptNo: attemptCount + 1,
        scheduledDate: opts.scheduledDate,
        notes: opts.notes,
      },
    });

    await tx.trackingEvent.create({
      data: {
        orderId: order.id,
        fromStatus: OrderStatus.FAILED,
        toStatus: OrderStatus.RESCHEDULED,
        actorId: opts.customerId,
        actorRole: opts.actorRole,
        note:
          opts.notes ||
          `Rescheduled for ${opts.scheduledDate.toISOString()}`,
      },
    });

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.RESCHEDULED,
        scheduledDate: opts.scheduledDate,
        agentId: null,
        failureReason: null,
      },
      include: orderInclude,
    });

    await enqueue(DomainEventType.ORDER_RESCHEDULED, {
      orderId: updated.id,
      customerId: updated.customerId,
      scheduledDate: opts.scheduledDate.toISOString(),
    });

    return updated;
  });
}

export async function transitionOrderInDb(opts: {
  orderId: string;
  toStatus: OrderStatus;
  actorId: string;
  actorRole: Role;
  note?: string;
  failureReason?: string;
  override?: boolean;
}) {
  const { canTransition } = await import("@/lib/services/tracking");
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }

  const fromStatus = order.status as OrderStatus;
  if (!canTransition(fromStatus, opts.toStatus, opts.override)) {
    throw Object.assign(
      new Error(`Illegal transition ${order.status} → ${opts.toStatus}`),
      { status: 400 }
    );
  }

  const note =
    opts.note ||
    (opts.override ? "ADMIN_OVERRIDE" : undefined) ||
    opts.failureReason;

  return withTransaction(async ({ tx, enqueue }) => {
    await tx.trackingEvent.create({
      data: {
        orderId: order.id,
        fromStatus,
        toStatus: opts.toStatus,
        actorId: opts.actorId,
        actorRole: opts.actorRole,
        note,
      },
    });

    const data: {
      status: OrderStatus;
      failureReason?: string | null;
    } = { status: opts.toStatus };

    if (opts.toStatus === OrderStatus.FAILED) {
      data.failureReason = opts.failureReason || opts.note || "Delivery failed";
    }
    if (opts.toStatus === OrderStatus.DELIVERED) {
      data.failureReason = null;
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data,
      include: orderInclude,
    });

    if (
      order.agentId &&
      (opts.toStatus === OrderStatus.DELIVERED ||
        opts.toStatus === OrderStatus.FAILED)
    ) {
      await releaseAgent(tx, order.agentId);
    }

    await enqueue(DomainEventType.ORDER_STATUS_CHANGED, {
      orderId: updated.id,
      customerId: updated.customerId,
      fromStatus,
      toStatus: opts.toStatus,
      note: note || null,
    });

    return updated;
  });
}

export async function assignOrderInDb(opts: {
  orderId: string;
  agentId: string;
  actorId: string;
  actorRole: Role;
  note: string;
}) {
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }
  if (
    order.status !== OrderStatus.CREATED &&
    order.status !== OrderStatus.RESCHEDULED &&
    order.status !== OrderStatus.ASSIGNED
  ) {
    throw Object.assign(
      new Error(`Cannot assign order in status ${order.status}`),
      { status: 400 }
    );
  }

  const agent = await prisma.user.findFirst({
    where: { id: opts.agentId, role: Role.AGENT },
  });
  if (!agent) {
    throw Object.assign(new Error("Agent not found"), { status: 404 });
  }

  const fromStatus = order.status as OrderStatus;

  return withTransaction(async ({ tx, enqueue }) => {
    if (order.agentId && order.agentId !== opts.agentId) {
      await releaseAgent(tx, order.agentId);
    }

    await tx.user.update({
      where: { id: opts.agentId },
      data: { agentStatus: AgentStatus.BUSY },
    });

    await tx.trackingEvent.create({
      data: {
        orderId: opts.orderId,
        fromStatus,
        toStatus: OrderStatus.ASSIGNED,
        actorId: opts.actorId,
        actorRole: opts.actorRole,
        note: opts.note,
      },
    });

    const updated = await tx.order.update({
      where: { id: opts.orderId },
      data: { agentId: opts.agentId, status: OrderStatus.ASSIGNED },
      include: orderInclude,
    });

    await enqueue(DomainEventType.ORDER_ASSIGNED, {
      orderId: updated.id,
      customerId: updated.customerId,
      agentId: opts.agentId,
    });

    return updated;
  });
}
