export const MATRICULE_PATTERN = /^[A-Z0-9-]{6,16}$/;

export function normalizeMatricule(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidMatricule(value: string): boolean {
  return MATRICULE_PATTERN.test(normalizeMatricule(value));
}