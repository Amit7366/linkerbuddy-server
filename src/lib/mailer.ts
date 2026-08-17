import nodemailer from "nodemailer";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
import type { RenderedEmail } from "@/lib/email-templates.js";

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

export type MailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
};

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
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
    attachments: options.attachments,
  });
}

export async function sendQuietMail(options: Parameters<typeof sendMail>[0]) {
  if (!isMailerConfigured()) {
    logger.warn({ to: options.to, subject: options.subject }, "SMTP not configured; skipping email");
    return false;
  }

  try {
    await sendMail(options);
    return true;
  } catch (error) {
    logger.error({ err: error, to: options.to, subject: options.subject }, "Failed to send email");
    return false;
  }
}

/** Client-facing copy plus an internal copy to the business inbox. */
export async function sendClientAndBusinessEmails(input: {
  clientEmail: string;
  client: RenderedEmail;
  business: RenderedEmail;
  clientReplyTo?: string;
  businessReplyTo?: string;
  attachments?: MailAttachment[];
}) {
  const businessTo = env.NOTIFY_EMAIL;
  const clientReplyTo = input.clientReplyTo || businessTo;

  await sendQuietMail({
    to: input.clientEmail,
    subject: input.client.subject,
    text: input.client.text,
    html: input.client.html,
    replyTo: clientReplyTo,
    attachments: input.attachments,
  });

  await sendQuietMail({
    to: businessTo,
    subject: input.business.subject,
    text: input.business.text,
    html: input.business.html,
    replyTo: input.businessReplyTo || input.clientEmail,
    attachments: input.attachments,
  });
}

export function calendarInviteAttachment(ics: string): MailAttachment {
  return {
    filename: "linkerbuddy-strategy-call.ics",
    content: ics,
    contentType: "text/calendar; charset=UTF-8",
  };
}
