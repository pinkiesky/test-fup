import * as crypto from "crypto";

// should be in secrets
const SALT = "0LzQuNGF0LDQu9GL0YcK";

export function generateRandomString(
  deterministicKey: string,
  size: number,
): string {
  const hash = crypto.createHash("sha256");
  hash.update(deterministicKey);
  hash.update(SALT);
  hash.update(size.toString());

  const base64 = hash.digest().toString("base64");

  const base64WithoutSpecialChars = base64.replace(/[^a-zA-Z0-9]/g, "");
  return base64WithoutSpecialChars.slice(0, size);
}

export function generateRandomInt(from: number, to: number): number {
  return Math.floor(Math.random() * (to - from + 1)) + from;
}
