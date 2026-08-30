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

// A suite can also hold a bar that is not a WCAG criterion at all: a threshold the project has
// chosen, or a pair the guidelines exempt but the team would rather keep readable. Naming the
// describe "Project bar — ..." files it separately, so it is tracked without being reported as
// a criterion result and without moving a coverage number it was never part of.
const PROJECT_BAR_IN_TITLE = /^Project bar\b/;

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
    const config = require(configPath);
    const declared = config.notApplicable ?? {};
    // A reason is what makes a not-applicable declaration reviewable. An empty one still moved
    // the denominator and printed a bare bullet, so it is refused rather than accepted quietly.
    for (const [id, reason] of Object.entries(declared)) {
      if (typeof reason !== 'string' || reason.trim() === '') {
        throw new Error(
          `a11y-report.config.js declares ${id} not applicable with no reason. Give one: an ` +
            'unexplained exclusion is how a coverage number starts lying.',
        );
      }
    }
    return declared;
  }

  onRunComplete(_contexts, results) {
    const overrides = this._loadOverrides();
    const byCriterion = new Map();

    const projectBars = [];
    const skipped = [];
    const unattributed = [];
    // A suite that threw on import contributes no assertions, so every check it holds simply
    // vanishes from the counts below and the report prints "Violations (0)" for a red run. The
    // report is what a team reads instead of the suite, so a run it cannot see is a run it has
    // to say it cannot see.
    const didNotRun = results.testResults
      .filter(s => s.testExecError || (s.failureMessage && s.testResults.length === 0))
      .map(s => s.testFilePath ?? 'a suite with no path');

    for (const suite of results.testResults) {
      for (const assertion of suite.testResults) {
        const ancestors = assertion.ancestorTitles ?? [];
        const joined = [...ancestors, assertion.title].join(' ');
        if (ancestors.some(a => PROJECT_BAR_IN_TITLE.test(a))) {
          const title = [...ancestors.map(a => a.replace(PROJECT_BAR_IN_TITLE, '').replace(/^[\s—:-]+/, '').trim()).filter(Boolean), assertion.title].join(' · ');
          // A bar the project set is still a check that can fail or not run, and this branch used
          // to flatten all three states into the same bullet: it recorded `failed` and never read
          // it, and it returned before both the skipped guard and the anything-failing guard
          // below. A red bar and a green one printed identically. So status is decided here too.
          if (assertion.status === 'pending' || assertion.status === 'todo') {
            skipped.push(joined);
            continue;
          }
          // The marker read, which the criterion path below has always had and this branch did
          // not. A bar parked with knownFinding is `test.failing`, which Jest reports as passed,
          // so reading `status` alone called a bar that is failing on purpose a bar that held —
          // and the one Project bar this repo ships is exactly that.
          projectBars.push({
            title,
            failed: assertion.status === 'failed',
            known: /\(known/i.test(assertion.title),
          });
          continue;
        }
        const match = joined.match(CRITERION_IN_TITLE);
        if (!match) {
          // The third branch, and the last of the three to get this. A failure with no criterion
          // in its title would otherwise disappear and a red run could print "Violations (0)";
          // so would a check that did not run, and so would a tracked finding parked under a
          // describe that names no criterion. Anything failing, skipped or knowingly failing
          // gets said out loud, named or not.
          if (assertion.status === 'pending' || assertion.status === 'todo') {
            skipped.push(joined);
          } else if (assertion.status === 'failed' || /\(known/i.test(assertion.title)) {
            unattributed.push([...ancestors, assertion.title].join(' · '));
          }
          continue;
        }
        const criterion = match[1];
        const entry = byCriterion.get(criterion) ?? { passed: [], failed: [], known: [] };
        // A test parked with it.failing is a finding that is tracked, not a silent gap. Jest
        // reports one as `passed` while its body still fails, and gives no other signal, so the
        // marker in the title is all there is to file on. That makes the marker load-bearing:
        // drop it and a live violation reads here as an ordinary pass, and nothing in this file
        // can tell. Nothing errors and nothing names the title. What removes the risk is the
        // `knownFinding` helper writing the marker, so there is no string left to mistype.
        // Order matters here, and it was wrong once. A skipped check is not a passing one and
        // not a tracked finding either: whatever its title says, nothing ran. Testing the marker
        // first filed a skipped-and-marked test as a known finding, which credited its criterion
        // in the coverage fraction and kept it out of the Skipped list. So status is decided
        // before the title is read.
        let bucket;
        if (assertion.status === 'pending' || assertion.status === 'todo') {
          // A skipped check is not a passing one. Counting it would report coverage for a
          // criterion nothing exercised.
          skipped.push(joined);
          continue;
        } else if (assertion.status === 'failed') {
          bucket = entry.failed;
        } else if (/\(known/i.test(assertion.title)) {
          bucket = entry.known;
        } else {
          bucket = entry.passed;
        }
        // Every line already sits under its criterion's own heading, so the describe's
        // "WCAG 1.4.3 Contrast (Minimum)" is stripped down to whatever it says after that: the
        // subject the block covers. What survives joins the test name with a separator, because
        // "…on light surfaces secondary text on white" is two titles run together.
        const context = ancestors
          .map(ancestor =>
            ancestor
              .replace(CRITERION_IN_TITLE, '')
              .replace(CRITERIA[criterion] ? CRITERIA[criterion].name : '', '')
              .replace(/^[\s—:-]+/, '')
              .trim(),
          )
          .filter(Boolean);
        bucket.push({
          title: [...context, assertion.title].join(' · '),
          messages: assertion.failureMessages ?? [],
        });
        byCriterion.set(criterion, entry);
      }
    }

    const automated = Object.entries(CRITERIA).filter(([, c]) => c.layer === 'automated');
    const notApplicable = Object.entries(overrides);
    // A criterion this suite has declared inapplicable leaves the denominator. Counting it as an
    // uncovered criterion would punish a package for not testing text inputs it does not ship,
    // and a denominator nobody believes is a denominator nobody reads.
    const inScope = automated.filter(([id]) => !(id in overrides));
    const covered = inScope.filter(([id]) => byCriterion.has(id));
    // Only a declaration against a criterion the report actually counts changes the denominator.
    // A suite may also declare one that was never in the automated set; saying "after 2 declared
    // not applicable" while removing one is the kind of arithmetic that makes a reader stop
    // trusting the number.
    const excluded = automated.length - inScope.length;

    const lines = [];
    lines.push(`# Accessibility report — ${this._title}`);
    lines.push('');
    lines.push(
      `Automated coverage: **${covered.length} of ${inScope.length}** WCAG 2.1 A + AA criteria ` +
        'that a Jest suite can decide' +
        (excluded > 0 ? `, after ${excluded} declared not applicable here.` : '.'),
    );
    lines.push('');

    if (didNotRun.length > 0) {
      lines.push('## Suites that did not run');
      lines.push('');
      lines.push(
        'These threw before any check could report, so nothing below counts them. Every number ' +
          'in this report describes the suites that ran, and this run was not clean.',
      );
      lines.push('');
      for (const path of didNotRun) {
        lines.push(`- ${path}`);
      }
      lines.push('');
    }

    if (unattributed.length > 0) {
      lines.push('## Failures outside any criterion');
      lines.push('');
      lines.push(
        'These failed under a describe that names no WCAG criterion, so they belong to no ' +
          'section above. A run is not clean while this list has entries.',
      );
      lines.push('');
      for (const title of unattributed) {
        lines.push(`- ${title}`);
      }
      lines.push('');
    }

    if (skipped.length > 0) {
      lines.push('## Skipped');
      lines.push('');
      lines.push(
        'These did not run, so they prove nothing and are counted nowhere. A skipped check that ' +
          'still credited its criterion is a coverage number describing work nobody did.',
      );
      lines.push('');
      for (const title of skipped) {
        lines.push(`- ${title}`);
      }
      lines.push('');
    }

    const violations = [...byCriterion.entries()].filter(([, e]) => e.failed.length > 0);
    // Failed checks, not criteria. The findings heading below counts checks, and an earlier
    // version counted criteria here, so a run with five failures across two criteria printed
    // "Violations (2)" above five bullets. Two headings, two denominators, one report.
    const violationCount = violations.reduce((n, [, e]) => n + e.failed.length, 0);
    lines.push(`## Violations (${violationCount})`);
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
      const cell = id in overrides ? 'n/a' : count || '0';
      lines.push(`| ${id} ${meta.name} | ${meta.level} | ${cell} |`);
    }
    lines.push('');

    // A describe can name a criterion the catalogue does not carry: the 44pt touch-target bar is
    // SC 2.5.5, which is Level AAA and sits above the A + AA scope this report counts. Those
    // checks ran and they are worth saying so, but they never move the coverage number.
    const outsideCatalogue = [...byCriterion.entries()].filter(
      ([id]) => !CRITERIA[id] || CRITERIA[id].layer !== 'automated',
    );
    if (outsideCatalogue.length > 0) {
      lines.push('## Checked beyond the counted scope');
      lines.push('');
      lines.push(
        'These ran and are reported, but they sit outside the WCAG 2.1 A + AA set the coverage ' +
          'number is measured against, so they do not raise it.',
      );
      lines.push('');
      for (const [id, entry] of outsideCatalogue) {
        const meta = CRITERIA[id];
        const name = meta ? `${meta.name} (${meta.level})` : 'not in the A + AA catalogue';
        const total = entry.passed.length + entry.failed.length + entry.known.length;
        lines.push(`- **WCAG ${id}** ${name} — ${total} check${total === 1 ? '' : 's'}`);
      }
      lines.push('');
    }

    if (projectBars.length > 0) {
      lines.push('## Project bars');
      lines.push('');
      lines.push(
        'Thresholds this project chose rather than criteria the guidelines set. They are tracked ' +
          'here and counted nowhere, because reporting a project decision as a criterion result ' +
          'is how a coverage number stops meaning anything.',
      );
      lines.push('');
      for (const bar of projectBars) {
        const state = bar.failed ? '**FAILING** — ' : bar.known ? '**not held** — ' : '';
        lines.push(`- ${state}${bar.title}`);
      }
      lines.push('');
    }

    if (notApplicable.length > 0) {
      lines.push('## Not applicable here');
      lines.push('');
      for (const [id, reason] of notApplicable) {
        const meta = CRITERIA[id] ?? { name: 'Unknown criterion' };
        // A criterion outside the automated set was never in the denominator, so say so rather
        // than let it read as one this suite chose not to test.
        const counted = automated.some(([automatedId]) => automatedId === id);
        lines.push(`- **${id} ${meta.name}** — ${reason}${counted ? '' : ' (never counted here)'}`);
      }
      lines.push('');
    }

    lines.push('## What this report does not cover');
    lines.push('');
    lines.push(
      'These numbers describe one of three layers. The suite checks token pairs, declared sizes ' +
        'and the name/role/state a control exposes. It does not check contrast as drawn, the real ' +
        'focus traversal order, or hit regions after clipping. Those need a device audit: ' +
        '`performAccessibilityAudit` on iOS, the Accessibility Test Framework on Android. ' +
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
