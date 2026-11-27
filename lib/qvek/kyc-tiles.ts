/*
 * Pure model for the admin KYC document tiles (rider drawer).
 *
 * Kept out of the React component so the labelling rules are unit-testable:
 * every configured document must always render a visible title, even when the
 * server-driven config has a blank title or a custom kind, and uploaded files
 * are matched case-insensitively.
 */
import type { KycDoc, KycKey, KycStatus, Rider } from "./types";
import { isIdentityDoc } from "./kyc-requirements";

export interface KycTile {
  kind: string;
  title: string;
  required: boolean;
  /** True for aadhaar/pan/dl (preview + verify flow supported). */
  known: boolean;
  status: KycStatus;
  /** Human label for the status badge. */
  statusLabel: string;
  /** Missing, but the Aadhaar/PAN alternative is on file. */
  satisfiedByOther: boolean;
  fileName?: string;
  fileUrl?: string;
}

const KNOWN_KINDS: Record<string, true> = { aadhaar: true, pan: true, dl: true };
const KNOWN_TITLES: Record<string, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  dl: "Driving Licence",
};

export const BUILTIN_KYC_DOCS: Array<{ kind: string; title: string; required: boolean }> = [
  { kind: "aadhaar", title: "Aadhaar card", required: true },
  { kind: "pan", title: "PAN card", required: true },
  { kind: "dl", title: "Driving licence", required: false },
];

export function kycTileModels(
  r: Pick<Rider, "kyc" | "kycInfo">,
  configured: Array<{ kind: string; title: string; required: boolean }>,
): KycTile[] {
  const defs = configured.filter((d) => !!d?.kind?.trim());
  const list = defs.length ? defs : BUILTIN_KYC_DOCS;
  const docs = r.kycInfo?.docs ?? [];
  const isPresent = (kind: string): boolean => {
    const key = kind.trim().toLowerCase();
    const number = KNOWN_KINDS[key] ? r.kyc?.[key as KycKey]?.status : undefined;
    return (!!number && number !== "missing") || docs.some((d) => d.kind.trim().toLowerCase() === key);
  };
  // Either Aadhaar or PAN satisfies the shared identity requirement.
  const identitySatisfied = list.some((d) => isIdentityDoc(d.kind) && isPresent(d.kind));

  return list.map((def) => {
    const kind = def.kind.trim();
    const key = kind.toLowerCase();
    const known = !!KNOWN_KINDS[key];
    const doc: KycDoc | undefined = known ? r.kyc?.[key as KycKey] : undefined;
    const status: KycStatus = doc?.status ?? "missing";
    const file = docs.find((d) => d.kind.trim().toLowerCase() === key) ?? null;
    const title = (known ? KNOWN_TITLES[key] : undefined) || def.title?.trim() || kind || "Document";
    const satisfiedByOther = status === "missing" && isIdentityDoc(kind) && identitySatisfied;

    return {
      kind,
      title,
      required: def.required,
      known,
      status,
      statusLabel:
        status === "verified"
          ? "Verified"
          : status === "submitted"
            ? "Submitted"
            : satisfiedByOther || !def.required
              ? "Optional"
              : "Missing",
      satisfiedByOther,
      fileName: file?.name ?? doc?.file ?? undefined,
      fileUrl: file?.url ?? undefined,
    };
  });
}
