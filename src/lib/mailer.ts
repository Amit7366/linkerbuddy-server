import nodemailer from "nodemailer";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

const fromAddress =
  env.SMTP_FROM ||
  (env.SMTP_USER ? `Linkerbuddy <${env.SMTP_USER}>` : "Linkerbuddy <omit9090@gmail.com>");

export function isMailerConfigured() {
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

function getTransport() {
  if (!isMailerConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}) {
  const transport = getTransport();
  if (!transport) {
    throw new Error("Email is not configured. Set SMTP_USER and SMTP_PASS.");
  }

  await transport.sendMail({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? options.text.replace(/\n/g, "<br />"),
    replyTo: options.replyTo,
  });
}

export async function sendNotifyEmail(options: { subject: string; text: string }) {
  if (!isMailerConfigured()) {
    logger.warn("SMTP not configured; skipping notify email");
    return;
  }

  try {
    await sendMail({
      to: env.NOTIFY_EMAIL,
      subject: options.subject,
      text: options.text,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to send notify email");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatLeadNotifyText(input: {
  kind: "contact" | "call";
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  company?: string | null;
  website?: string | null;
  monthlyBudget?: string | null;
  purpose?: string | null;
  startsAt?: Date | null;
  timezone?: string | null;
  channel?: string | null;
  crmPath: string;
}) {
  const lines = [
    input.kind === "call" ? "A new strategy call was booked." : "A new contact form was submitted.",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone || "—"}`,
    `Subject: ${input.subject || "—"}`,
    `Company: ${input.company || "—"}`,
    `Website: ${input.website || "—"}`,
    `Budget: ${input.monthlyBudget || "—"}`,
    `Purpose: ${input.purpose || "—"}`,
  ];

  if (input.kind === "call") {
    lines.push(
      `Call time (UTC): ${input.startsAt?.toISOString() ?? "—"}`,
      `Timezone: ${input.timezone || "—"}`,
      `Channel: ${input.channel || "—"}`,
    );
  }

  if (input.message) {
    lines.push("", "Message:", input.message);
  }

  lines.push("", `Open in CRM: ${env.CLIENT_URL}${input.crmPath}`);
  return lines.join("\n");
}

export function formatReplyHtml(body: string) {
  return `<p style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(body)}</p>`;
}
