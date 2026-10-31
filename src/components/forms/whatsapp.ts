// The WhatsApp provider: builds a https://wa.me/<digits>?text=<message> link from what the visitor typed. Nothing is
// sent to any server of ours or of a form service; the visitor sends the message from WhatsApp itself.

/**
 * The digits of a WhatsApp number from a phone number ("+34 600 123 456") or a wa.me / api.whatsapp.com link.
 * Returns '' when there is no usable number (7 to 15 digits).
 */
export function whatsappDigits(input: string): string {
  let raw = (input ?? '').trim();
  try {
    const url = new URL(raw);
    if (url.hostname === 'wa.me') raw = url.pathname;
    else if (url.hostname.endsWith('whatsapp.com'))
      raw = url.searchParams.get('phone') ?? '';
  } catch {
    // not a URL: a plain phone number
  }
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? digits : '';
}

/** `https://wa.me/<digits>` with an optional prefilled text. */
export function whatsappUrl(number: string, text = ''): string {
  const digits = whatsappDigits(number);
  if (!digits) throw new Error(`Not a WhatsApp number: "${number}"`);
  const base = `https://wa.me/${digits}`;
  return text.trim() ? `${base}?text=${encodeURIComponent(text.trim())}` : base;
}

/** The message: the greeting, then one "Label: value" line per filled field. */
export function whatsappMessage(
  greeting: string,
  lines: { label: string; value: string }[],
): string {
  const filled = lines
    .map(({ label, value }) => ({ label, value: value.trim() }))
    .filter(({ value }) => value !== '')
    .map(({ label, value }) => `${label}: ${value}`);
  return [greeting, ...filled].join('\n');
}
