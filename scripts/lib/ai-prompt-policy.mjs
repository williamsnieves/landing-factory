// Prompt policy of AI-generated images (design: openspec/changes/add-ai-images/design.md, Decision 3).
//
// AI images are for illustration: abstract art, textures, generic objects and scenes. They never pose as
// real photos of the business, its people or its products. The policy is a best-effort lexical filter in
// English and Spanish: it checks a prompt against the brief and a short list of words, case-insensitively,
// ignoring accents, on word boundaries. It has no override: a prompt that is refused by mistake is reworded,
// and a real exception is a person editing assets.json by hand (check-landing still verifies the entry).

/** Lowercase, accents removed, anything but letters and digits collapsed to single spaces. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const MIN_NAME_LENGTH = 4;

/** Rules: id, reason and patterns matched against the normalized prompt (accents removed, lowercase). */
export const RULES = [
  {
    id: 'people',
    reason:
      'AI images must not show the business’s team, staff, customers, founder or testimonials: they would pass as real people',
    patterns: [
      /\bteams?\b/,
      /\bequipos?\b/,
      /\bstaff\b/,
      /\bemployees?\b/,
      /\bempleados?\b/,
      /\bempleadas?\b/,
      /\bpersonal (?:de|del)\b/,
      /\b(?:nuestro|nuestra|el) personal\b/,
      /\bcustomers?\b/,
      /\bclientes?\b/,
      /\b(?:our|my|your|the) clients?\b/,
      /\bclients? of\b/,
      /\bfounders?\b/,
      /\bfundador(?:a|es|as)?\b/,
      /\bceo\b/,
      /\bowners?\b/,
      /\bdueno\b/,
      /\bduena\b/,
      /\bduenos\b/,
      /\btestimonials?\b/,
      /\btestimonios?\b/,
      /\breviews?\b/,
      /\bresenas?\b/,
    ],
  },
  {
    id: 'identity',
    reason:
      'AI images must not draw the business’s logo, brand mark or packaging: use the customer’s own files',
    patterns: [
      /\blogos?\b/,
      /\blogotipos?\b/,
      /\bisotipos?\b/,
      /\bbrand ?marks?\b/,
      /\bmarca (?:de la empresa|corporativa|registrada|de nuestr)/,
      /\bpackaging (?:of|de) (?:our|nuestr)/,
      /\bempaque de nuestr/,
    ],
  },
  {
    id: 'results',
    reason:
      'AI images must not show results or before and after: they would pose as real outcomes',
    patterns: [
      /\bbefore and after\b/,
      /\bbefore after\b/,
      /\bantes y despues\b/,
      /\bantes despues\b/,
      /\bresults? of\b/,
      /\bresultados? de\b/,
    ],
  },
];

/** "portrait of Albert Einstein": a portrait or photo of two capitalized words. Matched on the original text. */
const NAMED_PERSON =
  /\b(?:[Pp]ortrait|[Pp]hoto(?:graph)?|[Pp]icture|[Hh]eadshot|[Rr]etrato|[Ff]oto(?:graf[ií]a)?)\s+(?:of|de)\s+[A-ZÀ-Ý][\p{L}'’.-]+\s+[A-ZÀ-Ý][\p{L}'’.-]+/u;
const FAMOUS = [
  /\bcelebrit(?:y|ies)\b/,
  /\bcelebridad(?:es)?\b/,
  /\bfamous (?:person|people|actor|actress|singer)\b/,
  /\bfamos[oa]s?\b/,
  /\blook ?alikes?\b/,
  /\blikeness of\b/,
];

const find = (patterns, text) => {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return null;
};

/** The names of the business and its products in the brief, normalized, at least 4 characters. */
export function brandNames(brief) {
  const names = [
    brief?.business?.name,
    ...(brief?.offer ?? []).map((o) => o?.name),
  ];
  return [
    ...new Set(
      names
        .filter((name) => typeof name === 'string')
        .map((name) => ({ raw: name.trim(), normal: normalize(name) }))
        .filter(({ normal }) => normal.length >= MIN_NAME_LENGTH)
        .map(({ raw, normal }) => `${normal}\u0000${raw}`),
    ),
  ].map((pair) => {
    const [normal, raw] = pair.split('\u0000');
    return { normal, raw };
  });
}

/**
 * Check a prompt. Returns [{ rule, reason, match }]; empty means the prompt is allowed.
 * `brief` is the parsed brief.json, or null/undefined for a site without one (the brand rule then has nothing to match).
 */
export function checkPrompt(prompt, brief = null) {
  const text = String(prompt ?? '');
  const normal = ` ${normalize(text)} `;
  const violations = [];

  for (const { normal: name, raw } of brandNames(brief)) {
    if (normal.includes(` ${name} `))
      violations.push({
        rule: 'brand',
        reason: `the prompt names the business or one of its products ("${raw}"): an AI image would pass as a picture of it`,
        match: raw,
      });
  }
  for (const rule of RULES) {
    const match = find(rule.patterns, normal);
    if (match)
      violations.push({
        rule: rule.id,
        reason: rule.reason,
        match: match.trim(),
      });
  }
  const person = NAMED_PERSON.exec(text);
  const famous = find(FAMOUS, normal);
  if (person || famous)
    violations.push({
      rule: 'real-person',
      reason:
        'AI images must not depict a real, named or famous person: they would pass as a photo of them',
      match: (person ? person[0] : famous).trim(),
    });
  return violations;
}

/** One line per violation, for the CLI and the final check. */
export const formatViolations = (violations) =>
  violations.map((v) => `[${v.rule}] "${v.match}": ${v.reason}`).join('; ');
