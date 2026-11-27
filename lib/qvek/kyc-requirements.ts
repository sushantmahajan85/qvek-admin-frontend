/*
 * KYC requirement model.
 *
 * Aadhaar and PAN are alternatives: at least one is mandatory, and a rider may
 * upload both. Other required kinds (including custom ones) are mandatory on
 * their own. Kept pure so the admin approval counts are unit-testable.
 */
export const IDENTITY_DOC_KINDS = ["aadhaar", "pan"] as const;

export function isIdentityDoc(kind: string): boolean {
  return (IDENTITY_DOC_KINDS as readonly string[]).includes(kind.trim().toLowerCase());
}

/**
 * Required document slots. Each slot is satisfied by any one of its kinds, so
 * Aadhaar + PAN collapse into a single mandatory slot.
 */
export function requiredDocSlots(defs: Array<{ kind: string; required: boolean }>): string[][] {
  const required = defs.filter((d) => d.required && d.kind.trim());
  const slots: string[][] = [];
  const identity = required.filter((d) => isIdentityDoc(d.kind)).map((d) => d.kind.trim());
  if (identity.length) slots.push(identity);
  for (const d of required) {
    if (!isIdentityDoc(d.kind)) slots.push([d.kind.trim()]);
  }
  return slots;
}
