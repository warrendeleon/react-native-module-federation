// --- The reporter's own tests.
//
// The report is the artefact a team reads instead of the suite, so a fault here is a fault
// nobody sees. Each case below is one the reporter previously got wrong: a denominator that
// ignored its own not-applicable declarations, a criterion checked but silently dropped, two
// titles run together, and a coverage sentence that disagreed with the number beside it.

import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const AccessibilityReporter = require('../reporter.js');
const CRITERIA = require('../wcag-criteria.js');

type Assertion = { ancestorTitles: string[]; title: string; status: string };

function report(assertions: Assertion[], notApplicable?: Record<string, string>): string {
  const rootDir = mkdtempSync(join(tmpdir(), 'a11y-reporter-'));
  if (notApplicable) {
    writeFileSync(
      join(rootDir, 'a11y-report.config.js'),
      `module.exports = ${JSON.stringify({ notApplicable })};`,
    );
  }
  const reporter = new AccessibilityReporter({ rootDir }, { title: 'subject' });
  reporter.onRunComplete({}, {
    testResults: [{ testResults: assertions.map(a => ({ failureMessages: [], ...a })) }],
  });
  return readFileSync(join(rootDir, 'accessibility-report.md'), 'utf8');
}

const passing = (ancestor: string, title = 'a check') => ({
  ancestorTitles: [ancestor],
  title,
  status: 'passed',
});

describe('coverage arithmetic', () => {
  const automated = Object.values(CRITERIA).filter((c: any) => c.layer === 'automated').length;

  test('the catalogue has the 15 criteria a Jest process can decide', () => {
    expect(automated).toBe(15);
  });

  test('with no declarations the denominator is the whole automated set', () => {
    expect(report([passing('WCAG 1.4.3 Contrast (Minimum)')])).toContain(
      `**1 of ${automated}** WCAG 2.1 A + AA criteria`,
    );
  });

  test('a declared criterion leaves the denominator and is named as excluded', () => {
    const out = report([passing('WCAG 1.4.3 Contrast (Minimum)')], {
      '1.3.5': 'No text inputs.',
    });
    expect(out).toContain(`**1 of ${automated - 1}**`);
    expect(out).toContain('after 1 declared not applicable here');
    expect(out).toContain('| 1.3.5 Identify Input Purpose | AA | n/a |');
  });

  // The fault: a suite declaring a criterion that was never counted still said "after 2
  // declared not applicable" while removing one, so the sentence and the fraction disagreed.
  test('a declaration outside the automated set changes no number and says so', () => {
    const out = report([passing('WCAG 1.4.3 Contrast (Minimum)')], {
      '1.3.5': 'No text inputs.',
      '3.3.4': 'No data-submission flows.',
    });
    expect(out).toContain(`**1 of ${automated - 1}**`);
    expect(out).toContain('after 1 declared not applicable here');
    expect(out).toContain('(never counted here)');
  });

  test('an untested criterion reads 0 rather than being drawn like an n/a', () => {
    expect(report([passing('WCAG 1.4.3 Contrast (Minimum)')])).toContain(
      '| 1.1.1 Non-text Content | A | 0 |',
    );
  });
});

describe('what lands in which bucket', () => {
  test('a failure is a violation, under its criterion name and level', () => {
    const out = report([
      { ancestorTitles: ['WCAG 4.1.2 Name, Role, Value'], title: 'the button', status: 'failed' },
    ]);
    expect(out).toContain('## Violations (1)');
    expect(out).toContain('### WCAG 4.1.2 Name, Role, Value (A)');
  });

  test('a title marked (known is tracked rather than counted as a violation', () => {
    const out = report([
      passing('WCAG 1.4.3 Contrast (Minimum)', 'secondary text (known: 2.75:1)'),
    ]);
    expect(out).toContain('## Violations (0)');
    expect(out).toContain('## Known findings (1)');
  });

  // The 44pt bar is SC 2.5.5, which is Level AAA and outside the A + AA set the fraction is
  // measured against. Dropping it silently hid checks that ran; counting it inflated the score.
  test('a criterion outside the counted set is reported without moving the number', () => {
    const out = report([passing('WCAG 2.5.5 Target Size', 'the Add button')]);
    expect(out).toContain('## Checked beyond the counted scope');
    expect(out).toContain('**WCAG 2.5.5**');
    expect(out).toContain('1 check');
    expect(out).toContain('**0 of 15**');
  });
});

describe('finding lines', () => {
  test('the criterion name the heading already carries is not repeated, and titles are separated', () => {
    const out = report([
      passing('WCAG 1.4.3 Contrast (Minimum) — body text on light surfaces', 'on white (known)'),
    ]);
    expect(out).toContain('**WCAG 1.4.3 Contrast (Minimum)** — body text on light surfaces · on white (known)');
  });

  test('an assertion naming no criterion is ignored rather than mis-filed', () => {
    expect(report([passing('a plain unit test', 'does a thing')])).toContain('**0 of 15**');
  });
});

describe('the three-layer note', () => {
  test('every report says what it does not cover', () => {
    const out = report([passing('WCAG 1.4.3 Contrast (Minimum)')]);
    expect(out).toContain('## What this report does not cover');
    expect(out).toContain('necessary, not sufficient');
  });
});

describe('project bars', () => {
  // A threshold the project chose is not a criterion result, and reporting it as one is how a
  // coverage number stops meaning anything.
  test('a Project bar describe is tracked in its own section and moves no number', () => {
    const out = report([
      passing('WCAG 1.4.3 Contrast (Minimum)'),
      passing('Project bar — pairs held above what the criteria require', 'disabled label (known)'),
    ]);
    expect(out).toContain('## Project bars');
    expect(out).toContain('pairs held above what the criteria require · disabled label (known)');
    expect(out).toContain('**1 of 15**');
    // It must not leak into the criterion buckets.
    expect(out).toContain('## Known findings (0)');
  });

  // The fault: this branch recorded the assertion's status and never rendered it, and returned
  // before both the skipped guard and the anything-failing guard, so a bar that failed and a bar
  // that passed printed as the same bullet.
  test('a failing Project bar is marked, not printed as an ordinary bar', () => {
    const out = report([
      {
        ancestorTitles: ['Project bar — pairs held above what the criteria require'],
        title: 'disabled label',
        status: 'failed',
      },
    ]);
    expect(out).toContain('## Project bars');
    expect(out).toContain('- **FAILING** — pairs held above what the criteria require · disabled label');
  });

  // The fault: this branch decided status but never read the (known marker the criterion path
  // reads, so a bar parked with knownFinding — which is test.failing, reported by Jest as passed
  // — printed as a bar that held. It is the only Project bar this repo ships.
  test('a Project bar parked as a known finding does not read as a bar that held', () => {
    const out = report([
      {
        ancestorTitles: ['Project bar — pairs held above what the criteria require'],
        title: 'disabled label (known: 2.02:1)',
        status: 'passed',
      },
    ]);
    expect(out).toContain('- **not held** — pairs held above what the criteria require · disabled label (known: 2.02:1)');
  });

  test('a Project bar that really holds carries no marker', () => {
    const out = report([
      passing('Project bar — pairs held above what the criteria require', 'contrast on the fill'),
    ]);
    expect(out).toContain('- pairs held above what the criteria require · contrast on the fill');
    expect(out).not.toContain('not held');
    expect(out).not.toContain('FAILING');
  });

  test('a skipped Project bar goes to Skipped rather than reading as a bar that held', () => {
    const out = report([
      {
        ancestorTitles: ['Project bar — pairs held above what the criteria require'],
        title: 'disabled label',
        status: 'pending',
      },
    ]);
    expect(out).toContain('## Skipped');
    expect(out).toContain('disabled label');
    expect(out).not.toContain('## Project bars');
  });

  test('no Project bar describe means no section', () => {
    expect(report([passing('WCAG 1.4.3 Contrast (Minimum)')])).not.toContain('## Project bars');
  });
});

describe('nothing failing is dropped', () => {
  // The third branch was the last to get the status-then-marker handling the other two have: a
  // skip and a tracked finding under a describe naming no criterion were both discarded.
  test('a tracked finding under no criterion is reported rather than dropped', () => {
    const out = report([
      passing('The onboarding sheet', 'header on tint (known: 2.10:1)'),
    ]);
    expect(out).toContain('## Failures outside any criterion');
    expect(out).toContain('The onboarding sheet · header on tint (known: 2.10:1)');
  });

  test('a skipped check under no criterion reaches Skipped', () => {
    const out = report([
      { ancestorTitles: ['The onboarding sheet'], title: 'a check nobody ran', status: 'pending' },
    ]);
    expect(out).toContain('## Skipped');
    expect(out).toContain('a check nobody ran');
  });

  // A suite that throws on import contributes no assertions, so the counts below it are counts
  // of a run the reporter could not see.
  test('a suite that never executed is named, not silently omitted', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'a11y-reporter-'));
    const reporter = new AccessibilityReporter({ rootDir }, { title: 'subject' });
    reporter.onRunComplete({}, {
      testResults: [
        { testFilePath: '/x/components.accessibility.tsx', testExecError: new Error('boom'),
          testResults: [] },
        { testResults: [{ failureMessages: [], ...passing('WCAG 1.4.3 Contrast (Minimum)') }] },
      ],
    });
    const out = readFileSync(join(rootDir, 'accessibility-report.md'), 'utf8');
    expect(out).toContain('## Suites that did not run');
    expect(out).toContain('/x/components.accessibility.tsx');
    expect(out).toContain('this run was not clean');
  });

  test('a failure under a describe naming no criterion is still reported', () => {
    const out = report([
      { ancestorTitles: ['a plain describe'], title: 'a broken thing', status: 'failed' },
    ]);
    expect(out).toContain('## Failures outside any criterion');
    expect(out).toContain('a plain describe · a broken thing');
  });

  test('a skipped check does not credit its criterion', () => {
    const out = report([
      { ancestorTitles: ['WCAG 1.4.1 Use of Color'], title: 'a check', status: 'pending' },
    ]);
    expect(out).toContain('## Skipped');
    expect(out).toContain('**0 of 15**');
    expect(out).toContain('| 1.4.1 Use of Color | A | 0 |');
  });

  // The fault: the marker was tested before the status, so a knownFinding that was skipped read
  // as a tracked finding. It credited its criterion, raised the coverage fraction and stayed out
  // of the Skipped list, which is the one thing a skipped check must never do.
  test('a skipped check carrying the known marker is still skipped', () => {
    const out = report([
      {
        ancestorTitles: ['WCAG 1.4.3 Contrast (Minimum)'],
        title: 'secondary text (known: 2.60:1)',
        status: 'pending',
      },
    ]);
    expect(out).toContain('## Skipped');
    expect(out).toContain('secondary text (known: 2.60:1)');
    expect(out).toContain('## Known findings (0)');
    expect(out).toContain('**0 of 15**');
    expect(out).toContain('| 1.4.3 Contrast (Minimum) | AA | 0 |');
  });

  test('a not-applicable declaration with no reason is refused', () => {
    expect(() => report([passing('WCAG 1.4.3 Contrast (Minimum)')], { '1.3.5': '  ' })).toThrow(
      /no reason/,
    );
  });
});
