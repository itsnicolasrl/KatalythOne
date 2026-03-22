import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  // Coste razonable para producción; configurable en un siguiente paso si hace falta.
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

