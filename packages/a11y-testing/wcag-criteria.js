// --- The WCAG 2.1 A + AA catalogue, tagged by the layer that can actually verify each one.
//
// The tag is the honest part. A Jest suite can check a token pair's contrast ratio and whether a
// control declares a name, a role and a state. It cannot see what a screen actually paints, what
// order a screen reader really traverses, or whether a label reads well out loud. Marking those
// 'native' and 'manual' keeps the report from claiming coverage it does not have.
//
// Level AAA criteria are deliberately absent: the European Accessibility Act's bar, via EN 301
// 549, is WCAG 2.1 A and AA. (SC 2.5.5 Target Size is AAA and is the classic thing to mis-cite.)
//
//   automated — a Jest assertion can decide it
//   native    — needs a device audit (XCUITest performAccessibilityAudit, Android ATF)
//   manual    — needs a person with VoiceOver or TalkBack
//   n-a       — cannot apply to this codebase (no audio, no video, no timing)

module.exports = {
  '1.1.1': { name: 'Non-text Content', level: 'A', layer: 'automated' },
  '1.2.1': { name: 'Audio-only and Video-only (Prerecorded)', level: 'A', layer: 'n-a' },
  '1.2.2': { name: 'Captions (Prerecorded)', level: 'A', layer: 'n-a' },
  '1.2.3': { name: 'Audio Description or Media Alternative', level: 'A', layer: 'n-a' },
  '1.2.4': { name: 'Captions (Live)', level: 'AA', layer: 'n-a' },
  '1.2.5': { name: 'Audio Description (Prerecorded)', level: 'AA', layer: 'n-a' },
  '1.3.1': { name: 'Info and Relationships', level: 'A', layer: 'automated' },
  '1.3.2': { name: 'Meaningful Sequence', level: 'A', layer: 'manual' },
  '1.3.3': { name: 'Sensory Characteristics', level: 'A', layer: 'manual' },
  '1.3.4': { name: 'Orientation', level: 'AA', layer: 'native' },
  '1.3.5': { name: 'Identify Input Purpose', level: 'AA', layer: 'automated' },
  '1.4.1': { name: 'Use of Color', level: 'A', layer: 'automated' },
  '1.4.2': { name: 'Audio Control', level: 'A', layer: 'n-a' },
  '1.4.3': { name: 'Contrast (Minimum)', level: 'AA', layer: 'automated' },
  '1.4.4': { name: 'Resize Text', level: 'AA', layer: 'native' },
  '1.4.5': { name: 'Images of Text', level: 'AA', layer: 'manual' },
  '1.4.10': { name: 'Reflow', level: 'AA', layer: 'native' },
  '1.4.11': { name: 'Non-text Contrast', level: 'AA', layer: 'automated' },
  '1.4.12': { name: 'Text Spacing', level: 'AA', layer: 'native' },
  '1.4.13': { name: 'Content on Hover or Focus', level: 'AA', layer: 'manual' },
  '2.1.1': { name: 'Keyboard', level: 'A', layer: 'native' },
  '2.1.2': { name: 'No Keyboard Trap', level: 'A', layer: 'native' },
  '2.1.4': { name: 'Character Key Shortcuts', level: 'A', layer: 'n-a' },
  '2.2.1': { name: 'Timing Adjustable', level: 'A', layer: 'n-a' },
  '2.2.2': { name: 'Pause, Stop, Hide', level: 'A', layer: 'manual' },
  '2.3.1': { name: 'Three Flashes or Below Threshold', level: 'A', layer: 'manual' },
  '2.4.1': { name: 'Bypass Blocks', level: 'A', layer: 'n-a' },
  '2.4.2': { name: 'Page Titled', level: 'A', layer: 'automated' },
  '2.4.3': { name: 'Focus Order', level: 'A', layer: 'manual' },
  '2.4.4': { name: 'Link Purpose (In Context)', level: 'A', layer: 'automated' },
  '2.4.5': { name: 'Multiple Ways', level: 'AA', layer: 'manual' },
  '2.4.6': { name: 'Headings and Labels', level: 'AA', layer: 'automated' },
  '2.4.7': { name: 'Focus Visible', level: 'AA', layer: 'native' },
  '2.5.1': { name: 'Pointer Gestures', level: 'A', layer: 'manual' },
  '2.5.2': { name: 'Pointer Cancellation', level: 'A', layer: 'manual' },
  '2.5.3': { name: 'Label in Name', level: 'A', layer: 'automated' },
  '2.5.4': { name: 'Motion Actuation', level: 'A', layer: 'n-a' },
  '3.1.1': { name: 'Language of Page', level: 'A', layer: 'native' },
  '3.1.2': { name: 'Language of Parts', level: 'AA', layer: 'n-a' },
  '3.2.1': { name: 'On Focus', level: 'A', layer: 'manual' },
  '3.2.2': { name: 'On Input', level: 'A', layer: 'manual' },
  '3.2.3': { name: 'Consistent Navigation', level: 'AA', layer: 'manual' },
  '3.2.4': { name: 'Consistent Identification', level: 'AA', layer: 'automated' },
  '3.3.1': { name: 'Error Identification', level: 'A', layer: 'automated' },
  '3.3.2': { name: 'Labels or Instructions', level: 'A', layer: 'automated' },
  '3.3.3': { name: 'Error Suggestion', level: 'AA', layer: 'manual' },
  '3.3.4': { name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', layer: 'n-a' },
  '4.1.2': { name: 'Name, Role, Value', level: 'A', layer: 'automated' },
  '4.1.3': { name: 'Status Messages', level: 'AA', layer: 'automated' },
};
