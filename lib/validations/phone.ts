import { z } from 'zod';

/**
 * Accepted Sri Lankan mobile formats:
 *   0711234567    — 10 digits, starts with 07
 *   +94711234567  — international prefix +94, followed by 9 digits (starts with 7)
 *   0094711234567 — international prefix 0094, followed by 9 digits (starts with 7)
 *
 * Only mobile numbers are accepted (07x prefix after stripping country code).
 * Fixed-line / non-mobile numbers are intentionally rejected.
 */
export const SL_MOBILE_REGEX = /^(?:0|(?:\+94)|(?:0094))7[0-9]{8}$/;

export const sriLankanMobileSchema = z
  .string()
  .trim()
  .regex(SL_MOBILE_REGEX, 'Enter a valid Sri Lankan mobile number (e.g. 0711234567 or +94711234567)');

/**
 * Normalise a Sri Lankan mobile number to the local 10-digit format 07XXXXXXXX.
 * Returns the original string if it doesn't match a known format.
 */
export function normaliseSLMobile(raw: string): string {
  const s = raw.trim();
  // +94711234567 → 0711234567
  if (/^\+947/.test(s)) return '0' + s.slice(3);
  // 0094711234567 → 0711234567
  if (/^00947/.test(s)) return '0' + s.slice(4);
  return s;
}
