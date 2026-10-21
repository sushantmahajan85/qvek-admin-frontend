import type { KycKey } from "@/lib/qvek/types";

export const DOC_TITLES: Record<KycKey, string> = { aadhaar: "Aadhaar", pan: "PAN", dl: "Driving Licence" };

const TITLES: Record<KycKey, string> = { aadhaar: "AADHAAR", pan: "PERMANENT ACCOUNT NUMBER", dl: "DRIVING LICENCE" };
const COLOR: Record<KycKey, string> = { aadhaar: "#20C76B", pan: "#61A7FF", dl: "#F5B942" };
const FONT = "Segoe UI, system-ui, sans-serif";

/** Fictional sample KYC document (inline SVG) — ported from the prototype's `docSvg`. */
export function DocSvg({ kind, name, phone, big }: { kind: KycKey; name: string; phone: string; big?: boolean }) {
  const num = {
    aadhaar: "XXXX XXXX " + phone.slice(-4),
    pan: "XXXXX" + phone.slice(-4) + "X",
    dl: "MH12 XXXXXXX" + phone.slice(-3),
  }[kind];
  return (
    <svg
      viewBox="0 0 316 200"
      role="img"
      aria-label={"Sample " + TITLES[kind] + " — demo document"}
      style={big ? { width: "100%", height: "auto", borderRadius: 12 } : undefined}
    >
      <rect width="316" height="200" rx="12" fill="#EEF2F6" />
      <path d="M0 12a12 12 0 0 1 12-12h292a12 12 0 0 1 12 12v26H0z" fill={COLOR[kind]} />
      <text x="16" y="25" fontSize="12.5" fontWeight="800" fill="#0B1120" fontFamily={FONT} letterSpacing="1">{TITLES[kind]}</text>
      <text x="300" y="25" fontSize="10" fontWeight="700" fill="#0B1120" textAnchor="end" fontFamily={FONT}>SAMPLE</text>
      <rect x="16" y="52" width="72" height="90" rx="8" fill="#D5DDE6" />
      <circle cx="52" cy="86" r="16" fill="#AEBBCB" />
      <path d="M28 138c3-17 13-25 24-25s21 8 24 25" fill="#AEBBCB" />
      <g fontFamily={FONT}>
        <text x="104" y="66" fontSize="10" fill="#5B6B80">Name</text>
        <text x="104" y="82" fontSize="14" fontWeight="700" fill="#0B1120">{name}</text>
        <text x="104" y="106" fontSize="10" fill="#5B6B80">Number</text>
        <text x="104" y="122" fontSize="13.5" fontWeight="700" fill="#0B1120" fontFamily="Consolas, monospace">{num}</text>
        <text x="104" y="142" fontSize="10" fill="#5B6B80">Fictional record for UI demo</text>
      </g>
      <rect x="16" y="160" width="284" height="26" rx="6" fill="#FDE4E6" />
      <text x="158" y="177" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#C23542" letterSpacing="1.5" fontFamily={FONT}>DEMO DOCUMENT — NOT A REAL ID</text>
      <text x="210" y="120" fontSize="44" fontWeight="900" fill="#0B1120" fillOpacity=".05" transform="rotate(-18 210 120)" textAnchor="middle" fontFamily={FONT}>SAMPLE</text>
    </svg>
  );
}
