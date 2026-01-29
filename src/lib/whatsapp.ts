/**
 * WhatsApp helpers for Mozambique.
 *
 * Normalization rules:
 * - Remove spaces, dashes, parentheses and "+" (keeps only digits)
 * - Accept either "258XXXXXXXXX" (12 digits) or "XXXXXXXXX" (9 digits)
 * - If 9 digits, prefix with "258"
 * - Final format: "258XXXXXXXXX" (12 digits)
 */

export function normalizeMozWhatsapp(raw: string): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Common user inputs: 0XXXXXXXXX or 2580XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 13 && digits.startsWith('2580')) {
    digits = `258${digits.slice(4)}`;
  }

  let normalized = digits;
  if (digits.length === 9) {
    normalized = `258${digits}`;
  }

  if (normalized.length !== 12 || !normalized.startsWith('258')) return null;
  if (!/^258\d{9}$/.test(normalized)) return null;

  return normalized;
}

/**
 * Opens WhatsApp chat directly via wa.me (no share sheet / intents).
 * Returns true if it attempted to open WhatsApp, false if the phone is invalid.
 */
export function openWhatsApp(phone: string, message: string): boolean {
  const normalized = normalizeMozWhatsapp(phone);
  if (!normalized) return false;

  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
