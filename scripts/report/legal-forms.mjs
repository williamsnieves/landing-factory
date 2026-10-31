// The `legal-forms` item of the landing report (area legal): every <form> of the build that collects personal data
// needs a required consent checkbox that links the privacy page, posts only to a listed provider over https, and the
// privacy page must name that provider. Supports compliance; it is not legal advice.
// Design: openspec/changes/add-lead-forms/design.md, Decision 7.
import { classifyUrl, resolveLocal } from './dist-scan.mjs';
import { scanHtml } from './html.mjs';
import { htmlText } from './legal.mjs';
import { LEGAL_PATHS } from './legal-rules.mjs';
import { cap, makeItem } from './items.mjs';

/** Default allowed hosts of `report.forms.providers`. */
export const DEFAULT_FORM_PROVIDERS = ['api.web3forms.com'];

/** Fields that identify a person: an email or phone input, or a name, address or postcode control. */
const PERSONAL_NAME =
  /^(name|full-?name|first-?name|last-?name|given-name|family-name|email|e-mail|phone|tel|telephone|mobile|address|street-address|address-line\d|street|postcode|zip|postal-code)$/i;

const blank = (value) => typeof value !== 'string' || value.trim() === '';

/** The page text with comments, scripts and styles blanked but every newline kept, so offsets keep their line. */
function maskRaw(html) {
  const blankOut = (text) => text.replace(/[^\n]/g, ' ');
  return html
    .replace(/<!--[\s\S]*?-->/g, blankOut)
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, blankOut);
}

/** The name a privacy policy uses for a provider host: `api.web3forms.com` -> `web3forms`. */
export const providerBrand = (host) => {
  const parts = host.toLowerCase().split('.');
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
};

/** Forms of a page: { line, attrs, tags, labels } with the tags and labels inside each <form>. */
export function formsOf(page) {
  const masked = maskRaw(page.html);
  const forms = [];
  for (const match of masked.matchAll(/<form\b[\s\S]*?<\/form\s*>/gi)) {
    const block = match[0];
    const scan = scanHtml(block);
    const labels = [
      ...block.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label\s*>/gi),
    ].map((label) => ({
      attrs: scanHtml(`<label ${label[1]}>`).tags[0]?.attrs ?? {},
      inner: scanHtml(label[2]),
    }));
    forms.push({
      line: masked.slice(0, match.index).split('\n').length,
      attrs: scan.tags[0]?.attrs ?? {},
      tags: scan.tags,
      labels,
    });
  }
  return forms;
}

const typeOf = (tag) => (tag.attrs.type ?? 'text').toLowerCase();

/** Does the form collect personal data? */
export const collectsPersonalData = (form) =>
  form.tags.some((tag) => {
    if (!['input', 'textarea', 'select'].includes(tag.name)) return false;
    if (
      tag.name === 'input' &&
      ['hidden', 'checkbox', 'submit', 'button'].includes(typeOf(tag))
    )
      return false;
    return (
      ['email', 'tel'].includes(typeOf(tag)) ||
      PERSONAL_NAME.test(tag.attrs.name ?? '') ||
      PERSONAL_NAME.test(tag.attrs.autocomplete ?? '')
    );
  });

/** The hrefs inside the label of each required consent checkbox, or null when the form has no such checkbox. */
export function consentLinks(form) {
  const boxes = form.tags.filter(
    (tag) =>
      tag.name === 'input' &&
      typeOf(tag) === 'checkbox' &&
      'required' in tag.attrs &&
      (tag.attrs.name ?? '').toLowerCase() !== 'botcheck',
  );
  if (!boxes.length) return null;
  const hrefs = [];
  for (const box of boxes) {
    for (const label of form.labels) {
      const wraps = label.inner.tags.some(
        (tag) =>
          tag.name === 'input' &&
          typeOf(tag) === 'checkbox' &&
          'required' in tag.attrs &&
          (tag.attrs.id ?? tag.attrs.name) === (box.attrs.id ?? box.attrs.name),
      );
      const pointsAt = box.attrs.id && label.attrs.for === box.attrs.id;
      if (!wraps && !pointsAt) continue;
      for (const tag of label.inner.tags)
        if (tag.name === 'a' && !blank(tag.attrs.href))
          hrefs.push(tag.attrs.href);
    }
  }
  return hrefs;
}

/** Is this built page a privacy policy (data-legal-page="privacy" or a /privacy/ or /privacidad/ path)? */
function isPrivacyPage(page) {
  if (page.scan.tags.some((t) => t.attrs['data-legal-page'] === 'privacy'))
    return true;
  const path = page.path.replace(/\/+$/, '');
  return Object.entries(LEGAL_PATHS).some(
    ([suffix, kind]) => kind === 'privacy' && path.endsWith(suffix),
  );
}

/**
 * legal-forms.
 * @param {object} o
 * @param {object} o.model        loadDist() result
 * @param {string[]} o.providers  `report.forms.providers`: hosts a form may post to
 * @param {string} o.siteCommand  the generator command named in fixes
 */
export function formsLegalItem({ model, providers, siteCommand }) {
  const allowed = providers.map((host) => host.toLowerCase());
  const problems = [];
  const warnings = [];
  const passes = [];
  let formCount = 0;

  for (const page of model.pages) {
    for (const form of formsOf(page)) {
      formCount += 1;
      if (!collectsPersonalData(form)) continue;
      const at = `${page.path}:${form.line}`;
      const waProvider = form.attrs['data-form-provider'] === 'whatsapp';
      const action = form.attrs.action ?? '';
      const target = waProvider
        ? { type: 'skip' }
        : classifyUrl(model, action, page.path);
      const failures = [];

      // The provider: an https host from the list.
      let brand = waProvider ? 'whatsapp' : null;
      if (target.type === 'external') {
        const host = new URL(target.url).hostname.toLowerCase();
        brand = providerBrand(host);
        if (!allowed.includes(host))
          failures.push(
            `${at} posts to ${host}, which is not in report.forms.providers (${allowed.join(', ') || 'none'})`,
          );
        if (new URL(target.url).protocol !== 'https:')
          failures.push(`${at} posts over plain HTTP (${target.url})`);
        if (
          brand === 'web3forms' &&
          !form.tags.some(
            (tag) =>
              tag.name === 'input' &&
              (tag.attrs.name ?? '') === 'access_key' &&
              !blank(tag.attrs.value),
          )
        )
          failures.push(`${at} is a Web3Forms form without an access_key`);
      }

      // Consent: a required checkbox whose label links a privacy page that names the provider.
      const links = consentLinks(form);
      let privacyPage = null;
      if (links === null)
        failures.push(`${at} has no required consent checkbox`);
      else {
        for (const href of links) {
          const url = classifyUrl(model, href, page.path);
          if (url.type !== 'internal') continue;
          const file = resolveLocal(model, url.path);
          const found = model.pages.find((p) => p.file === file);
          if (found && isPrivacyPage(found)) {
            privacyPage = found;
            break;
          }
        }
        if (!privacyPage)
          failures.push(
            `${at} has a consent checkbox, but its label does not link a privacy page of this site`,
          );
      }
      if (privacyPage && brand) {
        const text = htmlText(privacyPage.html).toLowerCase();
        if (!text.includes(brand))
          failures.push(
            `${at} posts to ${brand}, but the privacy policy (${privacyPage.path}) does not name it`,
          );
      }

      if (form.attrs['data-form-fallback'])
        warnings.push(
          `${at} falls back to WhatsApp: the ${form.attrs['data-form-fallback']} form has no access key yet`,
        );
      if (failures.length) problems.push(...failures);
      else passes.push(at);
    }
  }

  if (!formCount)
    return makeItem({
      id: 'legal-forms',
      area: 'legal',
      status: 'na',
      title: 'Not applicable: the pages have no forms',
    });
  if (!problems.length && !warnings.length && !passes.length)
    return makeItem({
      id: 'legal-forms',
      area: 'legal',
      status: 'na',
      title: `Not applicable: ${formCount} form(s), none collects personal data`,
    });
  if (problems.length)
    return makeItem({
      id: 'legal-forms',
      area: 'legal',
      status: 'fail',
      title: `${problems.length} problem(s) in forms that collect personal data`,
      evidence: cap([...problems, ...warnings]),
      fix: `Render the form with <LeadForm />: a required consent checkbox that links the privacy policy, posts to a provider in report.forms.providers over https, and a privacy policy that names the provider (\`${siteCommand}\` writes it from the brief's forms). A Web3Forms form needs its access key. Not legal advice.`,
    });
  if (warnings.length)
    return makeItem({
      id: 'legal-forms',
      area: 'legal',
      status: 'warn',
      title: `${warnings.length} form(s) fall back to WhatsApp; ${passes.length} other form(s) in order`,
      evidence: cap(warnings),
      fix: "Put the customer's Web3Forms access key in the brief (forms[].accessKey), run the legal generator and rebuild; until then the form opens a prefilled WhatsApp message and sends nothing to a form service.",
    });
  return makeItem({
    id: 'legal-forms',
    area: 'legal',
    status: 'pass',
    title: `${passes.length} form(s) with personal data: consent checkbox linking the privacy policy, allowed provider over https, provider named in the policy`,
    evidence: cap(passes),
  });
}
