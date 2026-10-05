// Normalises an Indian mobile number to its 10-digit national form.
// Accepts "98765 43210", "+91 98765 43210", "919876543210" and "09876543210".
// Returns null when the value is not a valid Indian mobile number.
export function normalizeIndianMobile(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  let national = digits;
  if (digits.length === 12 && digits.startsWith('91')) national = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) national = digits.slice(1);
  return /^[6-9]\d{9}$/.test(national) ? national : null;
}
