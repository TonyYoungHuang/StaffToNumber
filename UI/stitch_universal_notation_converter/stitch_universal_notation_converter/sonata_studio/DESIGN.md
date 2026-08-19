# Design System Specification: The Light Score Studio

## 1. Creative north star

ScoreTransposer is a light, precise music workspace. The visual metaphor is a clean score desk: white paper, quiet neutral surfaces, deep ink, and a single expressive brand accent.

The product must never default to a dark website or a dark application shell. Dark media may appear only when it is part of source content supplied by a user. Product chrome, navigation, forms, score review, pricing, support, and marketing surfaces remain light.

The design combines three qualities:

- the clarity and trust of a professional productivity tool;
- the rhythm and editorial spacing of printed music;
- the immediacy of a modern AI workspace where input and result are visible together.

## 2. Color system

### Foundation

- Page background: `#f7f8fc`.
- Quiet section background: `#f1f3f9`.
- Primary surface and score paper: `#ffffff`.
- Primary text: `#151a2d`.
- Secondary text: `#536078`.
- Soft metadata: `#778198`.
- Hairline: `#dfe3ee`.

### Brand and states

- Brand primary: `#5b4ee8`.
- Brand strong: `#4134c6`.
- Informational music accent: `#0b7f8c`.
- Confirmed/success: green, separate from the brand color.
- Review/low confidence: amber.
- Error: red.

Brand purple must not double as a success state. Green must not be used as the default brand color.

### Light-only rule

- Do not introduce a dark global theme.
- Do not use charcoal sections as a shortcut for visual drama.
- Create contrast with white paper, pale tinted sections, scale, spacing, imagery, and notation motion.
- Dialogs and floating controls use white elevated surfaces, not black glass.

## 3. Typography

- Use a highly legible sans-serif family for Chinese, English, numbers, settings, and dense product UI.
- Display headings may use a compatible editorial face later, but only after Chinese and musical-symbol coverage is verified.
- Hero headings use strong scale and tight leading; body copy remains calm and readable.
- Do not use a decorative serif inside operational forms or score correction controls.

Initial scale:

- Hero: 56–72px desktop, 36–42px mobile.
- Section title: 40–48px desktop, 30–36px mobile.
- Card title: 20–24px.
- Body: 17–20px.
- Helper text: 13–15px.

## 4. Layout and rhythm

- Public content max width: 1200–1280px.
- Major sections use 80–112px vertical spacing.
- Hero shows the input action and a real score result in the same viewport.
- Use full-width pale section backgrounds instead of placing every section inside a bordered panel.
- A viewport should not show more than two nested container edges.
- Use asymmetry only when it improves the input/result relationship or score reading.

## 5. Surfaces and elevation

- Primary cards use white surfaces on pale page backgrounds.
- Large workbenches use 18–24px radius.
- Standard cards use 14–18px radius.
- Controls use 10–14px radius.
- Pills are reserved for filters, compact modes, and status.
- Use shadows only for the hero workbench, drag state, popover, dialog, or another genuine floating layer.
- Ordinary sections should be separated by spacing and tonal shifts, not repeated borders.

## 6. Components

### Buttons

- Primary: solid brand purple, white text, one per section.
- Secondary: white surface, neutral border, dark text.
- Text action: no container until hover/focus.
- Success, warning, and destructive buttons use their semantic colors only when the action carries that meaning.

### Upload and input

- The primary public entry says exactly where the upload happens.
- The marketing site must not pretend that a file was uploaded when the protected app owns the real upload flow.
- Product upload surfaces expose accepted formats, free limits, privacy, progress, error, and recovery states.

### Score proof

- Prefer real OSMD/VexFlow output and real product captures.
- Show the relationship among source scan, OMR candidate, diagnostics, confirmed revision, Jianpu, transposition, playback, and export.
- Never use decorative fake notation as evidence of engine quality.

### Status and uncertainty

- OMR results are candidates until confirmed.
- Low-confidence notation uses amber plus text and a location cue.
- Confirmed revisions use green plus text/icon.
- Errors use red plus a recovery action.
- Color is never the only status signal.

## 7. Motion

- Motion explains state, progress, revision change, playback, or notation transformation.
- Normal transitions: 180–300ms.
- Hover movement stays within 1–2px or about 1.01–1.03 scale.
- Pressed states may use about 0.98 scale.
- Playback cursors and measure highlights should feel rhythmic but never obscure notation.
- Respect `prefers-reduced-motion` everywhere.

## 8. Responsive behavior

- Use an explicit mobile menu instead of relying on an invisible horizontal navigation scrollbar.
- Keep the hero action and result understandable at 390px.
- Touch targets are at least 44px.
- Score previews use deliberate zoom, pan, or open-large behavior instead of becoming unreadably small.
- Do not hide the product result simply to make the mobile hero shorter.

## 9. Accessibility and truthfulness

- Preserve visible keyboard focus.
- Tabs, accordions, menus, upload controls, and dialogs use correct semantics.
- Provide alternative text for score and product evidence.
- Videos default to muted and provide pause and text alternatives.
- Public claims match the currently deployed capability flags.
- Do not fabricate usage counts, testimonials, processing quality, or supported formats.

## 10. Product architecture rule

Every durable UI path returns to the same MusicXML and Score JSON score project:

```text
PDF/image/audio source
→ candidate import and diagnostics
→ confirmed Score JSON revision
→ correction / Jianpu / transposition / playback
→ MusicXML / MIDI / PDF / image / audio outputs
```

The design may present focused entry pages, but it must not imply that these are disconnected one-off converters.
