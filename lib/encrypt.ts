import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES   = 12;
const TAG_BYTES  = 16;
const PREFIX     = "v1:";

function getKey(): Buffer {
  const b64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!b64) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be a 32-byte base64-encoded value");
  return key;
}

// Derive a separate HMAC sub-key from the encryption key so we don't reuse keys.
function getHmacKey(): Buffer {
  return createHmac("sha256", getKey()).update("editbridge:field-hmac-v1").digest();
}

/** Encrypt a plaintext string. Returns "v1:<base64(iv‖ciphertext‖tag)>". */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

/**
 * Decrypt a value produced by `encrypt()`.
 * Falls back to returning the raw value for legacy plaintext rows (no "v1:" prefix)
 * so read paths work during a rolling deployment before all rows are re-encrypted.
 */
export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext — pass through

  const key = getKey();
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");

  if (raw.length < IV_BYTES + TAG_BYTES) throw new Error("Invalid encrypted field: too short");

  const iv         = raw.subarray(0, IV_BYTES);
  const tag        = raw.subarray(raw.length - TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Deterministic HMAC-SHA256 for equality-checked fields (e.g. PAN deduplication).
 * The HMAC key is derived from the encryption key so only one env var is needed.
 * Returns a hex string safe to store in a text column.
 */
export function fieldHmac(value: string): string {
  return createHmac("sha256", getHmacKey()).update(value).digest("hex");
}
