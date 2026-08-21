import { OrderType, PaymentType, Role } from "@/lib/enums";
import { calculateQuote } from "@/lib/services/pricing";
import {
  cancelOrderInDb,
  createOrderInDb,
  CreateOrderInput,
  rescheduleOrderInDb,
} from "@/lib/db/repositories/orders";

export type { CreateOrderInput };

export async function quoteOrder(input: {
  pickupPin: string;
  dropPin: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  orderType: OrderType;
  paymentType: PaymentType;
}) {
  return calculateQuote(input);
}

export async function createOrder(input: CreateOrderInput) {
  return createOrderInDb(input);
}

export async function rescheduleOrder(opts: {
  orderId: string;
  customerId: string;
  scheduledDate: Date;
  notes?: string;
  actorRole: Role;
}) {
  return rescheduleOrderInDb(opts);
}

export async function cancelOrder(opts: {
  orderId: string;
  actorId: string;
  actorRole: Role;
  reason?: string;
}) {
  return cancelOrderInDb(opts);
}
