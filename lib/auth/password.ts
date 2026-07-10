import { hash } from "bcryptjs";

export const BCRYPT_COST = 12;

export function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}
