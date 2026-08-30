// --- The bar's own tests.
//
// A package that tells four other workspaces what "accessible" means has to be able to prove
// its own helpers. Every case here is one a previous version got wrong: a touch-target check
// that passed on an axis nobody declared, a hitSlop counted rather than measured, a coverage
// fraction that disagreed with its own arithmetic.

import {
  CONTRAST_THRESHOLDS,
  MIN_TOUCH_TARGET,
  calculateContrastRatio,
  expectAccessibilityProps,
  expectMinHitSlop,
  expectMinTouchTarget,
  expectNonColourCue,
  expectScreenReaderAnnouncement,
  flattenStyle,
  knownFinding,
  relativeLuminance,
} from '../src/accessibility';

describe('relativeLuminance and calculateContrastRatio', () => {
  test('the spec anchors: black is 0, white is 1, and the pair is 21:1', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBe(1);
    expect(calculateContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  // Every other fixture here is a grey, where the three channel coefficients are
  // interchangeable. These are not: swapping green and blue changes both numbers, so the
  // 0.2126 / 0.7152 / 0.0722 weighting is pinned rather than assumed.
  test('the channel coefficients are the ones the spec gives', () => {
    expect(relativeLuminance('#00FF00')).toBeCloseTo(0.7152, 6);
    expect(relativeLuminance('#0000FF')).toBeCloseTo(0.0722, 6);
    expect(relativeLuminance('#FF0000')).toBeCloseTo(0.2126, 6);
  });

  test('order does not matter', () => {
    expect(calculateContrastRatio('#3A86FF', '#FFFFFF')).toBeCloseTo(
      calculateContrastRatio('#FFFFFF', '#3A86FF'),
      10,
    );
  });

  test('the linearisation threshold cannot change an 8-bit result, which is why it is easy to get wrong', () => {
    // The spec corrected this threshold from 0.03928 to 0.04045 in May 2021 and noted the change
    // has no practical effect. That is literally true for 8-bit colour: the two constants sit at
    // 10.02 and 10.31 on the 0-255 scale, so no channel value falls between them, and every
    // input takes the same branch under either. The stale constant therefore survives in
    // codebases indefinitely — nothing it computes is ever wrong. This test pins the branch
    // points on both sides of the boundary so the formula itself stays right.
    expect(relativeLuminance('#0A0A0A')).toBeCloseTo(0.00303527, 8); // linear side
    expect(relativeLuminance('#0B0B0B')).toBeCloseTo(0.00334654, 8); // power side
  });

  test('three-digit hex expands, and a non-colour is rejected loudly', () => {
    expect(calculateContrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
    expect(() => relativeLuminance('rebeccapurple')).toThrow(/six-digit or three-digit hex/);
  });

  test('the AA thresholds are the ones the guidelines set', () => {
    expect(CONTRAST_THRESHOLDS).toEqual({ normalText: 4.5, largeText: 3, nonText: 3 });
  });
});

describe('flattenStyle', () => {
  test('later entries win, as they do at runtime', () => {
    expect(flattenStyle([{ minHeight: 10 }, [{ minHeight: 44 }]])).toEqual({ minHeight: 44 });
  });

  test('nothing flattens to nothing rather than throwing', () => {
    expect(flattenStyle(undefined)).toEqual({});
    expect(flattenStyle(false)).toEqual({});
  });
});

describe('expectMinTouchTarget', () => {
  const target = (props: Record<string, unknown>) => () => expectMinTouchTarget({ props });

  test('the bar is 44 and both axes have to clear it, exactly at the boundary', () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
    expect(target({ style: { minWidth: 44, minHeight: 44 } })).not.toThrow();
    // 43 and 44 are the two values that matter. Without them, loosening the comparison to
    // accept 35 survives every other case in this file.
    expect(target({ style: { minWidth: 44, minHeight: 43 } })).toThrow();
    expect(target({ style: { minWidth: 43, minHeight: 44 } })).toThrow();
    expect(target({ style: { width: 44, height: 10 } })).toThrow();
  });

  test('the larger of a size and its minimum is what a finger meets', () => {
    // React Native lays this out at 44, so reading `width` first reported a false failure.
    expect(target({ style: { width: 4, minWidth: 44, height: 44 } })).not.toThrow();
  });

  // The regression this package exists to prevent: a check that reports green because it could
  // not see the thing it was named for.
  test('an undeclared axis throws instead of borrowing the bar', () => {
    expect(target({ style: { minHeight: 44 } })).toThrow(/declares no width/);
    expect(target({ style: { minWidth: 44 } })).toThrow(/declares no height/);
  });

  test('nothing measurable at all throws', () => {
    expect(target({})).toThrow(/no measurable size and no hitSlop/);
  });

  test('a hitSlop is measured, not merely counted', () => {
    expect(target({ hitSlop: 0 })).toThrow();
    expect(target({ hitSlop: 1 })).toThrow();
    expect(target({ hitSlop: 22 })).not.toThrow();
  });

  test('a percentage is not a number of points, so it reads as undeclared', () => {
    expect(target({ style: { width: '100%', height: '100%' } })).toThrow(
      /no measurable size and no hitSlop/,
    );
  });
});

describe('expectMinHitSlop', () => {
  test('adds the slop to the declared size on each axis', () => {
    expect(() =>
      expectMinHitSlop({ props: { style: { width: 24, height: 24 }, hitSlop: 10 } }),
    ).not.toThrow();
    expect(() =>
      expectMinHitSlop({ props: { style: { width: 24, height: 24 }, hitSlop: 9 } }),
    ).toThrow();
  });

  test('an asymmetric slop is read per edge', () => {
    expect(() =>
      expectMinHitSlop({ props: { hitSlop: { top: 22, bottom: 22, left: 22, right: 22 } } }),
    ).not.toThrow();
    expect(() =>
      expectMinHitSlop({ props: { hitSlop: { top: 22, bottom: 22, left: 2, right: 2 } } }),
    ).toThrow();
  });

  test('no hitSlop at all throws rather than passing', () => {
    expect(() => expectMinHitSlop({ props: {} })).toThrow(/declares no hitSlop/);
  });
});

describe('expectAccessibilityProps', () => {
  test('reads label, role, state and hint', () => {
    const el = {
      props: {
        accessibilityLabel: 'Bulbasaur, number 001',
        accessibilityRole: 'button',
        accessibilityState: { disabled: true },
        accessibilityHint: 'Opens the detail',
      },
    };
    expect(() =>
      expectAccessibilityProps(el, {
        label: 'Bulbasaur, number 001',
        role: 'button',
        state: { disabled: true },
        hint: 'Opens the detail',
      }),
    ).not.toThrow();
    expect(() => expectAccessibilityProps(el, { role: 'link' })).toThrow();
  });

  test('a regular expression matches the label', () => {
    const el = { props: { accessibilityLabel: 'Pikachu, number 025, Electric type' } };
    expect(() => expectAccessibilityProps(el, { label: /^Pikachu, number / })).not.toThrow();
    expect(() => expectAccessibilityProps(el, { label: /^Bulbasaur/ })).toThrow();
  });

  test('the aria-* aliases are read where React Native accepts them', () => {
    const el = { props: { 'aria-label': 'Close', role: 'button', 'aria-disabled': true } };
    expect(() =>
      expectAccessibilityProps(el, { label: 'Close', role: 'button', state: { disabled: true } }),
    ).not.toThrow();
  });

  test('a falsey expected state is still checked', () => {
    // `{disabled: false}` is a real expectation: a control that reports itself disabled when it
    // is not is as wrong as one that stays silent. Only {disabled: true} was exercised, so a
    // helper that skipped falsey values passed.
    const enabled = { props: { accessibilityState: { disabled: false } } };
    expect(() => expectAccessibilityProps(enabled, { state: { disabled: false } })).not.toThrow();
    expect(() => expectAccessibilityProps(enabled, { state: { disabled: true } })).toThrow();
  });

  test('a missing state fails rather than passing as undefined', () => {
    expect(() =>
      expectAccessibilityProps({ props: { accessibilityRole: 'button' } }, {
        state: { disabled: true },
      }),
    ).toThrow();
  });
});

describe('expectScreenReaderAnnouncement', () => {
  test('an alert role counts on both platforms, and is assertive by definition', () => {
    const alert = { props: { accessibilityRole: 'alert' } };
    expect(() =>
      expectScreenReaderAnnouncement(alert, { politeness: 'assertive' }),
    ).not.toThrow();
    // A caller asking for polite and getting an alert has a real disagreement. An earlier
    // version compared the role against itself and passed whatever was asked for.
    expect(() => expectScreenReaderAnnouncement(alert, { politeness: 'polite' })).toThrow();
  });

  test('a live region is read at the politeness the caller asks for', () => {
    const polite = { props: { accessibilityLiveRegion: 'polite' } };
    expect(() => expectScreenReaderAnnouncement(polite)).not.toThrow();
    expect(() =>
      expectScreenReaderAnnouncement(polite, { politeness: 'assertive' }),
    ).toThrow();
  });

  test('a region that announces nothing fails', () => {
    expect(() => expectScreenReaderAnnouncement({ props: {} })).toThrow();
  });
});

describe('expectNonColourCue', () => {
  test('finds the cue in the rendered text', () => {
    expect(() => expectNonColourCue({ props: { children: 'Speed 65' } }, /\d+/)).not.toThrow();
    expect(() => expectNonColourCue({ props: { children: ['Speed ', 65] } }, '65')).not.toThrow();
  });

  test('finds the cue nested any depth down', () => {
    const bar = {
      props: {
        children: [
          { props: { children: 'Speed' } },
          { props: { children: [{ props: { children: 65 } }] } },
        ],
      },
    };
    expect(() => expectNonColourCue(bar, '65')).not.toThrow();
  });

  test('screen-reader metadata alone fails: SC 1.4.1 is about what is visible', () => {
    // Both of these passed before. A StatBar whose visible number was deleted kept its
    // accessibilityValue, so the check that exists to catch exactly that stayed green.
    expect(() => expectNonColourCue({ props: { accessibilityLabel: 'Speed 65' } }, '65')).toThrow();
    expect(() =>
      expectNonColourCue({ props: { accessibilityValue: { text: '65' } } }, '65'),
    ).toThrow();
  });

  test('an emptied visible node fails even when the accessible value still carries it', () => {
    const gutted = {
      props: {
        accessibilityValue: { text: '65' },
        children: [{ props: { children: 'Speed' } }, { props: { children: null } }],
      },
    };
    expect(() => expectNonColourCue(gutted, '65')).toThrow();
  });

  test('colour alone fails', () => {
    expect(() => expectNonColourCue({ props: { style: { color: 'red' } } }, '65')).toThrow();
  });
});

describe('knownFinding', () => {
  // The marker is what separates a tracked finding from an ordinary pass in the report, and a
  // typo in it silently loses a real violation. The helper writes it, so there is nothing to
  // mistype. Jest reports a still-failing it.failing as passed, which is why this test can only
  // assert the title it produces, not the bucket it lands in — reporter.test.ts covers that.
  test('writes the marker the reporter files on', () => {
    const titles: string[] = [];
    const original = (test as unknown as { failing: unknown }).failing;
    (test as unknown as { failing: unknown }).failing = (name: string) => {
      titles.push(name);
    };
    try {
      knownFinding('secondary text on white', '2.75:1, AA needs 4.5:1', () => {});
    } finally {
      (test as unknown as { failing: unknown }).failing = original;
    }
    expect(titles).toEqual(['secondary text on white (known: 2.75:1, AA needs 4.5:1)']);
    expect(titles[0]).toMatch(/\(known/i);
  });
});
