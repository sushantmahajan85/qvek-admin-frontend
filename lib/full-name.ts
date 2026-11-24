export const FULL_NAME_MIN = 3;
export const FULL_NAME_MAX = 50;

export const FULL_NAME_ERROR = 'Please enter a valid full name.';
export const FULL_NAME_SHORT_ERROR = 'Enter the full name (first and last name).';
export const FULL_NAME_LONG_ERROR = 'Full name must be 50 characters or fewer.';
export const FULL_NAME_LETTERS_ERROR = 'Please enter a valid full name (letters only).';

/** Letters with optional single separators (space, dot, hyphen, apostrophe). */
export const FULL_NAME_RE = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;

/** Gibberish fingerprints that never occur in real names. */
const GIBBERISH_SUBSTRINGS = [
  'asdf',
  'qwer',
  'zxcv',
  'abcd',
  'efgh',
  'ijkl',
  'mnop',
  'qwerty',
  'test',
];

function hasGibberishFingerprint(word: string): boolean {
  // 3+ identical letters in a row ("Vvv", "aaaa").
  if (/(.)\1\1/i.test(word)) return true;
  // 4+ consonants in a row ("bcdfg", "qwrty") — no real name does this.
  if (/[^aeiou]{4,}/i.test(word.toLowerCase())) return true;
  // Keyboard walks / alphabet runs / placeholder text.
  const w = word.toLowerCase();
  if (GIBBERISH_SUBSTRINGS.some((s) => w.includes(s))) return true;
  return false;
}

export function isFullName(value: string): boolean {
  const v = value.trim().replace(/\s+/g, ' ');
  if (v.length < FULL_NAME_MIN || v.length > FULL_NAME_MAX) return false;
  if (!FULL_NAME_RE.test(v)) return false;
  const parts = v.split(' ');
  if (parts.length < 2) return false;
  if (parts.some((p) => p.replace(/[^A-Za-z]/g, '').length < 2)) return false;
  for (const part of parts) {
    const letters = part.replace(/[^A-Za-z]/g, '');
    if (!/[aeiouAEIOU]/.test(letters)) return false;
    if (hasGibberishFingerprint(letters)) return false;
  }
  return true;
}

export function fullNameError(value: string): string | null {
  const v = value.trim().replace(/\s+/g, ' ');
  if (v.length < FULL_NAME_MIN) return FULL_NAME_SHORT_ERROR;
  if (v.length > FULL_NAME_MAX) return FULL_NAME_LONG_ERROR;
  if (!FULL_NAME_RE.test(v)) return FULL_NAME_LETTERS_ERROR;
  if (!isFullName(v)) return FULL_NAME_ERROR;
  return null;
}

export function sanitizeFullNameInput(raw: string, max = FULL_NAME_MAX): string {
  return raw.replace(/[^A-Za-z .'-]/g, '').slice(0, max);
}
