export type OrderMessageLine = {
  itemName: string;
  quantity: number;
  lineTotalPaise: number;
};

export type PaidOrder = {
  orderNumber: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  totalPaise: number;
  items: OrderMessageLine[];
};

export type WhatsAppStatus = "queued" | "not_requested" | "not_configured" | "invalid_number" | "failed";
export type WhatsAppResult = { status: WhatsAppStatus };
export type EmailStatus = "queued" | "not_requested" | "not_configured" | "failed";
export type EmailResult = { status: EmailStatus };

const formatRupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
const templateSafe = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim() || "-";

/** Converts a local 10-digit number to the configured country code, or accepts an E.164 number. */
export function normalizeWhatsAppNumber(phone: string): string | null {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  const defaultCountryCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "91").replace(/\D/g, "");
  const number = raw.startsWith("+")
    ? digits
    : digits.length === 10
      ? `${defaultCountryCode}${digits}`
      : digits;

  return /^[1-9]\d{7,14}$/.test(number) ? `+${number}` : null;
}

/** Values for the approved Twilio WhatsApp template documented in README.md. */
export function buildOrderTemplateVariables(order: PaidOrder) {
  const itemSummary = order.items
    .map((item) => `${templateSafe(item.itemName)} × ${item.quantity} (${formatRupees(item.lineTotalPaise)})`)
    .join(", ");

  return {
    "1": templateSafe(order.customerName ?? "Customer"),
    "2": String(order.orderNumber),
    "3": templateSafe(itemSummary),
    "4": formatRupees(order.totalPaise),
  };
}

function whatsappAddress(number: string) {
  return `whatsapp:${number}`;
}

export async function sendPaidOrderWhatsApp(order: PaidOrder): Promise<WhatsAppResult> {
  if (!order.customerPhone) return { status: "not_requested" };

  const to = normalizeWhatsAppNumber(order.customerPhone);
  if (!to) return { status: "invalid_number" };

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = normalizeWhatsAppNumber(process.env.TWILIO_WHATSAPP_FROM ?? "");
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  if (!accountSid || !authToken || !fromNumber || !contentSid) return { status: "not_configured" };

  const body = new URLSearchParams({
    To: whatsappAddress(to),
    From: whatsappAddress(fromNumber),
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(buildOrderTemplateVariables(order)),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });
    return { status: response.ok ? "queued" : "failed" };
  } catch {
    return { status: "failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendPaidOrderEmail(order: PaidOrder): Promise<EmailResult> {
  if (!order.customerEmail) return { status: "not_requested" };
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_EMAIL_FROM;
  if (!apiKey || !from) return { status: "not_configured" };
  const lines = order.items.map(item => `${item.itemName} × ${item.quantity} — ${formatRupees(item.lineTotalPaise)}`).join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `cafe-order-${order.orderNumber}` }, body: JSON.stringify({ from, to: [order.customerEmail], subject: `Cafe receipt #${order.orderNumber}`, text: `Hi ${order.customerName ?? "Customer"},\n\nYour payment has been received.\n\n${lines}\n\nTotal paid: ${formatRupees(order.totalPaise)}\n\nThank you!` }) });
    return { status: response.ok ? "queued" : "failed" };
  } catch { return { status: "failed" }; }
}
