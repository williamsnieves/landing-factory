// Demo data of the /forms/ pages of the starter. The starter has no brief, so the values below are fixtures:
// a made-up holder, and an access key that is not a real Web3Forms key (all zeros). It is never used to send mail:
// the report treats the demo like any form, and a real landing takes its key from the brief.
import type { LeadFormConfig } from '../../components/forms/fields';
import type { LegalData } from '../../components/legal/texts';

/** Demo only. Not a real access key. */
export const DEMO_ACCESS_KEY = '00000000-0000-4000-8000-000000000000';

export const DEMO_BUSINESS = 'Demo Estates';
/** A fake number (reserved for fiction). */
export const DEMO_WHATSAPP = '+34 600 000 000';

export const DEMO_FORMS: LeadFormConfig[] = [
  {
    id: 'valuation',
    purpose: 'valuation',
    fields: ['name', 'email', 'phone', 'address', 'size', 'message'],
    provider: 'web3forms',
    accessKey: DEMO_ACCESS_KEY,
  },
  {
    id: 'callback',
    purpose: 'callback',
    fields: ['name', 'phone', 'preferredTime'],
    provider: 'whatsapp',
  },
];

/** The privacy policy of the demo: a fixture holder, rendered by the starter's legal components. */
export const DEMO_LEGAL: LegalData = {
  version: 1,
  language: 'en',
  business: { name: DEMO_BUSINESS, domain: '' },
  markets: ['EU'],
  pages: ['privacy'],
  unknownMarkets: [],
  holder: {
    name: 'Demo Estates (fixture, not a real company)',
    taxId: '',
    address: '',
    email: 'privacy@example.com',
    register: '',
  },
  privacyContact: 'privacy@example.com',
  processing: {
    analytics: 'none',
    forms: {
      provider: 'web3forms',
      providers: ['web3forms', 'whatsapp'],
      purposes: ['valuation', 'callback'],
      fields: [
        'name',
        'email',
        'phone',
        'address',
        'size',
        'message',
        'preferredTime',
      ],
    },
    embeds: [],
  },
  hosting: { target: 'cloudflare-pages', name: 'Cloudflare Pages' },
  thirdPartyHosts: [],
  pending: [],
  // The demo's privacy page lives under /forms/, so the consent boxes link there (see privacyPath in legal/texts.ts).
  defaultLocale: 'en',
  locales: [
    { locale: 'en', language: 'en', paths: { privacy: '/forms/privacy/' } },
  ],
};
