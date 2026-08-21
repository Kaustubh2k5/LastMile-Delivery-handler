import nodemailer from "nodemailer";
import { NotificationStatus } from "@/lib/enums";

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

export function getAppUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<NotificationStatus> {
  if (!smtpConfigured()) {
    console.log(`[EMAIL STUB] To: ${opts.to} | ${opts.subject}\n${opts.text}`);
    return NotificationStatus.STUBBED;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from =
    process.env.SMTP_FROM ||
    `LastMile <${process.env.SMTP_USER}>`;

  try {
    await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || opts.text.replace(/\n/g, "<br/>"),
    });
    return NotificationStatus.SENT;
  } catch (err) {
    console.error("[email] send failed", err);
    return NotificationStatus.FAILED;
  }
}
