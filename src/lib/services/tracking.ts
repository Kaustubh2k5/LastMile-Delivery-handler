import { OrderStatus, Role } from "@/lib/enums";
import { transitionOrderInDb } from "@/lib/db/repositories/orders";

/** Legal transitions (LLD). Admin override bypasses this map. */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  ASSIGNED: [OrderStatus.PICKED_UP, OrderStatus.FAILED, OrderStatus.CANCELLED],
  PICKED_UP: [OrderStatus.IN_TRANSIT, OrderStatus.FAILED],
  IN_TRANSIT: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  DELIVERED: [],
  FAILED: [OrderStatus.RESCHEDULED],
  RESCHEDULED: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  CANCELLED: [],
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  override = false
) {
  if (override) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export async function transitionStatus(opts: {
  orderId: string;
  toStatus: OrderStatus;
  actorId: string;
  actorRole: Role;
  note?: string;
  failureReason?: string;
  override?: boolean;
}) {
  return transitionOrderInDb(opts);
}
