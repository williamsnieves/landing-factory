// Texts of the prospect notice (design: openspec/changes/add-prospect-landings/design.md, Decision 3).
// A language without an entry here shows the English text. Add a language by adding an entry.
const NOTICES: Record<string, (business: string) => string> = {
  en: (business) =>
    `Design proposal prepared for ${business}. This is not its official website.`,
  es: (business) =>
    `Propuesta de diseño preparada para ${business}. No es su web oficial.`,
};

/** The notice in the language of `locale` (a tag such as `es` or `en-GB`), English as the fallback. */
export function prospectNotice(business: string, locale?: string): string {
  const base = (locale ?? 'en').toLowerCase().split('-')[0] ?? 'en';
  return (NOTICES[base] ?? NOTICES.en)(business);
}
