import { env } from "@/config/env.js";
import { companyContact } from "@/config/company.js";
import { CALL_DURATION_MIN, STAFF_TIMEZONE } from "@/modules/calls/calls.constants.js";
import { formatInZone } from "@/lib/timezone.js";

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

export type InquiryFields = {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  company?: string | null;
  website?: string | null;
  monthlyBudget?: string | null;
  purpose?: string | null;
  highValue?: boolean;
};

export type CallFields = InquiryFields & {
  startsAt: Date;
  timezone: string;
  channel: string;
  meetingUrl?: string | null;
  manageToken?: string;
  durationMin?: number;
};

type DetailRow = { label: string; value: string; href?: string };

const NAVY = "#071b3d";
const BLUE = "#1268f3";
const MUTED = "#5b6b82";
const INK = "#10203a";
const LINE = "#e2eaf5";
const SITE = env.CLIENT_URL.replace(/\/$/, "");

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function dash(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function websiteHref(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatMultiline(value: string) {
  return escapeHtml(value).replace(/\r\n/g, "\n").replace(/\n/g, "<br />");
}

function formatCallWhen(date: Date, timeZone: string) {
  return `${formatInZone(date, timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} · ${timeZone}`;
}

function crmUrl(path: string) {
  return `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
}

function manageUrl(token: string) {
  return `${SITE}/schedule/${token}`;
}

function detailRows(
  items: Array<[string, string | null | undefined, string | undefined]>,
  keepEmpty: boolean,
): DetailRow[] {
  return items
    .filter(([, value]) => keepEmpty || Boolean(value?.trim()))
    .map(([label, value, href]) => ({
      label,
      value: dash(value),
      href,
    }));
}

function inquiryRows(input: InquiryFields, keepEmpty: boolean): DetailRow[] {
  return detailRows(
    [
      ["Name", input.name, undefined],
      ["Email", input.email, `mailto:${input.email}`],
      ["Phone", input.phone, input.phone ? `tel:${input.phone.replace(/\s+/g, "")}` : undefined],
      ["Company", input.company, undefined],
      ["Website", input.website, websiteHref(input.website)],
      ["Subject", input.subject, undefined],
      ["Purpose", input.purpose, undefined],
      ["Monthly budget", input.monthlyBudget, undefined],
    ],
    keepEmpty,
  );
}

function detailsHtml(rows: DetailRow[]) {
  if (!rows.length) return "";
  const body = rows
    .map((row) => {
      const value = row.href
        ? `<a href="${escapeHtml(row.href)}" style="color:${BLUE};text-decoration:none;font-weight:700">${escapeHtml(row.value)}</a>`
        : escapeHtml(row.value);
      return `<tr>
        <td style="padding:10px 12px 10px 0;width:148px;color:${MUTED};font-size:13px;line-height:1.4;vertical-align:top">${escapeHtml(row.label)}</td>
        <td style="padding:10px 0;color:${INK};font-size:13px;line-height:1.45;font-weight:600;vertical-align:top">${value}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 4px">${body}</table>`;
}

function detailsText(rows: DetailRow[]) {
  return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
}

function stepsHtml(steps: string[]) {
  const items = steps
    .map(
      (step, index) => `<tr>
        <td style="padding:0 10px 10px 0;width:28px;vertical-align:top;color:${BLUE};font-size:13px;font-weight:800">${index + 1}.</td>
        <td style="padding:0 0 10px;color:${INK};font-size:14px;line-height:1.5">${escapeHtml(step)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px">${items}</table>`;
}

function renderLayout(input: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  badge?: string;
  details?: DetailRow[];
  quoteTitle?: string;
  quote?: string | null;
  stepsTitle?: string;
  steps?: string[];
  extraHtml?: string;
  extraText?: string;
  cta?: { label: string; href: string };
  closing?: string;
}) {
  const details = input.details?.length ? detailsHtml(input.details) : "";
  const quote = input.quote?.trim()
    ? `<p style="margin:18px 0 8px;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase">${escapeHtml(input.quoteTitle ?? "Message")}</p>
      <div style="margin:0 0 8px;padding:14px 16px;background:#f5f8fd;border:1px solid ${LINE};border-left:4px solid ${BLUE};border-radius:8px;color:${INK};font-size:14px;line-height:1.6">${formatMultiline(input.quote)}</div>`
    : "";
  const extra = input.extraHtml ?? "";
  const steps = input.steps?.length
    ? `<p style="margin:22px 0 10px;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase">${escapeHtml(input.stepsTitle ?? "What happens next")}</p>${stepsHtml(input.steps)}`
    : "";
  const cta = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px">
        <tr>
          <td style="border-radius:10px;background:${BLUE}">
            <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${escapeHtml(input.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";
  const badge = input.badge
    ? `<span style="display:inline-block;margin:0 0 12px;padding:4px 10px;border-radius:999px;background:#fff4d6;color:#8a5a00;font-size:11px;font-weight:800;letter-spacing:0.4px">${escapeHtml(input.badge)}</span>`
    : "";
  const closing = input.closing
    ? `<p style="margin:22px 0 0;color:${INK};font-size:14px;line-height:1.6">${formatMultiline(input.closing)}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef3f9">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f9;padding:28px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0">
          <tr>
            <td style="padding:26px 32px;background:${NAVY};border-radius:16px 16px 0 0">
              <p style="margin:0;color:#9eb6d8;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">Linkerbuddy</p>
              <p style="margin:6px 0 0;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px">Guest post marketplace</p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:${BLUE};font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px;background:#ffffff">
              ${badge}
              <p style="margin:0 0 6px;color:${BLUE};font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase">${escapeHtml(input.eyebrow)}</p>
              <h1 style="margin:0 0 14px;color:${NAVY};font-size:24px;line-height:1.25;font-weight:800">${escapeHtml(input.title)}</h1>
              <p style="margin:0 0 8px;color:${INK};font-size:15px;line-height:1.65">${formatMultiline(input.intro)}</p>
              ${details}
              ${extra}
              ${quote}
              ${steps}
              ${cta}
              ${closing}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 26px;background:#f7f9fc;border-top:1px solid ${LINE};border-radius:0 0 16px 16px">
              <p style="margin:0 0 6px;color:${NAVY};font-size:13px;font-weight:800">${escapeHtml(companyContact.name)}</p>
              <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.7">
                Verified guest posts and link insertions<br />
                ${escapeHtml(companyContact.email)} · ${escapeHtml(companyContact.phoneDisplay)}<br />
                ${escapeHtml(companyContact.address)}
              </p>
              <p style="margin:12px 0 0;color:#8a97ab;font-size:11px;line-height:1.5">This email was sent by Linkerbuddy. If you were not expecting it, you can ignore this message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    input.badge ? `[${input.badge}]` : "",
    input.title,
    "",
    input.intro,
    input.details?.length ? `\n${detailsText(input.details)}` : "",
    input.extraText ? `\n${input.extraText}` : "",
    input.quote?.trim() ? `\n${input.quoteTitle ?? "Message"}:\n${input.quote}` : "",
    input.steps?.length
      ? `\n${input.stepsTitle ?? "What happens next"}\n${input.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`
      : "",
    input.cta ? `\n${input.cta.label}: ${input.cta.href}` : "",
    input.closing ? `\n${input.closing}` : "",
    "",
    `${companyContact.name} · ${companyContact.email} · ${companyContact.phoneDisplay}`,
    SITE,
  ].filter((part) => part !== "");

  return { html, text: textParts.join("\n") };
}

export function contactClientEmail(input: InquiryFields): RenderedEmail {
  const rendered = renderLayout({
    preheader: "Thanks for contacting Linkerbuddy. Our placements team will review your request shortly.",
    eyebrow: "Inquiry received",
    title: `Thanks, ${firstName(input.name)}. We have your request.`,
    intro:
      "Thank you for reaching out to Linkerbuddy. Your message is with our placements team. We review every inquiry personally so we can recommend sites that match your market, metrics, and budget.",
    details: inquiryRows(input, false),
    quoteTitle: "Your message",
    quote: input.message,
    stepsTitle: "What happens next",
    steps: [
      "A specialist reviews your brief against live inventory.",
      "You will hear from us within one business day with next steps or a shortlist.",
      "Reply to this email anytime if you want to add target URLs, anchors, or markets.",
    ],
    closing:
      "Best regards,\nThe Linkerbuddy team\nVerified guest posts and link insertions",
  });

  return {
    subject: "We received your inquiry — Linkerbuddy",
    ...rendered,
  };
}

export function contactInternalEmail(input: InquiryFields & { crmPath: string }): RenderedEmail {
  const rendered = renderLayout({
    preheader: `${input.name} submitted a contact form. Reply from CRM or by answering this email.`,
    eyebrow: "New website inquiry",
    title: `${input.name} just submitted the contact form`,
    intro:
      "A prospective client reached out through the Linkerbuddy website. Their details are below. Reply from CRM so the thread stays on file, or answer this email to contact them directly.",
    badge: input.highValue ? "HIGH VALUE LEAD" : undefined,
    details: inquiryRows(input, true),
    quoteTitle: "Client message",
    quote: input.message,
    stepsTitle: "Recommended next step",
    steps: [
      "Open the lead in CRM and send a tailored reply within one business day.",
      "If this is a high-value brief, offer a strategy call and a custom shortlist.",
    ],
    cta: { label: "Open lead in CRM", href: crmUrl(input.crmPath) },
  });

  return {
    subject: `New inquiry from ${input.name} — Linkerbuddy`,
    ...rendered,
  };
}

export function callClientEmail(input: CallFields): RenderedEmail {
  const duration = input.durationMin ?? CALL_DURATION_MIN;
  const details = detailRows(
    [
      ["When", formatCallWhen(input.startsAt, input.timezone), undefined],
      ["Duration", `${duration}-minute strategy call`, undefined],
      ["Channel", input.channel, undefined],
      ["Join / contact", input.meetingUrl, input.meetingUrl ?? undefined],
      [
        "Reschedule / cancel",
        input.manageToken ? "Open booking page" : null,
        input.manageToken ? manageUrl(input.manageToken) : undefined,
      ],
      ["Company", input.company, undefined],
      ["Purpose", input.purpose, undefined],
    ],
    false,
  );

  const rendered = renderLayout({
    preheader: `Your Linkerbuddy strategy call is confirmed for ${formatCallWhen(input.startsAt, input.timezone)}.`,
    eyebrow: "Booking confirmed",
    title: `You're booked, ${firstName(input.name)}.`,
    intro:
      "Your strategy call with Linkerbuddy is confirmed. We will use this time to understand your SEO goals and recommend verified placements that fit your market and budget.",
    details,
    quoteTitle: "Your notes",
    quote: input.message,
    stepsTitle: "Before the call",
    steps: [
      "Add the attached calendar invite so the time is held on both sides.",
      "Join on time using the channel above. If you need to change anything, use the manage link.",
      "Come with target markets, preferred metrics (DR / DA / traffic), and any domains to avoid.",
    ],
    cta:
      input.meetingUrl && /^https?:\/\//i.test(input.meetingUrl)
        ? { label: "Join the call", href: input.meetingUrl }
        : input.manageToken
          ? { label: "Manage this booking", href: manageUrl(input.manageToken) }
          : undefined,
    closing:
      "We look forward to speaking with you.\n\nBest regards,\nThe Linkerbuddy team",
  });

  return {
    subject: "Your Linkerbuddy strategy call is confirmed",
    ...rendered,
  };
}

export function callInternalEmail(input: CallFields & { crmPath: string }): RenderedEmail {
  const duration = input.durationMin ?? CALL_DURATION_MIN;
  const details = detailRows(
    [
      ["Client", input.name, undefined],
      ["Email", input.email, `mailto:${input.email}`],
      ["Phone", input.phone, input.phone ? `tel:${input.phone.replace(/\s+/g, "")}` : undefined],
      ["Client time", formatCallWhen(input.startsAt, input.timezone), undefined],
      ["Dhaka time", formatCallWhen(input.startsAt, STAFF_TIMEZONE), undefined],
      ["Duration", `${duration} minutes`, undefined],
      ["Channel", input.channel, undefined],
      ["Join / contact", input.meetingUrl, input.meetingUrl ?? undefined],
      ["Company", input.company, undefined],
      ["Website", input.website, websiteHref(input.website)],
      ["Purpose", input.purpose, undefined],
      ["Monthly budget", input.monthlyBudget, undefined],
    ],
    true,
  );

  const rendered = renderLayout({
    preheader: `${input.name} booked a strategy call for ${formatCallWhen(input.startsAt, STAFF_TIMEZONE)}.`,
    eyebrow: "New strategy call",
    title: `${input.name} booked a ${duration}-minute call`,
    intro:
      "A new strategy call is on the calendar. Prepare a relevant shortlist if the brief is clear, and join on the channel below.",
    badge: input.highValue ? "HIGH VALUE LEAD" : undefined,
    details,
    quoteTitle: "Client notes",
    quote: input.message,
    stepsTitle: "Before the meeting",
    steps: [
      "Confirm the join link and add the invite to the team calendar.",
      "Review the brief and pull 5–10 matching placements if budget and market are known.",
    ],
    cta: { label: "Open calls in CRM", href: crmUrl(input.crmPath) },
  });

  return {
    subject: `Call booked: ${input.name} · ${formatInZone(input.startsAt, STAFF_TIMEZONE)}`,
    ...rendered,
  };
}

export function replyClientEmail(input: {
  name: string;
  subject: string;
  body: string;
}): RenderedEmail {
  const rendered = renderLayout({
    preheader: "Linkerbuddy has replied to your inquiry.",
    eyebrow: "Message from Linkerbuddy",
    title: `Hi ${firstName(input.name)},`,
    intro: "Thank you for your interest in Linkerbuddy. Here is our response to your inquiry.",
    quoteTitle: "Reply",
    quote: input.body,
    stepsTitle: "Need anything else?",
    steps: [
      "Reply to this email and our team will continue the conversation.",
      "If you would like a custom shortlist, include target markets, metrics, and monthly budget.",
    ],
    closing:
      "Best regards,\nThe Linkerbuddy team\nVerified guest posts and link insertions",
  });

  return {
    subject: input.subject,
    ...rendered,
  };
}

export function replyInternalEmail(input: {
  name: string;
  email: string;
  subject: string;
  body: string;
  crmPath: string;
}): RenderedEmail {
  const rendered = renderLayout({
    preheader: `A reply was sent to ${input.name} (${input.email}).`,
    eyebrow: "Outbound reply sent",
    title: `Your reply to ${input.name} is on its way`,
    intro: `This is a copy of the email just sent to ${input.email}. Keep this for the record, or follow up from CRM if the conversation continues.`,
    details: detailRows(
      [
        ["Client", input.name, undefined],
        ["Email", input.email, `mailto:${input.email}`],
        ["Subject", input.subject, undefined],
      ],
      true,
    ),
    quoteTitle: "Message sent",
    quote: input.body,
    cta: { label: "Open lead in CRM", href: crmUrl(input.crmPath) },
  });

  return {
    subject: `Copy: ${input.subject}`,
    ...rendered,
  };
}

export type OrderEmailItem = {
  domain: string;
  niche?: string | null;
  serviceType: string;
  quantity: number;
  lineTotalCents: number;
};

export type OrderEmailFields = {
  orderNumber: string;
  billingName: string;
  billingEmail: string;
  billingPhone?: string | null;
  billingCompany?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes?: string | null;
  paymentStatus: string;
  status: string;
  totalCents: number;
  currency: string;
  items: OrderEmailItem[];
};

function formatMoney(cents: number, currency = "usd") {
  const amount = (cents / 100).toFixed(2);
  return currency.toLowerCase() === "usd" ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

function serviceLabel(value: string) {
  if (value === "GUEST") return "Guest post";
  if (value === "INSERT") return "Link insertion";
  return value;
}

function paymentLabel(value: string) {
  if (value === "UNPAID") return "Unpaid — invoice pending";
  if (value === "PAID") return "Paid";
  if (value === "FAILED") return "Payment failed";
  if (value === "REFUNDED") return "Refunded";
  return value;
}

function orderAddress(input: OrderEmailFields) {
  return [
    input.addressLine1,
    input.addressLine2,
    `${input.city}, ${input.state} ${input.postalCode}`,
    input.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function orderItemsBlock(items: OrderEmailItem[], totalCents: number, currency: string) {
  const rows = items
    .map((item) => {
      const meta = [serviceLabel(item.serviceType), `Qty ${item.quantity}`, item.niche]
        .filter(Boolean)
        .join(" · ");
      return `<tr>
        <td style="padding:10px 12px 10px 0;color:${INK};font-size:13px;line-height:1.45;vertical-align:top">
          <strong>${escapeHtml(item.domain)}</strong><br />
          <span style="color:${MUTED};font-weight:500">${escapeHtml(meta)}</span>
        </td>
        <td style="padding:10px 0;color:${INK};font-size:13px;font-weight:700;text-align:right;vertical-align:top;white-space:nowrap">${escapeHtml(formatMoney(item.lineTotalCents, currency))}</td>
      </tr>`;
    })
    .join("");

  const html = `<p style="margin:18px 0 8px;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase">Order items</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px">${rows}
      <tr>
        <td style="padding:12px 12px 0 0;border-top:1px solid ${LINE};color:${NAVY};font-size:14px;font-weight:800">Total</td>
        <td style="padding:12px 0 0;border-top:1px solid ${LINE};color:${NAVY};font-size:16px;font-weight:800;text-align:right">${escapeHtml(formatMoney(totalCents, currency))}</td>
      </tr>
    </table>`;

  const text = [
    "Order items",
    ...items.map(
      (item) =>
        `- ${item.domain} · ${serviceLabel(item.serviceType)} × ${item.quantity} · ${formatMoney(item.lineTotalCents, currency)}`,
    ),
    `Total: ${formatMoney(totalCents, currency)}`,
  ].join("\n");

  return { html, text };
}

function orderDetailRows(input: OrderEmailFields, keepEmpty: boolean): DetailRow[] {
  return detailRows(
    [
      ["Order", input.orderNumber, undefined],
      ["Customer", input.billingName, undefined],
      ["Email", input.billingEmail, `mailto:${input.billingEmail}`],
      ["Phone", input.billingPhone, input.billingPhone ? `tel:${input.billingPhone.replace(/\s+/g, "")}` : undefined],
      ["Company", input.billingCompany, undefined],
      ["Address", orderAddress(input), undefined],
      ["Status", input.status, undefined],
      ["Payment", paymentLabel(input.paymentStatus), undefined],
    ],
    keepEmpty,
  );
}

export function orderClientEmail(input: OrderEmailFields): RenderedEmail {
  const items = orderItemsBlock(input.items, input.totalCents, input.currency);
  const rendered = renderLayout({
    preheader: `We received order ${input.orderNumber}. Our team will review it and follow up shortly.`,
    eyebrow: "Order received",
    title: `Thanks, ${firstName(input.billingName)}. Your order is in.`,
    intro: `We have received order ${input.orderNumber}. Our placements team will review the sites and billing details, then follow up with next steps.`,
    details: orderDetailRows(input, false),
    extraHtml: items.html,
    extraText: items.text,
    quoteTitle: "Order notes",
    quote: input.notes,
    stepsTitle: "What happens next",
    steps: [
      "A specialist reviews your order against live inventory.",
      "We will let you know within 3 business days with confirmation or any questions.",
      "You can track this order anytime from your account.",
    ],
    cta: { label: "View my orders", href: crmUrl("/account/orders") },
    closing: "Best regards,\nThe Linkerbuddy team\nVerified guest posts and link insertions",
  });

  return {
    subject: `We received your order ${input.orderNumber} — Linkerbuddy`,
    ...rendered,
  };
}

export function orderInternalEmail(input: OrderEmailFields): RenderedEmail {
  const items = orderItemsBlock(input.items, input.totalCents, input.currency);
  const adminPath = `/dashboard/super-admin/orders?order=${encodeURIComponent(input.orderNumber)}`;
  const rendered = renderLayout({
    preheader: `${input.billingName} placed ${input.orderNumber} for ${formatMoney(input.totalCents, input.currency)}. Open Super Admin to manage it.`,
    eyebrow: "New marketplace order",
    title: `New order ${input.orderNumber}`,
    intro: `${input.billingName} just placed an order on Linkerbuddy. Review the placements, accept or reject the order, and update fulfillment from Super Admin.`,
    badge: input.paymentStatus === "UNPAID" ? "PAYMENT PENDING" : undefined,
    details: orderDetailRows(input, true),
    extraHtml: items.html,
    extraText: items.text,
    quoteTitle: "Customer notes",
    quote: input.notes,
    stepsTitle: "Recommended next step",
    steps: [
      "Open the order in Super Admin and confirm the sites are still available.",
      "Mark Accepted to start fulfillment, or Reject if the brief cannot be fulfilled.",
      "Reply to this email to contact the customer directly.",
    ],
    cta: { label: "Manage in Super Admin", href: crmUrl(adminPath) },
  });

  return {
    subject: `New order ${input.orderNumber} from ${input.billingName} — Linkerbuddy`,
    ...rendered,
  };
}
