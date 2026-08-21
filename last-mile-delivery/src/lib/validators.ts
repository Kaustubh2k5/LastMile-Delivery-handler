import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "AGENT"]).optional(),
  currentLat: z.number().optional().nullable(),
  currentLng: z.number().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const quoteSchema = z.object({
  pickupAddress: z.string().min(3),
  pickupPin: z.string().min(4),
  pickupLat: z.number().optional().nullable(),
  pickupLng: z.number().optional().nullable(),
  dropAddress: z.string().min(3),
  dropPin: z.string().min(4),
  dropLat: z.number().optional().nullable(),
  dropLng: z.number().optional().nullable(),
  lengthCm: z.number().positive(),
  breadthCm: z.number().positive(),
  heightCm: z.number().positive(),
  actualWeightKg: z.number().positive(),
  orderType: z.enum(["B2B", "B2C"]),
  paymentType: z.enum(["PREPAID", "COD"]),
  customerId: z.string().optional(), // admin creating on behalf
  scheduledDate: z.string().datetime().optional().nullable(),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "CREATED",
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "FAILED",
    "RESCHEDULED",
    "CANCELLED",
  ]),
  note: z.string().optional(),
  failureReason: z.string().optional(),
  override: z.boolean().optional(),
});

export const assignSchema = z.object({
  agentId: z.string().optional(),
  auto: z.boolean().optional(),
});

export const rescheduleSchema = z.object({
  scheduledDate: z.string().min(4),
  notes: z.string().optional(),
});

export const zoneSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
});

export const areaSchema = z.object({
  zoneId: z.string(),
  name: z.string().min(2),
  pinCode: z.string().min(4),
  city: z.string().min(2),
});

export const rateCardSchema = z.object({
  orderType: z.enum(["B2B", "B2C"]),
  scope: z.enum(["INTRA", "INTER"]),
  minWeightKg: z.number().min(0),
  maxWeightKg: z.number().positive().nullable().optional(),
  ratePerKg: z.number().min(0),
  flatRate: z.number().min(0).nullable().optional(),
  label: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const codSchema = z.object({
  orderType: z.enum(["B2B", "B2C"]),
  surchargeAmount: z.number().min(0),
});

export const agentLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  agentStatus: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]).optional(),
});
