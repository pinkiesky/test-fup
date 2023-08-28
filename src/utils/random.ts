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

export function mergeRandom<T extends {}>(original: T, patch: Partial<T>): T {
  const pickKey = (key: keyof T) => {
    if (original[key] === undefined) {
      return patch[key];
    } else if (patch[key] === undefined) {
      return original[key];
    } else if (Math.random() > 0.5) {
      return patch[key];
    }

    return original[key];
  };

  const result: Partial<T> = {};
  for (const key of Object.keys(original) as (keyof T)[]) {
    result[key] = pickKey(key);
  }

  return result as T;
}
