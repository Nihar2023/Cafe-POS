# Cafe POS

Simple cafe billing system with an owner role and a cashier role.

## Run locally

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. Run `npm install`.
3. Run `npm run db:migrate` for a new database, or `npm run db:upgrade` once for an existing cafe database.
4. Run `npm run db:seed` for the supplied demo data.
5. Run `npm run dev`, then open `http://localhost:5173`.

Seed users: `owner@cafe.local` and `cashier@cafe.local`, both using password `Cafe12345`.

## Owner profile, cashiers, and OTP

The owner Profile page lets the owner change their own name, profile photo, verified mobile number, email address, and password. It also manages cashier accounts, their photos, passwords, and active/blocked status. A blocked cashier cannot sign in or continue using an existing session. A cashier only sees their profile photo and a separate logout icon in the billing header; they cannot view or change account details.

For real OTP messages, create a Twilio Verify service and set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` in `.env`, then restart the server. Use an E.164 mobile number, for example `+919876543210`. Twilio Verify supports both SMS and email channels, but email delivery also requires the related email-provider configuration in the Twilio Verify service. The credentials remain on the backend only. See the [Twilio Verify API documentation](https://www.twilio.com/docs/verify/api) for service setup and the [verification flow](https://www.twilio.com/docs/verify/api/verification) for OTP delivery.

## Payments

Cash billing works now. Razorpay UPI QR is deliberately paused until the Razorpay merchant account is approved and live API keys are available. Never put any Razorpay secret in frontend code or commit `.env`.

## WhatsApp order messages

When an owner or cashier confirms a cash payment, the server commits the payment first and then queues the customer's order items and total to the entered WhatsApp number and/or email address, when those channels are configured.

Set these server-only `.env` values to activate delivery: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, and `TWILIO_WHATSAPP_CONTENT_SID`. The last value is the `HX...` SID of an approved WhatsApp template in Twilio. Use this exact body when creating the template, then submit it for WhatsApp approval:

```text
Hi {{1}}, your cafe order #{{2}} has been paid.
Items: {{3}}
Total paid: {{4}}
Thank you!
```

The app supplies the customer name, order number, item list, and total as variables 1–4. WhatsApp requires an approved template to start a conversation with a customer, and customers must have opted in. A ten-digit mobile number is treated as an Indian number by default; use `+` and country code for other countries.

For email receipts, set `RESEND_API_KEY` and `RECEIPT_EMAIL_FROM` in `.env`. The sender must be a verified Resend sender/domain. The server uses Resend's server-side `POST /emails` API with an idempotency key, so a retry will not duplicate the same receipt. See the [Resend email API reference](https://github.com/resend/resend-openapi/blob/main/resend.yaml).

## CSV report

The owner can download paid-sale data from `GET /api/orders/export/csv` using an authenticated owner session.
