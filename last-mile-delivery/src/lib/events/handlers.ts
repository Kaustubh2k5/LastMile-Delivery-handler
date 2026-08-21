import { prisma } from "@/lib/db";
import { NotificationChannel, NotificationStatus } from "@/lib/enums";
import { DomainEventType } from "@/lib/events/types";
import { getAppUrl, sendMail } from "@/lib/email/mailer";

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

async function logNotification(opts: {
  orderId?: string | null;
  userId?: string | null;
  recipient: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  eventType: string;
}) {
  await prisma.notificationLog.create({
    data: {
      orderId: opts.orderId ?? null,
      userId: opts.userId ?? null,
      channel: NotificationChannel.EMAIL,
      recipient: opts.recipient,
      subject: opts.subject,
      body: opts.body,
      status: opts.status,
      eventType: opts.eventType,
    },
  });
}

async function handleUserRegistered(payload: {
  userId: string;
  email: string;
  name: string;
  verifyToken: string;
}) {
  const link = `${getAppUrl()}/verify-email?token=${payload.verifyToken}`;
  const subject = "Verify your LastMile account";
  const text = [
    `Hi ${payload.name},`,
    ``,
    `Thanks for registering with LastMile.`,
    `Please verify your email by opening this link:`,
    link,
    ``,
    `This link expires in 24 hours.`,
    ``,
    `— LastMile`,
  ].join("\n");

  const status = await sendMail({
    to: payload.email,
    subject,
    text,
    html: `<p>Hi ${payload.name},</p><p>Thanks for registering with LastMile.</p><p><a href="${link}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
  });

  await logNotification({
    userId: payload.userId,
    recipient: payload.email,
    subject,
    body: text,
    status,
    eventType: DomainEventType.USER_REGISTERED,
  });
}

// async function handleUserVerificationResent(payload: {
//   userId: string;
//   email: string;
//   name: string;
//   verifyToken: string;
// }) {
//   return handleUserRegistered(payload);
// }

async function handleUserEmailVerified(payload: {
  userId: string;
  email: string;
  name: string;
}) {
  const subject = "Email verified — welcome to LastMile";
  const text = `Hi ${payload.name},\n\nYour email is verified. You can now place deliveries.\n\n— LastMile`;
  const status = await sendMail({ to: payload.email, subject, text });
  await logNotification({
    userId: payload.userId,
    recipient: payload.email,
    subject,
    body: text,
    status,
    eventType: DomainEventType.USER_EMAIL_VERIFIED,
  });
}

async function handleUserLoggedIn(payload: {
  userId: string;
  email: string;
  name: string;
}) {
  const subject = "New login to your LastMile account";
  const text = `Hi ${payload.name},\n\nWe detected a new login to your LastMile account.\nIf this was you, you can ignore this email. Otherwise, please change your password immediately.\n\n— LastMile`;
  const status = await sendMail({ to: payload.email, subject, text });
  await logNotification({
    userId: payload.userId,
    recipient: payload.email,
    subject,
    body: text,
    status,
    eventType: DomainEventType.USER_LOGGED_IN,
  });
}

async function handleOrderCustomerEmail(opts: {
  eventType: string;
  orderId: string;
  headline: string;
  extraLines?: string[];
}) {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: { customer: true, agent: true, pickupZone: true, dropZone: true },
  });
  if (!order?.customer?.email) return;

  const subject = `Order ${order.orderNumber}: ${opts.headline}`;
  const text = [
    `Hi ${order.customer.name},`,
    ``,
    opts.headline,
    ``,
    `Order: ${order.orderNumber}`,
    `Status: ${statusLabel(order.status)}`,
    `Pickup: ${order.pickupAddress} (${order.pickupPin}) · ${order.pickupZone.name}`,
    `Drop: ${order.dropAddress} (${order.dropPin}) · ${order.dropZone.name}`,
    `Charge: ₹${order.totalCharge.toFixed(2)}`,
    order.agent ? `Agent: ${order.agent.name}` : null,
    ...(opts.extraLines || []),
    ``,
    `Track: ${getAppUrl()}/orders/${order.id}`,
    ``,
    `— LastMile`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const status = await sendMail({
    to: order.customer.email,
    subject,
    text,
  });

  await logNotification({
    orderId: order.id,
    userId: order.customerId,
    recipient: order.customer.email,
    subject,
    body: text,
    status,
    eventType: opts.eventType,
  });
}

export async function handleDomainEvent(
  type: string,
  payload: Record<string, unknown>
) {
  switch (type) {
    case DomainEventType.USER_REGISTERED:
    case DomainEventType.USER_VERIFICATION_RESENT:
      await handleUserRegistered(
        payload as {
          userId: string;
          email: string;
          name: string;
          verifyToken: string;
        }
      );
      break;
    case DomainEventType.USER_EMAIL_VERIFIED:
      await handleUserEmailVerified(
        payload as { userId: string; email: string; name: string }
      );
      break;
    case DomainEventType.USER_LOGGED_IN:
      await handleUserLoggedIn(
        payload as { userId: string; email: string; name: string }
      );
      break;
    case DomainEventType.ORDER_CREATED:
      await handleOrderCustomerEmail({
        eventType: type,
        orderId: payload.orderId as string,
        headline: "Your delivery order has been created.",
      });
      break;
    case DomainEventType.ORDER_ASSIGNED:
      await handleOrderCustomerEmail({
        eventType: type,
        orderId: payload.orderId as string,
        headline: "A delivery agent has been assigned to your order.",
      });
      break;
    case DomainEventType.ORDER_STATUS_CHANGED:
      await handleOrderCustomerEmail({
        eventType: type,
        orderId: payload.orderId as string,
        headline: `Order status updated to ${statusLabel(String(payload.toStatus))}.`,
        extraLines: payload.note ? [`Note: ${payload.note}`] : [],
      });
      break;
    case DomainEventType.ORDER_CANCELLED:
      await handleOrderCustomerEmail({
        eventType: type,
        orderId: payload.orderId as string,
        headline: "Your order has been cancelled.",
        extraLines: payload.reason
          ? [`Reason: ${payload.reason}`]
          : ["It remains visible in your order history."],
      });
      break;
    case DomainEventType.ORDER_RESCHEDULED:
      await handleOrderCustomerEmail({
        eventType: type,
        orderId: payload.orderId as string,
        headline: "Your delivery has been rescheduled.",
        extraLines: payload.scheduledDate
          ? [`New date: ${payload.scheduledDate}`]
          : [],
      });
      break;
    default:
      console.warn("[events] unhandled type", type);
  }
}
