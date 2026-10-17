// Markdown rendering of the QA report (the JSON report is the source of truth).

const cell = (v) =>
  String(v ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
const table = (head, rows) =>
  [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n');
const mark = (ok) => (ok ? 'pass' : '**FAIL**');

export function renderMarkdown(report) {
  const out = [];
  out.push(`# QA report: ${report.verdict.toUpperCase()}`, '');
  out.push(`- Run: \`${report.runId}\` (${report.durationMs} ms)`);
  out.push(
    `- Source: ${report.source.kind}${report.source.dist ? ` of \`${report.source.dist}\`` : ''}, ${report.pages.length} page(s)`,
  );
  out.push(`- Failures: ${report.failures.length}`, '');

  if (report.failures.length) {
    out.push('## Failures', '');
    out.push(
      table(
        [
          'Check',
          'Page',
          'Viewport',
          'Metric',
          'Measured',
          'Threshold',
          'Detail',
        ],
        report.failures.map((f) => [
          f.check,
          f.page ?? '-',
          f.viewport ?? '-',
          f.metric,
          f.measured,
          f.threshold,
          f.message,
        ]),
      ),
      '',
    );
  }

  out.push('## Pages', '');
  for (const page of report.pages) {
    out.push(`### \`${page.path}\``, '');
    if (page.loadError) {
      out.push(`Page failed to load: ${page.loadError}`, '');
      continue;
    }
    out.push('Layout (overflow and clipped text)', '');
    out.push(
      table(
        [
          'Viewport',
          'Doc scrollWidth',
          'Overflowing elements',
          'Clipped text',
          'Result',
          'Screenshot',
        ],
        Object.entries(page.viewports).map(([w, v]) => [
          `${w}px`,
          v.documentScrollWidth,
          v.overflowing.length,
          v.clipped.length,
          mark(v.pass),
          v.screenshot,
        ]),
      ),
      '',
    );
    if (page.reducedMotion) {
      const rm = page.reducedMotion;
      out.push(
        `Reduced motion (${rm.viewportWidth}px): ${mark(rm.pass)}; ${rm.revealCount} reveal element(s), ${rm.hiddenReveals.length} hidden, Lenis classes: ${rm.lenisClasses.length}, pin-spacers: ${rm.pinSpacers.length}`,
        '',
      );
    }
    if (page.lighthouse) {
      const lh = page.lighthouse;
      const cats = Object.keys(lh.worst);
      out.push(
        `Lighthouse (worst of mobile/desktop, ${lh.runs} run(s) each${lh.skippedAudits.length ? `; skipped audits: ${lh.skippedAudits.join(', ')} because the page is noindex` : ''})`,
        '',
      );
      out.push(
        table(
          ['Preset', ...cats],
          [
            ...lh.presets.map((p) => [
              p.preset,
              ...cats.map((c) => p.scores[c]),
            ]),
            ['**worst**', ...cats.map((c) => lh.worst[c])],
            [
              'threshold',
              ...cats.map((c) => lh.thresholds[c] ?? 'report only'),
            ],
          ],
        ),
        '',
      );
      for (const f of lh.failedCategories) {
        out.push(
          `Highest-impact audits for ${f.category} (${f.preset}, ${f.score} < ${f.threshold}):`,
          '',
        );
        for (const a of f.topAudits)
          out.push(
            `- \`${a.id}\`: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}, impact ${a.impact}`,
          );
        out.push('');
      }
    }
  }

  if (report.impeccable) {
    const imp = report.impeccable;
    out.push('## impeccable detect', '');
    if (imp.error) out.push(`Could not run: ${imp.error}`, '');
    else {
      out.push(
        `${imp.findings.length} finding(s): ${imp.counts.major} major, ${imp.counts.minor} minor, ${imp.counts.info} info (target \`${imp.target}\`, impeccable@${imp.version}).`,
        '',
      );
      if (imp.findings.length)
        out.push(
          table(
            ['Level', 'Rule', 'File', 'Line', 'Snippet'],
            imp.findings.map((f) => [
              f.level,
              f.rule,
              f.file,
              f.line ?? '-',
              f.snippet,
            ]),
          ),
          '',
        );
    }
  }
  return `${out.join('\n')}\n`;
}
