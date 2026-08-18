import { randomBytes } from "crypto";
import { CallStatus } from "@prisma/client";
import { AppError } from "@/utils/appError.js";
import { env } from "@/config/env.js";
import { companyContact } from "@/config/company.js";
import { prisma } from "@/lib/prisma.js";
import { buildCallIcs } from "@/lib/ics.js";
import { calendarInviteAttachment, sendClientAndBusinessEmails } from "@/lib/mailer.js";
import { callClientEmail, callInternalEmail } from "@/lib/email-templates.js";
import { addMinutes, formatInZone } from "@/lib/timezone.js";
import { isHighValueLead } from "./calls.constants.js";
import {
  BOOKING_WINDOW_DAYS,
  BUDGET_LABELS,
  CALL_BUFFER_MIN,
  CALL_DURATION_MIN,
  CHANNEL_LABELS,
  MIN_NOTICE_HOURS,
  PURPOSE_LABELS,
} from "./calls.constants.js";
import { callsModel } from "./calls.model.js";
import { generateSlots } from "./calls.slots.js";
import { leadsModel } from "@/modules/leads/leads.model.js";
import type { CreateCallInput, PutAvailabilityInput, UpdateCallInput } from "./calls.validation.js";

function meetingUrlFor(channel: CreateCallInput["channel"], callId: string) {
  if (channel === "WHATSAPP") {
    return `https://wa.me/${companyContact.whatsappE164}`;
  }
  if (channel === "PHONE") {
    return `tel:${companyContact.phoneE164}`;
  }
  return env.DEFAULT_MEET_URL || `https://meet.jit.si/linkerbuddy-${callId}`;
}

function assertBookableStart(startsAt: Date) {
  const now = new Date();
  const minStart = addMinutes(now, MIN_NOTICE_HOURS * 60);
  const maxStart = addMinutes(now, BOOKING_WINDOW_DAYS * 24 * 60);
  if (startsAt < minStart) {
    throw new AppError("That time is too soon to book", 400, "TOO_SOON");
  }
  if (startsAt > maxStart) {
    throw new AppError("That time is outside the booking window", 400, "OUT_OF_WINDOW");
  }
}

function occupiedEnd(endsAt: Date) {
  return addMinutes(endsAt, CALL_BUFFER_MIN);
}

async function assertSlotFree(startsAt: Date, endsAt: Date, excludeId?: string) {
  const overlap = await callsModel.findScheduledOverlapping(
    startsAt,
    occupiedEnd(endsAt),
    excludeId,
  );
  if (overlap) {
    throw new AppError("That time is no longer available", 409, "SLOT_TAKEN");
  }
}

function icsForCall(call: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  channel: string;
  meetingUrl: string | null;
  timezone: string;
}) {
  const location =
    call.meetingUrl || CHANNEL_LABELS[call.channel] || "Linkerbuddy strategy call";
  return buildCallIcs({
    id: call.id,
    title: "Strategy call with Linkerbuddy",
    description: `Channel: ${CHANNEL_LABELS[call.channel] ?? call.channel}\\nJoin: ${call.meetingUrl ?? ""}`,
    location,
    startsAt: call.startsAt,
    endsAt: call.endsAt,
  });
}

export const callsService = {
  async listSlots(dateKey: string, timezone: string, duration = CALL_DURATION_MIN) {
    const dayStart = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new AppError("Invalid date", 400, "INVALID_DATE");
    }
    const rangeStart = addMinutes(new Date(`${dateKey}T00:00:00Z`), -24 * 60);
    const rangeEnd = addMinutes(new Date(`${dateKey}T00:00:00Z`), 48 * 60);
    const [{ rules, blocks }, booked] = await Promise.all([
      callsModel.getAvailability(),
      callsModel.findScheduledInRange(rangeStart, rangeEnd),
    ]);
    return generateSlots({
      dateKey,
      visitorTz: timezone,
      durationMin: duration,
      rules,
      blocks,
      booked,
    });
  },

  async createCall(input: CreateCallInput, userId?: string) {
    const startsAt = new Date(input.startsAt);
    const endsAt = addMinutes(startsAt, CALL_DURATION_MIN);
    assertBookableStart(startsAt);

    const website = input.website?.trim() ? input.website.trim() : undefined;

    const created = await prisma.$transaction(async (tx) => {
      const overlap = await tx.scheduledCall.findFirst({
        where: {
          status: "SCHEDULED",
          startsAt: { lt: occupiedEnd(endsAt) },
          endsAt: { gt: startsAt },
        },
      });
      if (overlap) {
        throw new AppError("That time is no longer available", 409, "SLOT_TAKEN");
      }

      const lead = await tx.lead.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          subject: "Strategy call",
          message: input.notes ?? null,
          company: input.company ?? null,
          website: website ?? null,
          monthlyBudget: input.monthlyBudget ?? null,
          purpose: input.purpose,
          highValue: isHighValueLead(input.purpose, input.monthlyBudget),
          privacyAcceptedAt: new Date(),
          source: "schedule_call",
          userId: userId ?? null,
        },
      });

      const token = randomBytes(24).toString("hex");
      const call = await tx.scheduledCall.create({
        data: {
          leadId: lead.id,
          startsAt,
          endsAt,
          timezone: input.timezone,
          durationMin: CALL_DURATION_MIN,
          channel: input.channel,
          manageToken: token,
          notes: input.notes ?? null,
        },
      });

      const meetingUrl = meetingUrlFor(input.channel, call.id);
      const updated = await tx.scheduledCall.update({
        where: { id: call.id },
        data: { meetingUrl },
        include: { lead: true },
      });
      return updated;
    });

    const ics = icsForCall(created);
    const inquiry = {
      name: created.lead.name,
      email: created.lead.email,
      phone: created.lead.phone,
      subject: created.lead.subject,
      message: created.notes,
      company: created.lead.company,
      website: created.lead.website,
      monthlyBudget: created.lead.monthlyBudget
        ? BUDGET_LABELS[created.lead.monthlyBudget] ?? created.lead.monthlyBudget
        : created.lead.monthlyBudget,
      purpose: created.lead.purpose
        ? PURPOSE_LABELS[created.lead.purpose] ?? created.lead.purpose
        : created.lead.purpose,
      highValue: created.lead.highValue,
      startsAt: created.startsAt,
      timezone: created.timezone,
      channel: CHANNEL_LABELS[created.channel] ?? created.channel,
      meetingUrl: created.meetingUrl,
      manageToken: created.manageToken,
      durationMin: created.durationMin,
    };

    void sendClientAndBusinessEmails({
      clientEmail: created.lead.email,
      client: callClientEmail(inquiry),
      business: callInternalEmail({ ...inquiry, crmPath: "/crm/calls" }),
      attachments: [calendarInviteAttachment(ics)],
    });

    return {
      ...created,
      ics,
      localTime: formatInZone(created.startsAt, created.timezone),
    };
  },

  async getByToken(token: string) {
    const call = await callsModel.findByToken(token);
    if (!call) {
      throw new AppError("Booking not found", 404, "NOT_FOUND");
    }
    return {
      ...call,
      ics: icsForCall(call),
      localTime: formatInZone(call.startsAt, call.timezone),
    };
  },

  async cancelByToken(token: string) {
    const call = await callsModel.findByToken(token);
    if (!call) {
      throw new AppError("Booking not found", 404, "NOT_FOUND");
    }
    if (call.status !== "SCHEDULED") {
      throw new AppError("This booking can no longer be changed", 400, "NOT_CHANGEABLE");
    }
    return callsModel.update(call.id, { status: "CANCELLED" });
  },

  async rescheduleByToken(token: string, startsAtIso: string, timezone?: string) {
    const call = await callsModel.findByToken(token);
    if (!call) {
      throw new AppError("Booking not found", 404, "NOT_FOUND");
    }
    if (call.status !== "SCHEDULED") {
      throw new AppError("This booking can no longer be changed", 400, "NOT_CHANGEABLE");
    }
    const startsAt = new Date(startsAtIso);
    const endsAt = addMinutes(startsAt, CALL_DURATION_MIN);
    assertBookableStart(startsAt);
    await assertSlotFree(startsAt, endsAt, call.id);
    const updated = await callsModel.update(call.id, {
      startsAt,
      endsAt,
      timezone: timezone ?? call.timezone,
    });
    return {
      ...updated,
      ics: icsForCall(updated),
      localTime: formatInZone(updated.startsAt, updated.timezone),
    };
  },

  async listCalls(params: { status?: CallStatus; q?: string; page: number; limit: number }) {
    return callsModel.findMany(params);
  },

  async updateCall(id: string, input: UpdateCallInput) {
    const call = await callsModel.findById(id);
    if (!call) {
      throw new AppError("Call not found", 404, "NOT_FOUND");
    }
    const updated = await callsModel.update(id, {
      status: input.status,
      notes: input.notes,
    });
    if (input.status === "COMPLETED" || input.status === "NO_SHOW") {
      await leadsModel.updateStatus(
        call.leadId,
        input.status === "COMPLETED" ? "CONTACTED" : "LOST",
      );
    }
    return updated;
  },

  async getAvailability() {
    return callsModel.getAvailability();
  },

  async putAvailability(input: PutAvailabilityInput) {
    return callsModel.replaceAvailability(
      input.rules,
      input.blocks?.map((block) => ({
        startsAt: new Date(block.startsAt),
        endsAt: new Date(block.endsAt),
        reason: block.reason,
      })),
    );
  },
};
