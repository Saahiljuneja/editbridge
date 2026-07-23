import { createHash, randomBytes, timingSafeEqual } from "crypto";

function hash(password: string, salt: string): string {
  return createHash("sha256")
    .update(salt + password)
    .digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hash(password, salt)}`;
}

export async function comparePassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const inputHash = hash(password, salt);
  return timingSafeEqual(Buffer.from(storedHash), Buffer.from(inputHash));
}
