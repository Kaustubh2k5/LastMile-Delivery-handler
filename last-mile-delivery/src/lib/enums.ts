export const Role = {
  CUSTOMER: "CUSTOMER",
  AGENT: "AGENT",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrderType = {
  B2B: "B2B",
  B2C: "B2C",
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const PaymentType = {
  PREPAID: "PREPAID",
  COD: "COD",
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const RateScope = {
  INTRA: "INTRA",
  INTER: "INTER",
} as const;
export type RateScope = (typeof RateScope)[keyof typeof RateScope];

export const AgentStatus = {
  AVAILABLE: "AVAILABLE",
  BUSY: "BUSY",
  OFFLINE: "OFFLINE",
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const OrderStatus = {
  CREATED: "CREATED",
  ASSIGNED: "ASSIGNED",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const NotificationChannel = {
  EMAIL: "EMAIL",
  SMS: "SMS",
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  SENT: "SENT",
  STUBBED: "STUBBED",
  FAILED: "FAILED",
} as const;
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];
