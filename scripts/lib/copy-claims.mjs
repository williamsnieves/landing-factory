// Wording that must never ship, and wording a person should look at (add-copy-frameworks, design Decision 4).
// The `copy-claims` rule of scripts/check-landing.mjs scans the visible text of every built page with these
// patterns, in Spanish and English. It judges wording, not truth: a person decides whether a claim is true.
//
// Patterns are written against FOLDED text (lowercase, accents removed, `ñ` as `n`, curly quotes straight), so
// they are accent-tolerant by construction: `garantía` and `garantia` both reach the pattern as `garantia`.
// Every pattern is a whole phrase, never a single word. A `fail` pattern has `terms`: when the brief's own,
// non-assumed text contains one of them, the page may state the claim (the customer made it) and the rule only
// asks a person to confirm it.

/** Fail and warn ids, in report order. */
export const FAIL_IDS = [
  'guaranteed-result',
  'result-in-time',
  'absolute-superlative',
  'health-promise',
  'money-promise',
];
export const WARN_IDS = [
  'unsourced-stat',
  'study-claim',
  'round-number',
  'urgency',
];
export const COVERED_LANGUAGES = ['es', 'en'];
export const PHRASE_MAX = 80;

/** Fold one string: lowercase, accents removed, curly quotes straight. Same length as the NFC input. */
export function foldText(text) {
  return Array.from(String(text).normalize('NFC'))
    .map((ch) => {
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      const folded = (base || ch).toLowerCase();
      if (/[‘’]/.test(folded)) return "'";
      if (/[“”]/.test(folded)) return '"';
      return folded.length === 1 ? folded : ch;
    })
    .join('');
}

const NUM_WORD = String.raw`(?:\d+|a|an|one|two|three|four|five|six|seven|ten|fourteen|thirty|un|una|dos|tres|cuatro|cinco|seis|siete|diez|quince|treinta)`;
const MONEY = String.raw`(?:[$€£]\s?\d[\d.,]*\s?[km]?\b|\d[\d.,]*\s?(?:€|eur\b|euros?|usd\b|dollars?|dolares|\$|£))`;
const PERIOD = String.raw`(?:\s*(?:\/|per|a|an|each|al|por|cada)\s*(?:hour|day|week|month|year|sale|hora|dia|semana|mes|ano|venta))?`;

const p = (id, level, lang, re, reason, extra = {}) => ({
  id,
  level,
  lang,
  re,
  reason,
  ...extra,
});
const rx = (source) => new RegExp(source, 'gi');

/** Every pattern. `re` has the `g` flag; `terms` and `unless` are folded text. */
export const CLAIM_PATTERNS = [
  // --- guaranteed-result (fail) ----------------------------------------------------------------------
  p(
    'guaranteed-result',
    'fail',
    'en',
    rx(
      String.raw`\b(?:guaranteed|guaranteeing|we\s+guarantee)\s+(?:the\s+|your\s+)?(?:results?|success|outcomes?|growth|rankings?|sales|traffic|leads|clients|customers)\b`,
    ),
    'a guaranteed result is a promise the page cannot back; describe what the service does instead',
    { terms: ['guaranteed results', 'results guaranteed', 'we guarantee'] },
  ),
  p(
    'guaranteed-result',
    'fail',
    'en',
    rx(
      String.raw`\b(?:results?|success|outcomes?)\s+(?:is\s+|are\s+)?guaranteed\b`,
    ),
    'a guaranteed result is a promise the page cannot back; describe what the service does instead',
    { terms: ['guaranteed results', 'results guaranteed', 'we guarantee'] },
  ),
  p(
    'guaranteed-result',
    'fail',
    'en',
    rx(
      String.raw`\b(?:100\s?%\s+)?(?:satisfaction|money[- ]back)\s+guarantee[d]?\b|\bsatisfaction\s+guaranteed\b|\bor\s+your\s+money\s+back\b`,
    ),
    'a satisfaction or money-back guarantee is a promise only the business can make; it must be in the brief in the customer own words',
    {
      terms: [
        'money back',
        'money-back',
        'refund',
        'satisfaction',
        'reimburse',
      ],
    },
  ),
  p(
    'guaranteed-result',
    'fail',
    'es',
    rx(
      String.raw`\b(?:resultados?|exito|ventas|clientes|crecimiento|posicionamiento)\s+garantizad[oa]s?\b|\b(?:garantizamos|aseguramos)\s+(?:los\s+|el\s+|tus?\s+|sus?\s+)?(?:resultados?|exito|ventas|clientes|crecimiento)\b`,
    ),
    'un resultado garantizado es una promesa que la pagina no puede respaldar; describe lo que hace el servicio',
    {
      terms: [
        'resultados garantizados',
        'resultado garantizado',
        'garantizamos',
        'aseguramos',
      ],
    },
  ),
  p(
    'guaranteed-result',
    'fail',
    'es',
    rx(
      String.raw`\bsatisfaccion\s+(?:100\s?%\s+)?garantizada\b|\bgarantia\s+(?:total\s+)?de\s+(?:devolucion|reembolso|satisfaccion)\b|\bdevolucion\s+(?:del\s+)?(?:100\s?%\s+)?(?:del\s+)?dinero\b|\bo\s+te\s+devolvemos\s+(?:tu|el)\s+dinero\b`,
    ),
    'una garantia de satisfaccion o devolucion solo puede darla el negocio; debe estar en el brief con las palabras del cliente',
    { terms: ['devolucion', 'devolvemos', 'reembolso', 'satisfaccion'] },
  ),

  // --- result-in-time (fail) -------------------------------------------------------------------------
  p(
    'result-in-time',
    'fail',
    'en',
    rx(
      String.raw`\b(?:results?|see\s+results|visible\s+results|noticeable\s+results|real\s+results)\s+(?:in|within|after)\s+(?:just\s+|only\s+)?${NUM_WORD}(?:\s*[-–]\s*\d+)?\s*(?:hours?|days?|weeks?)\b|\b(?:lose|drop|shed)\s+\d+\s*(?:kg|kilos?|lbs?|pounds)\s+in\s+(?:just\s+)?\d+\s+(?:days?|weeks?)\b`,
    ),
    'a result promised within a time span cannot be backed for every customer; describe the process and its real duration',
    { terms: ['results in', 'results within', 'results after'] },
  ),
  p(
    'result-in-time',
    'fail',
    'es',
    rx(
      String.raw`\bresultados?\s+(?:(?:visibles?|reales|rapidos?|garantizados?)\s+)*(?:en|en\s+solo|en\s+apenas|en\s+tan\s+solo|tras|despues\s+de)\s+(?:solo\s+|apenas\s+|tan\s+solo\s+)?${NUM_WORD}(?:\s*(?:-|a)\s*\d+)?\s*(?:horas?|dias?|semanas?)\b|\b(?:pierde|perdera|adelgaza|baja)\s+\d+\s*(?:kg|kilos?)\s+en\s+(?:solo\s+)?\d+\s+(?:dias|semanas)\b`,
    ),
    'un resultado prometido en un plazo no puede respaldarse para todos los clientes; describe el proceso y su duracion real',
    { terms: ['resultados en', 'resultados tras', 'resultados despues'] },
  ),

  // --- absolute-superlative (fail) -------------------------------------------------------------------
  p(
    'absolute-superlative',
    'fail',
    'en',
    rx(
      String.raw`\b(?:the\s+)?(?:best|greatest|finest)\s+(?:\w+\s+){0,3}?(?:in|of)\s+the\s+(?:world|country|universe|industry|market)\b|\bworld'?s\s+(?:best|greatest|finest|leading)\b|\b(?:number|no\.?|#)\s?(?:one|1)\s+(?:in|choice|rated|provider|brand|company|agency|ranked|selling)\b|\bsecond\s+to\s+none\b|\bunrivall?ed\b`,
    ),
    'an absolute superlative needs proof the page does not give; say what is specific and true instead',
    {
      terms: ['best in the world', 'number one', 'number 1', 'second to none'],
    },
  ),
  p(
    'absolute-superlative',
    'fail',
    'es',
    rx(
      String.raw`\b(?:el\s+|la\s+|los\s+|las\s+)?(?:mejor|mejores)\s+(?:\w+\s+){0,3}?(?:del|en\s+el|de\s+la|en\s+la)\s+(?:mundo|pais|mercado|sector|industria|universo)\b|\b(?:numero\s+(?:uno|1)|n[o°]\.?\s?1)\s+(?:en|del|entre|para)\b|\bsin\s+competencia\b|\binigualable\b`,
    ),
    'un superlativo absoluto necesita una prueba que la pagina no da; di algo concreto y verdadero',
    {
      terms: ['mejor del mundo', 'numero uno', 'numero 1', 'sin competencia'],
    },
  ),

  // --- health-promise (fail) -------------------------------------------------------------------------
  p(
    'health-promise',
    'fail',
    'en',
    rx(
      String.raw`\b(?:cures?|cured|heals?)\s+(?:your\s+|all\s+|any\s+)?(?:pain|disease|illness|cancer|diabetes|anxiety|depression|acne|arthritis|insomnia|back\s+pain|migraines?|allergies|infections?|hair\s+loss)\b|\bno\s+side[- ]effects?\b|\bwithout\s+(?:any\s+)?side[- ]effects?\b|\b(?:miracle|permanent)\s+(?:cure|treatment|remedy)\b|\b100\s?%\s+(?:safe|harmless)\b`,
    ),
    'a health promise must come from a professional with evidence; describe the service and refer to the professional',
    { terms: ['no side effects', 'without side effects', 'cures'] },
  ),
  p(
    'health-promise',
    'fail',
    'es',
    rx(
      String.raw`\b(?:cura|curan|curamos|elimina|eliminamos|sana|sanamos)\s+(?:definitivamente\s+|por\s+completo\s+)?(?:el\s+|la\s+|tu\s+|tus\s+|los\s+|las\s+)?(?:dolor|cancer|diabetes|ansiedad|depresion|acne|artritis|insomnio|migranas?|alergias?|enfermedad(?:es)?|infecciones?|calvicie)\b|\bsin\s+(?:ningun\s+)?efectos?\s+(?:secundarios?|adversos?|colaterales)\b|\b(?:cura|curacion|tratamiento|remedio)\s+(?:definitiv[oa]|milagros[oa]|garantizad[oa])\b|\b100\s?%\s+(?:seguro|inocuo)\b`,
    ),
    'una promesa de salud debe venir de un profesional con evidencia; describe el servicio y remite al profesional',
    { terms: ['sin efectos secundarios', 'sin efectos adversos', 'curamos'] },
  ),

  // --- money-promise (fail) --------------------------------------------------------------------------
  p(
    'money-promise',
    'fail',
    'en',
    rx(
      String.raw`\b(?:earn|make)\s+(?:up\s+to\s+|over\s+|more\s+than\s+)?${MONEY}${PERIOD}|\bguaranteed\s+(?:income|returns?|profits?|earnings|revenue|roi|salary)\b|\b(?:double|triple)\s+your\s+(?:money|income|investment|revenue|profits?)\b|\b(?:get\s+rich\s+quick|financial\s+freedom)\b`,
    ),
    'a promise of earnings or returns cannot be backed; describe the offer and its price instead',
    { terms: ['guaranteed income', 'guaranteed returns', 'you will earn'] },
  ),
  p(
    'money-promise',
    'fail',
    'es',
    rx(
      String.raw`\b(?:gana|ganar|ganaras|ganamos|genera|generar|generaras|factura|facturaras)\s+(?:hasta\s+|mas\s+de\s+|desde\s+)?${MONEY}${PERIOD}|\b(?:ingresos?|ganancias?|beneficios?|rentabilidad|retornos?|dinero)\s+(?:extra\s+)?(?:garantizad[oa]s?|asegurad[oa]s?)\b|\b(?:duplica|triplica)\s+(?:tus?\s+)?(?:ingresos|dinero|inversion|beneficios|facturacion)\b|\blibertad\s+financiera\b|\bhazte\s+rico\b`,
    ),
    'una promesa de ingresos o rentabilidad no puede respaldarse; describe la oferta y su precio',
    {
      terms: ['ingresos garantizados', 'rentabilidad garantizada', 'ganaras'],
    },
  ),

  // --- unsourced-stat (warn) -------------------------------------------------------------------------
  p(
    'unsourced-stat',
    'warn',
    'en',
    rx(
      String.raw`(?<![\d.,])\d{1,3}(?:[.,]\d+)?\s?%|\b\d+x\s+(?:more|faster|better|cheaper|higher|lower)\b|\b\d+(?:[.,]\d+)?\s+times\s+(?:more|faster|better|cheaper|higher|lower)\b`,
    ),
    'a percentage or multiplier needs a named source on the page or in the brief',
    {
      unless: /\b(?:source|according\s+to|vat|tax|incl\.?|included)\b|https?:/,
    },
  ),
  p(
    'unsourced-stat',
    'warn',
    'es',
    rx(
      String.raw`(?<![\d.,])\d{1,3}(?:[.,]\d+)?\s?%|\b\d+x\s+(?:mas|mejor|rapido|barato)\b|\b\d+(?:[.,]\d+)?\s+veces\s+(?:mas|mejor|menos|rapid\w*|barat\w*)\b`,
    ),
    'un porcentaje o multiplicador necesita una fuente con nombre en la pagina o en el brief',
    { unless: /\b(?:fuente|segun|iva|impuestos?|incl\.?|incluido)\b|https?:/ },
  ),

  // --- study-claim (warn) ----------------------------------------------------------------------------
  p(
    'study-claim',
    'warn',
    'en',
    rx(
      String.raw`\b(?:studies|research|surveys?|experts|scientists|doctors)\s+(?:show|shows|prove|proves|have\s+shown|say|confirm)\b|\b(?:scientifically|clinically)\s+(?:proven|tested|shown)\b`,
    ),
    'name the study or its source, or remove the claim',
    { unless: /\b(?:university|journal|doi|source|et\s+al)\b|https?:/ },
  ),
  p(
    'study-claim',
    'warn',
    'es',
    rx(
      String.raw`\b(?:estudios|investigaciones|encuestas|expertos|cientificos|medicos)\s+(?:demuestran|muestran|prueban|confirman|dicen|indican|han\s+demostrado)\b|\b(?:cientifica|clinicamente)\s+(?:probado|comprobado|demostrado)\b|\b(?:cientificamente|clinicamente)\s+(?:probado|comprobado|demostrado)\b`,
    ),
    'nombra el estudio o su fuente, o quita la afirmacion',
    { unless: /\b(?:universidad|revista|doi|fuente)\b|https?:/ },
  ),

  // --- round-number (warn) ---------------------------------------------------------------------------
  p(
    'round-number',
    'warn',
    'any',
    rx(
      String.raw`(?<![\d.,$€£])\+\s?\d[\d.,]*\d(?![\d.,]*\s?(?:€|eur\b|usd\b|\$|£))|(?<![\d.,$€£+])\d{1,3}(?:[.,]000)+\+?(?![\d.,]*\s?(?:€|eur\b|euros?|usd\b|\$|£))(?!\d)`,
    ),
    'a large round number looks invented unless it is a real, current figure; use the exact figure or remove it',
    { roundOnly: true },
  ),

  // --- urgency (warn) --------------------------------------------------------------------------------
  p(
    'urgency',
    'warn',
    'en',
    rx(
      String.raw`\b(?:last\s+(?:units|chance|few|spots?|hours?)|only\s+today|today\s+only|limited[- ]time|limited\s+(?:offer|stock|spots?|availability)|hurry|while\s+(?:stocks?|supplies)\s+last|selling\s+fast|ends\s+(?:today|tomorrow|soon)|act\s+now|don'?t\s+miss\s+out|only\s+\d+\s+(?:left|remaining|spots?))\b`,
    ),
    'urgency or scarcity wording is acceptable only when it is true; confirm it with the customer',
  ),
  p(
    'urgency',
    'warn',
    'es',
    rx(
      String.raw`\b(?:ultimas?\s+(?:unidades|plazas|horas|oportunidad)|solo\s+(?:por\s+)?hoy|oferta\s+limitada|plazas\s+limitadas|stock\s+limitado|quedan\s+(?:solo\s+|pocas?\s+|\d+\s+)(?:unidades|plazas)|no\s+te\s+lo\s+pierdas|termina\s+(?:hoy|manana)|date\s+prisa|solo\s+quedan)\b`,
    ),
    'el lenguaje de urgencia o escasez solo vale si es verdad; confirmalo con el cliente',
  ),
];

/** A round figure: a multiple of 1000 of at least 1000, not a year, not 5+ digits without a separator or plus. */
function isRoundFigure(raw) {
  const plus = raw.includes('+');
  const digits = raw.replace(/[^\d.,]/g, '');
  const grouped = /[.,]\d{3}/.test(digits);
  const value = Number(digits.replace(/[.,]/g, ''));
  if (!Number.isFinite(value) || value < 1000 || value % 1000 !== 0)
    return false;
  if (!grouped && !plus && value >= 1900 && value <= 2100) return false; // a year
  if (!grouped && !plus && digits.length >= 5) return false; // a postcode or id
  return true;
}

const clip = (text) =>
  text.length > PHRASE_MAX ? `${text.slice(0, PHRASE_MAX - 3)}...` : text;

/**
 * Scan visible text. Returns one entry per match: { id, level, lang, phrase, reason, terms, line }.
 * `lang` is `es`, `en` or `null` (unknown: both sets are used). Identical phrases of one id are reported once.
 */
export function scanClaims(text, lang = null) {
  const found = [];
  const seen = new Set();
  const lines = String(text).split('\n');
  for (const original of lines) {
    const folded = foldText(original);
    for (const pattern of CLAIM_PATTERNS) {
      if (pattern.lang !== 'any' && lang && pattern.lang !== lang) continue;
      if (pattern.unless && pattern.unless.test(folded)) continue;
      for (const match of folded.matchAll(pattern.re)) {
        const raw = original.slice(match.index, match.index + match[0].length);
        if (pattern.roundOnly && !isRoundFigure(raw)) continue;
        const phrase = clip(raw.replace(/\s+/g, ' ').trim());
        const key = `${pattern.id}\u0000${foldText(phrase)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({
          id: pattern.id,
          level: pattern.level,
          lang: pattern.lang,
          phrase,
          reason: pattern.reason,
          terms: pattern.terms ?? [],
        });
      }
    }
  }
  return found;
}

/** Does the folded brief text hold one of the claim's key terms? */
export const briefStatesClaim = (briefText, terms) =>
  terms.length > 0 && terms.some((term) => briefText.includes(foldText(term)));
