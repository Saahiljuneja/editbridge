import Razorpay from "razorpay";
import { createHmac } from "crypto";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function createOrder(
  amount: number, // paise
  currency: string = "INR",
  receipt: string
) {
  return getRazorpay().orders.create({ amount, currency, receipt });
}

export function verifySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expected === signature;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const expected = createHmac(
    "sha256",
    process.env.RAZORPAY_WEBHOOK_SECRET!
  )
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

export async function createTransfer(
  paymentId: string,
  accountId: string,
  amount: number // paise
) {
  return getRazorpay().payments.transfer(paymentId, {
    transfers: [
      {
        account: accountId,
        amount,
        currency: "INR",
        on_hold: 0,
      },
    ],
  });
}

export async function createRefund(
  paymentId: string,
  amount: number // paise — pass full amount for full refund
) {
  return getRazorpay().payments.refund(paymentId, { amount });
}

/** Fetch a Razorpay order to verify its amount server-side. */
export async function fetchRazorpayOrder(orderId: string) {
  return getRazorpay().orders.fetch(orderId) as Promise<{ id: string; amount: number; currency: string; status: string }>;
}
