// Report configuration: defaults and validation of the `report` section of qa.config.json.
// A site's own sites/<slug>/qa.config.json overrides the root file, as for QA.

export const REPORT_DEFAULTS = Object.freeze({
  // Performance measures that warn (never fail). Lighthouse scores below the QA thresholds do fail.
  maxPageKb: 1600,
  maxImageKb: 400,
  legacyImageKb: 100,
  lcpMs: 2500,
  cls: 0.1,
  tbtMs: 200,
  maxFontFiles: 6,
  maxThirdPartyOrigins: 3,
  imageSavingsKb: 20,
  renderBlockingMs: 500,
  audit: { ignore: [] },
  // Outbound link health (--external-links).
  externalLinks: { max: 50, gapMs: 250 },
  // Live checks (--url).
  live: { timeoutMs: 10000 },
  // SEO text limits in characters (the seo area warns outside them).
  seo: { titleMin: 30, titleMax: 60, descriptionMin: 70, descriptionMax: 160 },
  // Lead forms: the hosts a form that collects personal data may post to (the legal-forms item).
  forms: { providers: ['api.web3forms.com'] },
});

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const NUMBER_KEYS = [
  'maxPageKb',
  'maxImageKb',
  'legacyImageKb',
  'lcpMs',
  'cls',
  'tbtMs',
  'maxFontFiles',
  'maxThirdPartyOrigins',
  'imageSavingsKb',
  'renderBlockingMs',
];

/** Problems of a `report` section (empty array = valid). Unknown keys are errors. */
export function validateReportConfig(config) {
  const errors = [];
  const err = (path, message) => errors.push(`report.${path}: ${message}`);
  if (!isObject(config)) return ['report: must be an object'];
  const allowed = [
    ...NUMBER_KEYS,
    'audit',
    'externalLinks',
    'live',
    'seo',
    'forms',
  ];
  for (const key of Object.keys(config))
    if (!allowed.includes(key))
      err(key, `unknown key (allowed: ${allowed.join(', ')})`);
  for (const key of NUMBER_KEYS)
    if (typeof config[key] !== 'number' || !(config[key] >= 0))
      err(key, 'must be a number >= 0');

  if (!isObject(config.audit) || !Array.isArray(config.audit.ignore))
    err('audit.ignore', 'must be an array of { id, reason }');
  else
    config.audit.ignore.forEach((entry, index) => {
      if (!isObject(entry) || typeof entry.id !== 'string' || !entry.id.trim())
        err(
          `audit.ignore[${index}].id`,
          'must be an advisory id such as GHSA-xxxx',
        );
      else if (typeof entry.reason !== 'string' || !entry.reason.trim())
        err(
          `audit.ignore[${index}].reason`,
          `an ignored advisory (${entry.id}) needs a reason`,
        );
    });

  const links = config.externalLinks;
  if (!isObject(links)) err('externalLinks', 'must be an object');
  else {
    if (!Number.isInteger(links.max) || links.max < 1)
      err('externalLinks.max', 'must be an integer >= 1');
    if (!Number.isInteger(links.gapMs) || links.gapMs < 0)
      err('externalLinks.gapMs', 'must be an integer >= 0');
  }
  const live = config.live;
  if (!isObject(live)) err('live', 'must be an object');
  else if (!Number.isInteger(live.timeoutMs) || live.timeoutMs < 100)
    err('live.timeoutMs', 'must be an integer >= 100');
  const seo = config.seo;
  if (!isObject(seo)) err('seo', 'must be an object');
  else {
    const keys = ['titleMin', 'titleMax', 'descriptionMin', 'descriptionMax'];
    for (const key of Object.keys(seo))
      if (!keys.includes(key))
        err(`seo.${key}`, `unknown key (allowed: ${keys.join(', ')})`);
    for (const key of keys)
      if (!Number.isInteger(seo[key]) || seo[key] < 1)
        err(`seo.${key}`, 'must be an integer >= 1');
    if (seo.titleMin > seo.titleMax)
      err('seo.titleMin', 'must not be greater than seo.titleMax');
    if (seo.descriptionMin > seo.descriptionMax)
      err('seo.descriptionMin', 'must not be greater than seo.descriptionMax');
  }
  const forms = config.forms;
  if (!isObject(forms)) err('forms', 'must be an object');
  else {
    for (const key of Object.keys(forms))
      if (key !== 'providers')
        err(`forms.${key}`, 'unknown key (allowed: providers)');
    if (!Array.isArray(forms.providers))
      err('forms.providers', 'must be an array of host names');
    else
      forms.providers.forEach((host, index) => {
        if (
          typeof host !== 'string' ||
          !/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(
            host,
          )
        )
          err(
            `forms.providers[${index}]`,
            'must be a host name such as "api.web3forms.com" (no protocol, no path)',
          );
      });
  }
  return errors;
}

/** Defaults overlaid with the user's `report` section; throws one Error listing every problem. */
export function resolveReportConfig(user = {}) {
  if (!isObject(user))
    throw new Error('Invalid report config: must be an object');
  const merged = structuredClone(REPORT_DEFAULTS);
  for (const [key, value] of Object.entries(user))
    merged[key] =
      isObject(value) && isObject(merged[key])
        ? { ...merged[key], ...value }
        : value;
  const errors = validateReportConfig(merged);
  if (errors.length)
    throw new Error(`Invalid report config:\n  - ${errors.join('\n  - ')}`);
  return merged;
}
