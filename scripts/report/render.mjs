// Markdown rendering of the report (report.json is the source of truth).
import { OWASP_CATEGORIES, OWASP_EDITION, OWASP_URL } from './owasp.mjs';
import { countStatuses, worstStatus } from './items.mjs';
import { LEGAL_NOTE } from './legal.mjs';

const cell = (value) =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
const table = (head, rows) =>
  [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');

const LABEL = {
  pass: 'pass',
  warn: 'WARN',
  fail: '**FAIL**',
  na: 'n/a',
  'not-run': 'not run',
};
const MD_EVIDENCE = 6;

const evidenceCell = (item) => {
  const shown = item.evidence
    .slice(0, MD_EVIDENCE)
    .map((line) => `\`${line.replace(/`/g, "'")}\``);
  const more = item.evidence.length - shown.length;
  return `${shown.join('<br>')}${more > 0 ? `<br>... and ${more} more (report.json)` : ''}`;
};

/** Counts and verdict headline: `passed (2 not run)` or `FAILED`. */
export function headline(report) {
  const notRun = report.counts['not-run'];
  return report.verdict === 'passed'
    ? `passed${notRun ? ` (${notRun} not run)` : ''}`
    : 'FAILED';
}

function itemTable(items) {
  return table(
    ['Status', 'Check', 'Evidence', 'How to fix'],
    items.map((item) => [
      LABEL[item.status],
      item.title,
      evidenceCell(item),
      item.fix,
    ]),
  );
}

export function renderMarkdown(report) {
  const out = [];
  const c = report.counts;
  out.push(`# Landing report: ${headline(report)}`, '');
  out.push(
    `${report.verdict === 'passed' ? 'passed' : 'failed'}: ${c.fail} fail, ${c.warn} warn, ${c.pass} pass, ${c.na} n/a, ${c['not-run']} not run`,
    '',
  );
  out.push(
    `- Landing: ${report.site ? `\`sites/${report.site}\`` : 'the starter (repo root)'}`,
  );
  out.push(
    `- Run: \`${report.runId}\`, mode \`${report.mode}\`${report.url ? `, live URL ${report.url}` : ''}`,
  );
  out.push(`- Security frame: [OWASP Top 10:${OWASP_EDITION}](${OWASP_URL})`);
  if (report.skipped.length)
    out.push(`- Skipped on request: ${report.skipped.join(', ')}`);
  if (report.qa?.problem) out.push(`- QA data: ${report.qa.problem}`);
  else if (report.qa?.path) out.push(`- QA data: \`${report.qa.path}\``);
  out.push('');

  const fails = report.items.filter((i) => i.status === 'fail');
  const warns = report.items.filter((i) => i.status === 'warn');
  if (fails.length) out.push('## Failures', '', itemTable(fails), '');
  if (warns.length) out.push('## Warnings', '', itemTable(warns), '');
  const notRun = report.items.filter((i) => i.status === 'not-run');
  if (notRun.length) out.push('## Not run', '', itemTable(notRun), '');

  const security = report.items.filter((i) => i.area === 'security');
  if (security.length) {
    out.push(`## Security: OWASP Top 10:${OWASP_EDITION}`, '');
    const naLines = [];
    for (const category of OWASP_CATEGORIES) {
      const items = security.filter((i) => i.owasp === category.id);
      const status = items.length
        ? worstStatus(items.map((i) => i.status))
        : 'na';
      if (status === 'na') {
        const reason =
          items
            .find((i) => i.title.startsWith('Not applicable'))
            ?.title.replace(/^Not applicable:\s*/, '') ??
          category.naReason ??
          'nothing to check in this run';
        naLines.push(
          `- **${category.id} ${category.name}**: not applicable, ${reason}`,
        );
        continue;
      }
      out.push(`### ${category.id} ${category.name}: ${LABEL[status]}`, '');
      if (category.checks)
        out.push(`Checks for a static landing: ${category.checks}.`, '');
      out.push(itemTable(items), '');
    }
    const other = security.filter((i) => !i.owasp);
    if (other.length)
      out.push('### Other security checks', '', itemTable(other), '');
    if (naLines.length) out.push('### Not applicable', '', ...naLines, '');
  }

  const perf = report.items.filter((i) => i.area === 'performance');
  if (perf.length) {
    out.push('## Performance', '');
    if (report.performance?.pages?.length) {
      out.push(
        table(
          [
            'Page',
            'Preset',
            'Perf',
            'A11y',
            'SEO',
            'LCP ms',
            'CLS',
            'TBT ms',
            'KB',
            'Requests',
            'LCP element',
          ],
          report.performance.pages.map((p) => [
            p.page,
            p.preset,
            p.scores?.performance ?? '-',
            p.scores?.accessibility ?? '-',
            p.scores?.seo ?? '-',
            p.detail?.lcpMs ?? '-',
            p.detail?.cls ?? '-',
            p.detail?.tbtMs ?? '-',
            p.detail?.totalByteWeightKb ?? '-',
            p.detail?.requestCount ?? '-',
            p.detail?.lcpElement ? `\`${p.detail.lcpElement.selector}\`` : '-',
          ]),
        ),
        '',
      );
    }
    out.push(itemTable(perf), '');
  }

  const legal = report.items.filter((i) => i.area === 'legal');
  if (legal.length) {
    out.push('## Legal', '', itemTable(legal), '', `_${LEGAL_NOTE}_`, '');
  }

  const seo = report.items.filter((i) => i.area === 'seo');
  if (seo.length) {
    const c = countStatuses(seo);
    out.push(
      '## SEO',
      '',
      `${c.fail} fail, ${c.warn} warn, ${c.pass} pass, ${c.na} n/a over the indexable pages (no noindex, 404 or direction page).`,
      '',
      itemTable(seo),
      '',
    );
  }
  return `${out.join('\n')}\n`;
}
