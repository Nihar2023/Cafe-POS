import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOrderTemplateVariables, normalizeWhatsAppNumber, sendPaidOrderWhatsApp } from "./order-notifications.js";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("paid-order WhatsApp notifications", () => {
  it("formats local and international numbers as WhatsApp E.164 addresses", () => {
    expect(normalizeWhatsAppNumber("98765 43210")).toBe("+919876543210");
    expect(normalizeWhatsAppNumber("+44 20 1234 5678")).toBe("+442012345678");
    expect(normalizeWhatsAppNumber("not a number")).toBeNull();
  });

  it("creates newline-free variables for the approved order template", () => {
    expect(buildOrderTemplateVariables({ orderNumber: 42, customerName: "Asha", totalPaise: 27500, items: [{ itemName: "Cappuccino\nLarge", quantity: 2, lineTotalPaise: 25000 }, { itemName: "Cookie", quantity: 1, lineTotalPaise: 2500 }] })).toEqual({ "1": "Asha", "2": "42", "3": "Cappuccino Large × 2 (₹250.00), Cookie × 1 (₹25.00)", "4": "₹275.00" });
  });

  it("uses Twilio's approved template fields and reports when WhatsApp queues it", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "secret";
    process.env.TWILIO_WHATSAPP_FROM = "+14155238886";
    process.env.TWILIO_WHATSAPP_CONTENT_SID = "HX123";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    globalThis.fetch = fetchMock;

    await expect(sendPaidOrderWhatsApp({ orderNumber: 42, customerPhone: "9876543210", totalPaise: 27500, items: [{ itemName: "Cappuccino", quantity: 2, lineTotalPaise: 27500 }] })).resolves.toEqual({ status: "queued" });
    const params = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(params.get("To")).toBe("whatsapp:+919876543210");
    expect(params.get("From")).toBe("whatsapp:+14155238886");
    expect(params.get("ContentSid")).toBe("HX123");
    expect(params.get("ContentVariables")).toContain('"2":"42"');
    expect(params.has("Body")).toBe(false);
  });
});
