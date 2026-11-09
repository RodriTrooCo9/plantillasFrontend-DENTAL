import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_PREFIX = "scrypt$";
const KEY_LENGTH = 64;

/**
 * Generates a salted password hash using NIST-approved scrypt KDF.
 */
export function hashPassword(raw: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(raw, salt, KEY_LENGTH).toString("hex");
  return `${SCRYPT_PREFIX}${salt}$${derived}`;
}

/**
 * Verifies a plaintext password against a salted scrypt hash (or legacy sha256 fallback).
 */
export function verifyPassword(raw: string, storedHash: string): boolean {
  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const [, salt, keyHex] = parts;
    const derived = scryptSync(raw, salt, KEY_LENGTH);
    const keyBuf = Buffer.from(keyHex, "hex");
    if (derived.length !== keyBuf.length) return false;
    return timingSafeEqual(derived, keyBuf);
  }
  // Backward-compatible fallback for legacy sha256 hashes if any exist in DB
  const legacy = createHash("sha256").update(`lumina:${raw}`).digest("hex");
  const a = Buffer.from(legacy, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Hashes an opaque token (e.g., refresh token) with SHA-256 before storing in DB.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(`lumina-token:${token}`).digest("hex");
}
