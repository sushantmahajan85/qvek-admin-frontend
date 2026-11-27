"use client";

/* Qvek EV scooter glyph — the one piece of artwork that stands for a vehicle on
 * the admin maps. Ported from the prototype illustration
 * (`qvek-prototype/js/illustrations.js` → `scooter()`): a filled flat-style
 * scooter with an EV bolt on the rear panel, so the panel and the design
 * prototype draw the same vehicle.
 *
 * Authored in a 250×152 grid. ART_VIEWBOX is the padded box around the artwork
 * and ART_CENTER is its centre, so callers only ever reason in "width in px"
 * and never touch the raw coordinates.
 *
 * One source of truth, two consumers — both go through scooterGlyph(), so the
 * live Google map and the SVG mini maps can never drift apart:
 *   • scooterMarkerIcon() → a data-URI SVG, because the Google Maps marker API
 *     takes an image URL rather than inline markup (fleet-google-map.tsx).
 *   • <EvScooter/>        → the same markup rendered inline (map-parts.tsx).
 *
 * The prototype's soft ground shadow is deliberately dropped: on a map every
 * vehicle is already pinned to its own position, and the white halo emitted by
 * scooterMarkerIcon() does the separating job instead.
 */

export const ART_VIEWBOX = "4 14 220 140";
export const ART_CENTER = { x: 114, y: 84 };
/** width ÷ height of ART_VIEWBOX — use to derive a height from a width. */
export const ART_RATIO = 220 / 140;

/** Halo thickness. The glyph is redrawn in a flat colour behind itself, scaled
 *  up about its centre: a cheap outline that keeps the marker legible over
 *  light tiles, satellite imagery and overlapping markers alike. */
const HALO_SCALE = 1.12;
const HALO_SCALE_SELECTED = 1.18;

/** Tones for the parts that aren't the tinted panels. */
export interface ScooterTones {
  /** Tyres, fork, stem. */
  chassis: string;
  /** Seat. */
  seat: string;
  /** Floorboard, grip. */
  deck: string;
  /** Wheel rims. */
  rim: string;
}

/** For Google's default (light) road tiles. */
export const TONES_ON_LIGHT: ScooterTones = {
  chassis: "#26302A",
  seat: "#17231B",
  deck: "#3B4740",
  rim: "#C9D1CB",
};

/** For the SVG mini maps, which draw the scooter on a near-black plate — the
 *  prototype's near-black chassis would disappear there. */
export const TONES_ON_DARK: ScooterTones = {
  chassis: "#8C9A93",
  seat: "#4C5A53",
  deck: "#6B7A73",
  rim: "#E4EAE6",
};

/**
 * The scooter markup, as a bare SVG string in the 250×152 authoring grid.
 *
 * `body` tints the two panels (rear body + front shield) and the mudguard —
 * this is the caller's status/zone colour. `opts.monochrome` repaints every
 * part in one flat colour and drops the accents, which is what builds the halo.
 */
export function scooterGlyph(
  body: string,
  tones: ScooterTones = TONES_ON_LIGHT,
  opts: { bolt?: boolean; monochrome?: string } = {},
): string {
  const mono = opts.monochrome;
  const chassis = mono ?? tones.chassis;
  const seat = mono ?? tones.seat;
  const deck = mono ?? tones.deck;
  const rim = mono ?? tones.rim;
  const panel = mono ?? body;
  const bolt = !mono && opts.bolt !== false;

  return [
    // wheels
    `<circle cx="58" cy="118" r="23" fill="${chassis}"/>`,
    `<circle cx="58" cy="118" r="10" fill="${rim}"/>`,
    `<circle cx="58" cy="118" r="4" fill="${chassis}"/>`,
    `<circle cx="186" cy="118" r="23" fill="${chassis}"/>`,
    `<circle cx="186" cy="118" r="10" fill="${rim}"/>`,
    `<circle cx="186" cy="118" r="4" fill="${chassis}"/>`,
    // fork, stem, handlebar and grip
    `<path d="M171 40 186 118" stroke="${chassis}" stroke-width="7" stroke-linecap="round"/>`,
    `<path d="M158 31h26" stroke="${chassis}" stroke-width="7" stroke-linecap="round"/>`,
    `<path d="M151 31h9" stroke="${deck}" stroke-width="9" stroke-linecap="round"/>`,
    // floorboard
    `<path d="M104 98h54l4 10-60 2z" fill="${deck}"/>`,
    // rear body — tinted panel
    `<path d="M22 100c0-17 11-29 30-31h60c9 0 13 7 11 15l-6 20-77 3c-11 0-18-2-18-7z" fill="${panel}"/>`,
    mono
      ? ""
      : `<path d="M30 92c4-9 11-14 22-15h50" stroke="#fff" stroke-opacity=".28" stroke-width="4" stroke-linecap="round" fill="none"/>`,
    // seat
    `<path d="M42 62c0-6 6-9 15-9h47c9 0 11 6 9 11l-4 6H48c-4 0-6-4-6-8z" fill="${seat}"/>`,
    // front shield — tinted panel, with the headlamp
    `<path d="M146 104 165 44c2-7 13-8 16-1l4 9c-9 12-17 31-20 52z" fill="${panel}"/>`,
    `<circle cx="178" cy="50" r="5" fill="${mono ?? "#F2B544"}"/>`,
    // mudguard, then the tail light
    `<path d="M160 113c3-18 18-26 36-21" stroke="${panel}" stroke-width="7" stroke-linecap="round" fill="none"/>`,
    `<rect x="18" y="86" width="8" height="10" rx="3" fill="${mono ?? "#E5564B"}"/>`,
    // EV bolt on the rear panel
    bolt ? `<path d="M78 76 68 92h9l-3 11 12-17h-9l3-10z" fill="#fff" opacity=".9"/>` : "",
  ]
    .filter(Boolean)
    .join("");
}

/** Scale factor that renders the artwork `width` units wide. */
export function scooterScale(width: number): number {
  return width / 220;
}

/** Transform placing the glyph's centre on (x, y) at `width` units wide — for
 *  inline SVG, where the caller owns the coordinate system. */
export function scooterTransform(x: number, y: number, width: number): string {
  return `translate(${x} ${y}) scale(${scooterScale(width)}) translate(${-ART_CENTER.x} ${-ART_CENTER.y})`;
}

/**
 * A Google Maps marker icon for the fleet map: the scooter tinted `color`,
 * over a flat halo that reads as a white outline — or, when `selected`, a dark
 * ink outline instead, matching the highlight the old dot marker used.
 *
 * Returns the data URI plus its pixel size, so the caller can build the
 * `google.maps.Size` and anchor it without knowing the artwork's proportions.
 */
export function scooterMarkerIcon(
  color: string,
  { width, selected = false }: { width: number; selected?: boolean },
): { url: string; width: number; height: number } {
  const height = Math.round(width / ART_RATIO);
  const { x, y } = ART_CENTER;
  const haloScale = selected ? HALO_SCALE_SELECTED : HALO_SCALE;

  const halo =
    `<g transform="translate(${x} ${y}) scale(${haloScale}) translate(${-x} ${-y})">` +
    scooterGlyph(color, TONES_ON_LIGHT, { monochrome: selected ? "#1C1C1C" : "#FFFFFF" }) +
    `</g>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ART_VIEWBOX}" width="${width}" height="${height}">` +
    halo +
    scooterGlyph(color, TONES_ON_LIGHT, { bolt: true }) +
    `</svg>`;

  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, width, height };
}

/**
 * The same glyph as inline SVG, for the hand-drawn mini maps.
 *
 * `className` is forwarded to the wrapping `<g>` so the existing
 * `.marker__dot` hover rule keeps working.
 */
export function EvScooter({
  body,
  tones = TONES_ON_DARK,
  bolt = true,
  width,
  className,
}: {
  body: string;
  tones?: ScooterTones;
  bolt?: boolean;
  /** Rendered width in the parent SVG's user units. */
  width: number;
  className?: string;
}) {
  return (
    <g
      className={className}
      transform={scooterTransform(0, 0, width)}
      dangerouslySetInnerHTML={{ __html: scooterGlyph(body, tones, { bolt }) }}
    />
  );
}
