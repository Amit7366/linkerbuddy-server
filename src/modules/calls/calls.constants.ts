export const CALL_DURATION_MIN = 30;
export const CALL_BUFFER_MIN = 15;
export const BOOKING_WINDOW_DAYS = 14;
export const MIN_NOTICE_HOURS = 4;
export const STAFF_TIMEZONE = "Asia/Dhaka";

export const CALL_PURPOSES = [
  "AGENCY_PARTNERSHIP",
  "CUSTOM_CAMPAIGN",
  "BULK_PACKAGE",
  "WHITELABEL",
  "GENERAL",
] as const;

export const MONTHLY_BUDGETS = ["under_500", "500_2k", "2k_5k", "5k_plus"] as const;

export type CallPurpose = (typeof CALL_PURPOSES)[number];
export type MonthlyBudget = (typeof MONTHLY_BUDGETS)[number];

export function isHighValueLead(purpose?: string | null, monthlyBudget?: string | null) {
  if (monthlyBudget === "2k_5k" || monthlyBudget === "5k_plus") return true;
  return (
    purpose === "AGENCY_PARTNERSHIP" ||
    purpose === "WHITELABEL" ||
    purpose === "CUSTOM_CAMPAIGN"
  );
}

export const PURPOSE_LABELS: Record<string, string> = {
  AGENCY_PARTNERSHIP: "Agency partnership",
  CUSTOM_CAMPAIGN: "Custom campaign",
  BULK_PACKAGE: "Bulk / package",
  WHITELABEL: "White-label",
  GENERAL: "General question",
};

export const BUDGET_LABELS: Record<string, string> = {
  under_500: "Under $500 / month",
  "500_2k": "$500–$2k / month",
  "2k_5k": "$2k–$5k / month",
  "5k_plus": "$5k+ / month",
};

export const CHANNEL_LABELS: Record<string, string> = {
  MEET: "Google Meet",
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
};
