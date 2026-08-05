import bcrypt from "bcrypt";
import { createHash, timingSafeEqual } from "crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** SHA-256 hex digest — safe for long JWTs (bcrypt truncates at 72 bytes). */
export async function hashToken(token: string): Promise<string> {
  return createHash("sha256").update(token).digest("hex");
}

export async function compareToken(token: string, hash: string): Promise<boolean> {
  const incoming = await hashToken(token);
  try {
    return timingSafeEqual(Buffer.from(incoming, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}
