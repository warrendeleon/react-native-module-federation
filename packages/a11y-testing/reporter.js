// --- The Jest reporter. Turns a suite run into one accessibility report per package or remote.
//
// It reads the WCAG criterion out of the describe title — every accessibility describe opens
// with "WCAG 1.4.3 ..." — and groups results by criterion. What comes out is the artefact a
// paid scanner sells: coverage against the A + AA catalogue, the violations, the findings that
// are known and tracked rather than hidden, and an honest note about the three layers.
//
// A suite declares the criteria it cannot apply in a11y-report.config.js at its root:
//
//   module.exports = {
//     notApplicable: {
//       '1.3.5': 'No text inputs on these screens.',
//     },
//   };
//
// Reasons are required. An unexplained n/a is how coverage numbers start lying. ---

const fs = require('fs');
const path = require('path');

const CRITERIA = require('./wcag-criteria.js');

const CRITERION_IN_TITLE = /WCAG (\d+\.\d+\.\d+)/;

class AccessibilityReporter {
  constructor(globalConfig, options = {}) {
    this._globalConfig = globalConfig;
    this._outputPath = options.outputPath ?? 'accessibility-report.md';
    this._rootDir = globalConfig.rootDir ?? process.cwd();
    this._title = options.title ?? path.basename(this._rootDir);
  }

  _loadOverrides() {
    const configPath = path.join(this._rootDir, 'a11y-report.config.js');
    if (!fs.existsSync(configPath)) {
      return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(configPath);
    return config.notApplicable ?? {};
  }

  onRunComplete(_contexts, results) {
    const overrides = this._loadOverrides();
    const byCriterion = new Map();

    for (const suite of results.testResults) {
      for (const assertion of suite.testResults) {
        const title = [...(assertion.ancestorTitles ?? []), assertion.title].join(' ');
        const match = title.match(CRITERION_IN_TITLE);
        if (!match) {
          continue;
        }
        const criterion = match[1];
        const entry = byCriterion.get(criterion) ?? { passed: [], failed: [], known: [] };
        // A test parked with it.failing is a finding that is tracked, not a silent gap: Jest
        // reports it as passing while it still fails, so it lands in its own bucket.
        const bucket =
          assertion.status === 'failed'
            ? entry.failed
            : /\(known/i.test(title)
              ? entry.known
              : entry.passed;
        // The describe already names the criterion; repeating it in the line would read
        // "WCAG 1.4.3 ... — WCAG 1.4.3 ...".
        const withoutCriterion = title.replace(/^WCAG \d+\.\d+\.\d+\s*/, '').replace(/^—\s*/, '');
        bucket.push({ title: withoutCriterion, messages: assertion.failureMessages ?? [] });
        byCriterion.set(criterion, entry);
      }
    }

    const automated = Object.entries(CRITERIA).filter(([, c]) => c.layer === 'automated');
    const covered = automated.filter(([id]) => byCriterion.has(id));
    const notApplicable = Object.entries(overrides);

    const lines = [];
    lines.push(`# Accessibility report — ${this._title}`);
    lines.push('');
    lines.push(
      `Automated coverage: **${covered.length} of ${automated.length}** WCAG 2.1 A + AA criteria ` +
        'that a Jest suite can decide.',
    );
    lines.push('');

    const violations = [...byCriterion.entries()].filter(([, e]) => e.failed.length > 0);
    lines.push(`## Violations (${violations.length})`);
    lines.push('');
    if (violations.length === 0) {
      lines.push('None.');
    } else {
      for (const [id, entry] of violations) {
        const meta = CRITERIA[id] ?? { name: 'Unknown criterion', level: '?' };
        lines.push(`### WCAG ${id} ${meta.name} (${meta.level})`);
        lines.push('');
        for (const failure of entry.failed) {
          lines.push(`- ${failure.title}`);
        }
        lines.push('');
      }
    }
    lines.push('');

    const known = [...byCriterion.entries()].filter(([, e]) => e.known.length > 0);
    lines.push(`## Known findings (${known.reduce((n, [, e]) => n + e.known.length, 0)})`);
    lines.push('');
    if (known.length === 0) {
      lines.push('None.');
    } else {
      lines.push('Tracked in the suite with `it.failing`, so they cannot be forgotten quietly.');
      lines.push('');
      for (const [id, entry] of known) {
        const meta = CRITERIA[id] ?? { name: 'Unknown criterion', level: '?' };
        for (const finding of entry.known) {
          lines.push(`- **WCAG ${id} ${meta.name}** — ${finding.title}`);
        }
      }
    }
    lines.push('');

    lines.push('## Covered');
    lines.push('');
    lines.push('| Criterion | Level | Checks |');
    lines.push('|---|---|---|');
    for (const [id, meta] of automated) {
      const entry = byCriterion.get(id);
      const count = entry ? entry.passed.length + entry.failed.length + entry.known.length : 0;
      lines.push(`| ${id} ${meta.name} | ${meta.level} | ${count || '—'} |`);
    }
    lines.push('');

    if (notApplicable.length > 0) {
      lines.push('## Not applicable here');
      lines.push('');
      for (const [id, reason] of notApplicable) {
        const meta = CRITERIA[id] ?? { name: 'Unknown criterion' };
        lines.push(`- **${id} ${meta.name}** — ${reason}`);
      }
      lines.push('');
    }

    lines.push('## What this report does not cover');
    lines.push('');
    lines.push(
      'These numbers describe one of three layers. The suite checks token pairs, declared sizes ' +
        'and the name/role/state a control exposes. It does not check contrast as drawn, the real ' +
        'focus traversal order, or hit regions after clipping — those need a device audit ' +
        '(`performAccessibilityAudit` on iOS, the Accessibility Test Framework on Android). ' +
        'Whether a label actually reads well stays a manual VoiceOver and TalkBack pass. A clean ' +
        'automated run is necessary, not sufficient.',
    );
    lines.push('');

    const outputPath = path.isAbsolute(this._outputPath)
      ? this._outputPath
      : path.join(this._rootDir, this._outputPath);
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
  }
}

module.exports = AccessibilityReporter;
