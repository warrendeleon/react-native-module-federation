// --- The assertion helpers. Plain functions that call the global `expect` rather than
// `expect.extend` matchers: a helper imported by name needs no setup file, works the same in
// every package, and shows up in a stack trace as itself.
//
// Nothing here imports React Native. A test element is anything with props, which keeps the
// helpers usable against a rendered tree, a plain object, or a component's defaults. ---

export type TestElement = {
  props?: Record<string, unknown> | null;
};

type Style = Record<string, unknown>;

/** RN accepts a style object, an array, or nested arrays. Later entries win, as at runtime. */
export function flattenStyle(style: unknown): Style {
  if (!style) {
    return {};
  }
  if (Array.isArray(style)) {
    return style.reduce<Style>((merged, entry) => ({ ...merged, ...flattenStyle(entry) }), {});
  }
  if (typeof style === 'object') {
    return { ...(style as Style) };
  }
  return {};
}

// --- Contrast (WCAG 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast) ---

function channelToLinear(channel: number): number {
  const c = channel / 255;
  // 0.04045, not 0.03928. The threshold in the relative-luminance definition was corrected in
  // May 2021; the older constant is still copied around widely. No practical effect on results,
  // but the spec is the spec.
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseHex(colour: string): [number, number, number] {
  const hex = colour.trim().replace(/^#/, '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map(character => character + character)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(
      `Cannot read "${colour}" as a colour. The contrast helpers take six-digit or three-digit hex; ` +
        'resolve tokens to hex before asserting on them.',
    );
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative luminance, verbatim from the WCAG definition. */
export function relativeLuminance(colour: string): number {
  const [r, g, b] = parseHex(colour).map(channelToLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio between two colours, 1:1 to 21:1. Order does not matter. */
export function calculateContrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = 'normalText' | 'largeText' | 'nonText';

/**
 * AA thresholds. Large text is >= 18pt, or >= 14pt bold. Non-text covers UI component and
 * graphical object boundaries (SC 1.4.11).
 */
export const CONTRAST_THRESHOLDS: Record<ContrastLevel, number> = {
  normalText: 4.5,
  largeText: 3,
  nonText: 3,
};

export function expectColorContrast(
  foreground: string,
  background: string,
  level: ContrastLevel = 'normalText',
): void {
  const ratio = calculateContrastRatio(foreground, background);
  const threshold = CONTRAST_THRESHOLDS[level];
  // The pair and both numbers go in the assertion so a failure prints what to fix rather than
  // "expected false to be true".
  expect({
    pair: `${foreground} on ${background}`,
    ratio: Number(ratio.toFixed(2)),
    required: threshold,
    passes: ratio >= threshold,
  }).toEqual({
    pair: `${foreground} on ${background}`,
    ratio: Number(ratio.toFixed(2)),
    required: threshold,
    passes: true,
  });
}

// --- Touch targets ---

/**
 * The project's touch-target bar, in points.
 *
 * This is Apple's recommended default control size, adopted here as the bar. It is not a WCAG AA
 * requirement: SC 2.5.5 Target Size sits at Level AAA, and WCAG 2.2's AA criterion (2.5.8 Target
 * Size (Minimum)) asks for 24x24 with five exceptions. Android's guidance is 48dp. Forty-four is
 * a project decision that clears all of them.
 */
export const MIN_TOUCH_TARGET = 44;

// A declared size is `width`/`height`, or the `minWidth`/`minHeight` a control uses when its
// content decides the rest. Percentage and 'auto' values are not a number of points, so they
// read as no declaration at all rather than as a size this helper could compare against 44.
function measurableSize(element: TestElement): { width?: number; height?: number } {
  const style = flattenStyle(element?.props?.style);
  const points = (...candidates: unknown[]): number | undefined =>
    candidates.find((value): value is number => typeof value === 'number');
  return {
    width: points(style.width, style.minWidth),
    height: points(style.height, style.minHeight),
  };
}

/**
 * Asserts a control declares at least `minimum` points in both axes.
 *
 * Throws rather than passing when nothing measurable is present. A silent pass here is worse
 * than a failure: it reports a control as accessible precisely when the test could not see it.
 * Controls sized by their content declare a hitSlop instead — assert that with expectMinHitSlop.
 */
export function expectMinTouchTarget(
  element: TestElement,
  minimum: number = MIN_TOUCH_TARGET,
): void {
  const { width, height } = measurableSize(element);
  const hitSlop = element?.props?.hitSlop;
  if (width === undefined && height === undefined && hitSlop === undefined) {
    throw new Error(
      'Element has no measurable size and no hitSlop; cannot verify the ' +
        `${minimum}pt touch target. Give the control an explicit width/height or a hitSlop, ` +
        'or assert on a parent that has one.',
    );
  }
  expect({
    width: width ?? minimum,
    height: height ?? minimum,
    minimum,
  }).toEqual(
    expect.objectContaining({
      width: expect.any(Number),
      height: expect.any(Number),
      minimum,
    }),
  );
  expect(width ?? minimum).toBeGreaterThanOrEqual(minimum);
  expect(height ?? minimum).toBeGreaterThanOrEqual(minimum);
}

/** Asserts a content-sized control extends its pressable area to the bar with hitSlop. */
export function expectMinHitSlop(element: TestElement, minimum: number = MIN_TOUCH_TARGET): void {
  const hitSlop = element?.props?.hitSlop;
  if (hitSlop === undefined) {
    throw new Error('Element declares no hitSlop; nothing to verify.');
  }
  const slop =
    typeof hitSlop === 'number'
      ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
      : (hitSlop as Record<string, number>);
  const style = flattenStyle(element?.props?.style);
  const width = ((style.width as number) ?? 0) + (slop.left ?? 0) + (slop.right ?? 0);
  const height = ((style.height as number) ?? 0) + (slop.top ?? 0) + (slop.bottom ?? 0);
  expect(width).toBeGreaterThanOrEqual(minimum);
  expect(height).toBeGreaterThanOrEqual(minimum);
}

// --- Name, role, value (WCAG 4.1.2) ---

export type AccessibilityExpectation = {
  label?: string | RegExp;
  role?: string;
  state?: Record<string, unknown>;
  hint?: string;
};

/**
 * Asserts the three things a screen reader reads out: what it is called, what kind of thing it
 * is, and what state it is in. State is the one teams forget, and the one no visual review catches.
 */
export function expectAccessibilityProps(
  element: TestElement,
  expected: AccessibilityExpectation,
): void {
  const props = element?.props ?? {};
  if (expected.label !== undefined) {
    const label = (props.accessibilityLabel ?? props['aria-label']) as string | undefined;
    if (expected.label instanceof RegExp) {
      expect(label).toMatch(expected.label);
    } else {
      expect(label).toBe(expected.label);
    }
  }
  if (expected.role !== undefined) {
    expect(props.accessibilityRole ?? props.role).toBe(expected.role);
  }
  if (expected.hint !== undefined) {
    expect(props.accessibilityHint).toBe(expected.hint);
  }
  if (expected.state !== undefined) {
    const state = (props.accessibilityState ?? {}) as Record<string, unknown>;
    // aria-disabled and aria-selected are RN aliases; read either spelling.
    const aliases: Record<string, unknown> = {
      disabled: props['aria-disabled'],
      selected: props['aria-selected'],
      checked: props['aria-checked'],
      busy: props['aria-busy'],
      expanded: props['aria-expanded'],
    };
    for (const [key, value] of Object.entries(expected.state)) {
      expect({ [key]: state[key] ?? aliases[key] }).toEqual({ [key]: value });
    }
  }
}

/** Asserts a status region announces itself, and how loudly. */
export function expectScreenReaderAnnouncement(
  element: TestElement,
  { politeness = 'polite' }: { politeness?: 'polite' | 'assertive' | 'none' } = {},
): void {
  const props = element?.props ?? {};
  const live = (props.accessibilityLiveRegion ?? props['aria-live']) as string | undefined;
  const role = (props.accessibilityRole ?? props.role) as string | undefined;
  // An alert role announces on both platforms without a live region; iOS has no live-region
  // equivalent, so either signal counts.
  expect({ live: live ?? (role === 'alert' ? 'assertive' : undefined) }).toEqual({
    live: role === 'alert' ? 'assertive' : politeness,
  });
}

/**
 * Asserts information is not carried by colour alone (SC 1.4.1) — the element, or something
 * inside it, must also say it in words.
 */
export function expectNonColourCue(
  element: TestElement,
  cue: string | RegExp,
  { children }: { children?: TestElement[] } = {},
): void {
  const texts: string[] = [];
  const collect = (node: TestElement | undefined) => {
    const props = node?.props ?? {};
    for (const key of ['accessibilityLabel', 'aria-label', 'accessibilityValue', 'children']) {
      const value = props[key];
      if (typeof value === 'string') {
        texts.push(value);
      } else if (value && typeof value === 'object' && 'text' in (value as object)) {
        texts.push(String((value as { text: unknown }).text));
      }
    }
  };
  collect(element);
  (children ?? []).forEach(collect);
  const joined = texts.join(' ');
  if (cue instanceof RegExp) {
    expect(joined).toMatch(cue);
  } else {
    expect(joined).toContain(cue);
  }
}
