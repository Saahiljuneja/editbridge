import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

// Derive a fixed 32-byte AES-256 key from the env passphrase, whatever its length.
function getKey(): Buffer {
  const passphrase = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!passphrase) {
    throw new Error("TWO_FACTOR_ENCRYPTION_KEY is not set");
  }
  return createHash("sha256").update(passphrase).digest();
}

// AES-256-GCM: random 12-byte IV + 16-byte auth tag, both stored alongside the ciphertext.
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

const BACKUP_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomBackupCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += BACKUP_CODE_CHARS[randomBytes(1)[0] % BACKUP_CODE_CHARS.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, randomBackupCode);
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

/**
 * Checks a plaintext backup code against a list of hashed codes.
 * Returns the remaining hashed codes with the matched one removed (single use).
 */
export function consumeBackupCode(code: string, hashedCodes: string[]): { valid: boolean; remaining: string[] } {
  const target = Buffer.from(hashBackupCode(code));
  const idx = hashedCodes.findIndex((h) => {
    const candidate = Buffer.from(h);
    return candidate.length === target.length && timingSafeEqual(candidate, target);
  });
  if (idx === -1) return { valid: false, remaining: hashedCodes };
  const remaining = [...hashedCodes.slice(0, idx), ...hashedCodes.slice(idx + 1)];
  return { valid: true, remaining };
}
