export const DomainEventType = {
  USER_REGISTERED: "user.registered",
  USER_EMAIL_VERIFIED: "user.email_verified",
  USER_VERIFICATION_RESENT: "user.verification_resent",
  USER_LOGGED_IN: "user.logged_in",
  ORDER_CREATED: "order.created",
  ORDER_STATUS_CHANGED: "order.status_changed",
  ORDER_ASSIGNED: "order.assigned",
  ORDER_CANCELLED: "order.cancelled",
  ORDER_RESCHEDULED: "order.rescheduled",
} as const;

export type DomainEventType =
  (typeof DomainEventType)[keyof typeof DomainEventType];
