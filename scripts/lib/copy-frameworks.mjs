// Catalog of copywriting frameworks and the deterministic scoring that picks one from a brief
// (openspec/changes/add-copy-frameworks/design.md, Decision 2). Shared by scripts/pick-copy-framework.mjs and the tests.
//
// A framework is a persuasion order: stages, what each stage says and which landing section can carry it.
// `awareness` is the ladder score of each visitor awareness level; `fits` and `avoid` are signals of the brief
// written as `<signal>:<value>` (kind, price, goal, proof, regulated, objections).
import {
  AWARENESS_LEVELS,
  getPath,
  isAssumed,
  isFilled,
} from './brief-schema.mjs';

export { AWARENESS_LEVELS };

/** Landing sections a stage can be carried by (closed vocabulary). */
export const SECTIONS = [
  'hero',
  'problem',
  'solution',
  'features',
  'how-it-works',
  'benefits',
  'proof',
  'about',
  'offer',
  'faq',
  'final-cta',
];

export const AWARENESS_DEFAULT = 'problem-aware';
export const HIGH_PRICE = 500;
export const LOW_PRICE = 50;

const stage = (id, name, says, sections) => ({ id, name, says, sections });

export const FRAMEWORKS = [
  {
    id: 'aida',
    name: 'AIDA',
    summary:
      'Attention, Interest, Desire, Action: the all-round order for a page that has to win a stranger and then ask.',
    stages: [
      stage(
        'attention',
        'Attention',
        'Stop the visitor with the one thing they care about: a headline and visual that name their situation or wish.',
        ['hero'],
      ),
      stage(
        'interest',
        'Interest',
        'Keep them reading by showing you understand their situation and how the offer works, in concrete detail.',
        ['problem', 'how-it-works', 'features'],
      ),
      stage(
        'desire',
        'Desire',
        'Make them want it: concrete benefits, real proof and a picture of life with the offer.',
        ['benefits', 'proof'],
      ),
      stage(
        'action',
        'Action',
        'One clear next step with the terms of the offer and a single call to action.',
        ['offer', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 1,
      'problem-aware': 2,
      'solution-aware': 2,
      'product-aware': 1,
      'most-aware': 1,
    },
    fits: ['goal:buy', 'goal:booking', 'kind:event', 'kind:product'],
    avoid: [],
    promiseLed: false,
    proofStage: 'desire',
    mistakes: [
      'A vague headline that could belong to any business.',
      'Stopping at desire and leaving the action buried.',
    ],
  },
  {
    id: 'pas',
    name: 'PAS',
    summary:
      'Problem, Agitate, Solution: name a pain the visitor already feels, make its cost clear, then offer the way out.',
    stages: [
      stage(
        'problem',
        'Problem',
        'Name the problem in the visitor own words so they recognise themselves.',
        ['hero', 'problem'],
      ),
      stage(
        'agitate',
        'Agitate',
        'Show what the problem costs them if it stays: time, money, stress. Stay factual, never frighten.',
        ['problem'],
      ),
      stage(
        'solution',
        'Solution',
        'Present the offer as the way out and say how it works and what to do next.',
        ['solution', 'how-it-works', 'offer', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 0,
      'problem-aware': 4,
      'solution-aware': 1,
      'product-aware': 0,
      'most-aware': 0,
    },
    fits: ['kind:service', 'goal:lead', 'goal:booking'],
    avoid: [],
    promiseLed: false,
    proofStage: null,
    mistakes: [
      'Agitating until the page feels manipulative.',
      'Inventing a pain the customer never described.',
    ],
  },
  {
    id: 'fab',
    name: 'FAB',
    summary:
      'Feature, Advantage, Benefit: turn each thing the offer has into what it does and what the buyer gains.',
    stages: [
      stage(
        'feature',
        'Feature',
        'State a plain fact about the offer: what it is, includes or does.',
        ['features'],
      ),
      stage(
        'advantage',
        'Advantage',
        'Say what that feature does better or differently than the alternatives.',
        ['features', 'how-it-works'],
      ),
      stage(
        'benefit',
        'Benefit',
        'Say what the buyer gets out of it in their own terms: time saved, a worry removed, a result they care about.',
        ['benefits', 'offer'],
      ),
    ],
    awareness: {
      unaware: 0,
      'problem-aware': 0,
      'solution-aware': 3,
      'product-aware': 4,
      'most-aware': 0,
    },
    fits: ['kind:product', 'goal:buy', 'price:low', 'price:mid'],
    avoid: ['kind:content'],
    promiseLed: false,
    proofStage: null,
    mistakes: [
      'Listing features and stopping before the benefit.',
      'Benefits that are really features reworded.',
    ],
  },
  {
    id: 'bab',
    name: 'BAB',
    summary:
      'Before, After, Bridge: show life with the problem, life without it, and the offer as the bridge between them.',
    stages: [
      stage(
        'before',
        'Before',
        'Describe the visitor present situation and its frustrations.',
        ['hero', 'problem'],
      ),
      stage(
        'after',
        'After',
        'Describe the situation once it is solved, in concrete everyday terms.',
        ['benefits'],
      ),
      stage(
        'bridge',
        'Bridge',
        'Present the offer as the way across: what it is, how it works, the next step.',
        ['solution', 'how-it-works', 'offer', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 0,
      'problem-aware': 1,
      'solution-aware': 4,
      'product-aware': 1,
      'most-aware': 0,
    },
    fits: ['kind:service', 'kind:content'],
    avoid: ['regulated:true'],
    promiseLed: true,
    proofStage: null,
    mistakes: [
      'An After that is an outcome promise nobody can back.',
      'A Bridge that is only a slogan.',
    ],
  },
  {
    id: '4p',
    name: '4P',
    summary:
      'Picture, Promise, Prove, Push: paint the situation, state what the offer delivers, back it, then ask.',
    stages: [
      stage(
        'picture',
        'Picture',
        'Paint a vivid scene of the visitor situation or the life they want.',
        ['hero', 'problem'],
      ),
      stage(
        'promise',
        'Promise',
        'Say what the offer delivers. Keep it to what the customer can stand behind.',
        ['solution', 'benefits'],
      ),
      stage(
        'prove',
        'Prove',
        'Back the promise with real proof: testimonials, figures, credentials, process.',
        ['proof', 'how-it-works'],
      ),
      stage(
        'push',
        'Push',
        'Ask for the action with a reason to act now that is true, and remove the last doubt.',
        ['offer', 'faq', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 0,
      'problem-aware': 0,
      'solution-aware': 2,
      'product-aware': 3,
      'most-aware': 1,
    },
    fits: [
      'price:high',
      'price:mid',
      'proof:real',
      'objections:present',
      'kind:product',
      'kind:service',
    ],
    avoid: ['regulated:true'],
    promiseLed: true,
    proofStage: 'prove',
    mistakes: [
      'A Promise the proof stage cannot back.',
      'Proof that is generic praise instead of specifics.',
    ],
  },
  {
    id: 'pastor',
    name: 'PASTOR',
    summary:
      'Problem, Amplify, Story and solution, Testimony, Offer, Response: the long order for a considered purchase.',
    stages: [
      stage(
        'problem',
        'Problem',
        'Name the problem and the person who has it.',
        ['hero', 'problem'],
      ),
      stage(
        'amplify',
        'Amplify',
        'Show the consequences of leaving it and what solving it would open up.',
        ['problem', 'benefits'],
      ),
      stage(
        'story',
        'Story and solution',
        'Tell how the solution came about and why it works.',
        ['about', 'solution', 'how-it-works'],
      ),
      stage(
        'testimony',
        'Testimony',
        'Show real people or facts that the solution worked, from the brief only.',
        ['proof'],
      ),
      stage(
        'offer',
        'Offer',
        'State exactly what is offered, at what price and under what terms.',
        ['offer'],
      ),
      stage(
        'response',
        'Response',
        'Tell the visitor what to do next and answer the last objections.',
        ['faq', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 1,
      'problem-aware': 3,
      'solution-aware': 1,
      'product-aware': 0,
      'most-aware': 0,
    },
    fits: [
      'price:high',
      'objections:present',
      'proof:real',
      'kind:service',
      'goal:lead',
      'goal:booking',
    ],
    avoid: ['price:low'],
    promiseLed: false,
    proofStage: 'testimony',
    mistakes: [
      'Too long for a cheap or simple offer.',
      'A Testimony stage filled with invented quotes.',
    ],
  },
  {
    id: 'quest',
    name: 'QUEST',
    summary:
      'Qualify, Understand, Educate, Stimulate, Transition: speak to the right visitor, show you get them, teach, then lead to action.',
    stages: [
      stage(
        'qualify',
        'Qualify',
        'Say who the page is for so the right visitor feels addressed and the wrong one leaves.',
        ['hero'],
      ),
      stage(
        'understand',
        'Understand',
        'Show you understand their situation and what they have tried.',
        ['problem'],
      ),
      stage(
        'educate',
        'Educate',
        'Teach what they need to know to choose well: how it works, what to look for, what to expect.',
        ['solution', 'how-it-works', 'faq'],
      ),
      stage(
        'stimulate',
        'Stimulate',
        'Raise the wish to act with benefits, proof and a clear picture of the result.',
        ['benefits', 'proof'],
      ),
      stage(
        'transition',
        'Transition',
        'Move them to the next step with the offer and one call to action.',
        ['offer', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 3,
      'problem-aware': 1,
      'solution-aware': 0,
      'product-aware': 0,
      'most-aware': 0,
    },
    fits: [
      'objections:present',
      'price:high',
      'kind:content',
      'kind:service',
      'goal:lead',
    ],
    avoid: [],
    promiseLed: false,
    proofStage: 'stimulate',
    mistakes: [
      'Educating at length with no path to the action.',
      'A Qualify stage so broad it excludes nobody.',
    ],
  },
  {
    id: 'acca',
    name: 'ACCA',
    summary:
      'Awareness, Comprehension, Conviction, Action: a lean order for a visitor who already knows the product.',
    stages: [
      stage(
        'awareness',
        'Awareness',
        'Make sure the visitor knows what this is and that it is for them.',
        ['hero'],
      ),
      stage(
        'comprehension',
        'Comprehension',
        'Explain what it is and how it works, simply.',
        ['features', 'how-it-works'],
      ),
      stage(
        'conviction',
        'Conviction',
        'Convince with proof, specifics and answers to doubts.',
        ['proof', 'benefits', 'faq'],
      ),
      stage('action', 'Action', 'Ask for the action with clear terms.', [
        'offer',
        'final-cta',
      ]),
    ],
    awareness: {
      unaware: 0,
      'problem-aware': 0,
      'solution-aware': 1,
      'product-aware': 2,
      'most-aware': 4,
    },
    fits: ['goal:buy', 'goal:booking', 'price:mid', 'price:high', 'proof:real'],
    avoid: [],
    promiseLed: false,
    proofStage: 'conviction',
    mistakes: [
      'Re-explaining the basics to a visitor who only needs the terms.',
      'Conviction without anything specific to point at.',
    ],
  },
  {
    id: 'story',
    name: 'Star, Story, Solution',
    summary:
      'Star, Story, Solution: introduce a character the visitor identifies with, tell what happened, then show the solution.',
    stages: [
      stage(
        'star',
        'Star',
        'Introduce the person the visitor will identify with: the customer, or the founder when the business is a person.',
        ['hero', 'about'],
      ),
      stage(
        'story',
        'Story',
        'Tell what happened to them: the struggle, the turning point, in specific detail that is true.',
        ['problem', 'about'],
      ),
      stage(
        'solution',
        'Solution',
        'Show how the offer solves it and what to do next.',
        ['solution', 'offer', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 4,
      'problem-aware': 1,
      'solution-aware': 0,
      'product-aware': 0,
      'most-aware': 0,
    },
    fits: ['kind:content', 'kind:other', 'kind:service', 'proof:real'],
    avoid: ['price:low'],
    promiseLed: false,
    proofStage: null,
    mistakes: [
      'An invented character presented as a real customer.',
      'A story with no solution at the end.',
    ],
  },
  {
    id: 'slap',
    name: 'SLAP',
    summary:
      'Stop, Look, Act, Purchase: the shortest order, for a simple low-risk offer and a visitor ready to decide.',
    stages: [
      stage('stop', 'Stop', 'Catch the eye with a bold, specific headline.', [
        'hero',
      ]),
      stage(
        'look',
        'Look',
        'Give one or two reasons to keep looking: the key benefit and what it is.',
        ['benefits', 'features'],
      ),
      stage(
        'act',
        'Act',
        'Make acting easy and clear: price, terms and the one button.',
        ['offer'],
      ),
      stage(
        'purchase',
        'Purchase',
        'Close with a last reassurance and the call to action again.',
        ['faq', 'final-cta'],
      ),
    ],
    awareness: {
      unaware: 0,
      'problem-aware': 0,
      'solution-aware': 0,
      'product-aware': 1,
      'most-aware': 3,
    },
    fits: ['price:low', 'goal:buy', 'kind:product', 'kind:event'],
    avoid: ['price:high', 'objections:present'],
    promiseLed: false,
    proofStage: null,
    mistakes: [
      'Using a one-screen order for a high-risk, high-price offer.',
      'Dropping the price and terms to keep it short.',
    ],
  },
];

/** The headline test of the skill (not a page framework): useful, urgent, unique, ultra-specific. */
export const HEADLINE_TEST = {
  id: '4u',
  name: '4U',
  criteria: [
    ['useful', 'Does it promise something the visitor wants?'],
    [
      'urgent',
      'Is there a real reason to read now? Only when the urgency is true.',
    ],
    [
      'unique',
      'Could a competitor print it unchanged? If so, it is not unique.',
    ],
    [
      'ultra-specific',
      'Does it carry a concrete detail: a number, a place, a time, a thing?',
    ],
  ],
};

/** Weight of a matched signal; the default is 1. */
const SIGNAL_WEIGHT = {
  'price:high': 2,
  'regulated:true': 2,
};
export const AWARENESS_WEIGHT = 1; // the ladder scores are already weighted

// --------------------------------------------------------------------------------------------------
// Signals from a brief

const fold = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** The first number of a price text ("29,99", "1.200", "desde 59 EUR"), or null. */
export function parsePrice(text) {
  const match = /\d[\d.,\s]*/.exec(String(text ?? ''));
  if (!match) return null;
  let digits = match[0].trim().replace(/\s+/g, '');
  const dot = digits.lastIndexOf('.');
  const comma = digits.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) {
    const decimal = dot > comma ? '.' : ',';
    digits = digits
      .split(decimal === '.' ? ',' : '.')
      .join('')
      .replace(decimal, '.');
  } else if (comma >= 0 || dot >= 0) {
    const sep = comma >= 0 ? ',' : '.';
    const parts = digits.split(sep);
    const last = parts[parts.length - 1];
    digits =
      parts.length > 2 || last.length === 3
        ? parts.join('')
        : `${parts[0]}.${last}`;
  }
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) ? value : null;
}

const priceClass = (value) =>
  value > HIGH_PRICE ? 'high' : value < LOW_PRICE ? 'low' : 'mid';

const BOOKING =
  /\b(book|booking|reserv\w*|appointment|schedule|calendly|cita|agenda\w*|turno)\b/;
const BUY =
  /\b(buy|purchase|checkout|cart|shop|store|order|pay|stripe|gumroad|etsy|compra\w*|tienda|pedir|pedido|carrito|pago)\b/;

/** `buy`, `booking` or `lead` from the primary call to action; `lead` when nothing says otherwise. */
export function goalOf(brief) {
  const primary = brief?.goal?.primary ?? {};
  const text = fold(`${primary.label ?? ''} ${primary.url ?? ''}`);
  if (BOOKING.test(text)) return 'booking';
  if (BUY.test(text)) return 'buy';
  return 'lead';
}

/**
 * Signals of a brief for the picker. Without a brief (null) every signal takes its default and `noBrief` is true.
 * `awarenessAssumed` is true when the brief does not state the awareness (or lists it in `assumed`).
 */
export function deriveSignals(brief) {
  const noBrief = !brief || typeof brief !== 'object';
  const b = noBrief ? {} : brief;
  const stated = String(b.audience?.awareness ?? '').trim();
  const awareness = AWARENESS_LEVELS.includes(stated)
    ? stated
    : AWARENESS_DEFAULT;
  const classes = (Array.isArray(b.offer) ? b.offer : [])
    .map((o) => parsePrice(o?.price))
    .filter((v) => v !== null)
    .map(priceClass);
  const distinct = [...new Set(classes)];
  const price = !distinct.length
    ? 'none'
    : distinct.length === 1
      ? distinct[0]
      : 'mixed';
  const kind = ['product', 'service', 'event', 'content', 'other'].includes(
    b.business?.kind,
  )
    ? b.business.kind
    : 'other';
  return {
    awareness,
    awarenessAssumed:
      noBrief ||
      !AWARENESS_LEVELS.includes(stated) ||
      isAssumed(b, 'audience.awareness'),
    kind,
    price,
    goal: noBrief ? 'lead' : goalOf(b),
    proof: Array.isArray(b.proof) && b.proof.some(isFilled) ? 'real' : 'none',
    regulated: b.legal?.regulated === true ? 'true' : 'false',
    objections: isFilled(getPath(b, 'audience.objections'))
      ? 'present'
      : 'absent',
    noBrief,
  };
}

/** The signals as `<signal>:<value>` strings (what `fits` and `avoid` are written in). */
export const signalStrings = (s) => [
  `kind:${s.kind}`,
  `price:${s.price}`,
  `goal:${s.goal}`,
  `proof:${s.proof}`,
  `regulated:${s.regulated}`,
  `objections:${s.objections}`,
];

// --------------------------------------------------------------------------------------------------
// Scoring

const round = (n) => Math.round(n * 100) / 100;

/** Rank every framework for the signals. Ties break by score (high first), then id. */
export function rankFrameworks(signals) {
  const present = new Set(signalStrings(signals));
  const ranked = FRAMEWORKS.map((f) => {
    let score = 0;
    const reasons = [];
    const notes = [];
    const ladder = f.awareness[signals.awareness] ?? 0;
    if (ladder) {
      score += ladder * AWARENESS_WEIGHT;
      reasons.push(
        `fits a ${signals.awareness} visitor (+${ladder})${signals.awarenessAssumed ? ' [awareness assumed]' : ''}`,
      );
    }
    for (const signal of f.fits)
      if (present.has(signal)) {
        const w = SIGNAL_WEIGHT[signal] ?? 1;
        score += w;
        reasons.push(`fits ${signal} (+${w})`);
      }
    for (const signal of f.avoid)
      if (present.has(signal)) {
        const w = SIGNAL_WEIGHT[signal] ?? 1;
        score -= w;
        reasons.push(`avoid ${signal} (-${w})`);
      }
    if (signals.regulated === 'true' && f.promiseLed)
      notes.push(
        `regulated niche: the "${f.stages.find((s) => /promise|after/.test(s.id))?.name}" stage describes the service and never an outcome`,
      );
    if (signals.proof === 'none' && f.proofStage) {
      const st = f.stages.find((s) => s.id === f.proofStage);
      notes.push(
        `no proof available: mark the "${st.name}" stage "no proof available" and fill it with process, guarantees the customer states or their own facts`,
      );
    }
    return {
      id: f.id,
      name: f.name,
      score: round(score),
      reasons,
      notes,
      stages: f.stages.map((s) => ({
        id: s.id,
        name: s.name,
        says: s.says,
        sections: s.sections,
      })),
    };
  });
  return ranked.sort(
    (a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
