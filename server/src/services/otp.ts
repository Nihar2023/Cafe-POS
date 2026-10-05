const verifyUrl = (path: string) => `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}${path}`;

function credentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) throw Object.assign(new Error("OTP delivery is not configured. Add Twilio Verify credentials to .env."), { status: 503 });
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

export async function sendOtp(to: string, channel: "email" | "sms") {
  const response = await fetch(verifyUrl("/Verifications"), { method: "POST", headers: { Authorization: credentials(), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: to, Channel: channel, FriendlyName: "Cafe POS" }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message ?? "Could not send OTP"), { status: response.status });
}

export async function verifyOtp(to: string, code: string) {
  const response = await fetch(verifyUrl("/VerificationCheck"), { method: "POST", headers: { Authorization: credentials(), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: to, Code: code }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== "approved") throw Object.assign(new Error("Incorrect or expired OTP"), { status: 400 });
}
