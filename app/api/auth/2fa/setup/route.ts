import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

// Generates a fresh TOTP secret and its QR code — nothing is persisted here.
// The secret is only saved once the user proves possession of it via /verify.
export async function POST() {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = speakeasy.generateSecret({
    length: 20,
    name: `EditBridge (${session.user.email})`,
    issuer: "EditBridge",
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return NextResponse.json({
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCodeDataUrl,
  });
}
