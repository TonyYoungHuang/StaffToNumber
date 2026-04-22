# Design System Specification: The Digital Score

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sonic Manuscript."** 

We are moving away from the rigid, sterile grids of standard SaaS platforms and toward an editorial experience that mirrors the elegance of a premium printed musical score. This system balances the technical precision required by educators with the soulful, atmospheric depth desired by performers. 

The aesthetic is driven by **Atmospheric Asymmetry**. By utilizing significant white space (rhythmic pauses) and high-contrast typography scales, we create a layout that feels composed rather than constructed. Overlapping elements and layered "glass" surfaces replace traditional borders, resulting in a UI that feels fluid, sophisticated, and unmistakably premium.

---

## 2. Colors
Our palette is rooted in the depth of a midnight performance hall. We use charcoal and deep indigo to create a canvas where "melody" and "rhythm" can vibrate.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or containers. Visual boundaries must be achieved through:
- **Tonal Shifts:** Placing a `surface-container-low` (#1c1b1b) card atop a `surface` (#131313) background.
- **Negative Space:** Using the spacing scale to create "silent" regions that naturally separate content.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to define importance:
- **Level 0 (Foundation):** `surface` (#131313) for the main application background.
- **Level 1 (Sections):** `surface-container-low` (#1c1b1b) for large architectural blocks.
- **Level 2 (Interaction):** `surface-container-high` (#2a2a2a) for active cards or floating panels.
- **Level 3 (Focus):** `surface-container-highest` (#353534) for tooltips and modal elements.

### The "Glass & Gradient" Rule
To add "soul" to the digital interface:
- **Glassmorphism:** For floating controls (like music playback bars), use `surface-variant` (#353534) at 60% opacity with a `24px` backdrop blur.
- **Signature Gradients:** Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#cdbdff) to `primary-container` (#360094) at a 135-degree angle to evoke movement.

---

## 3. Typography
The typographic system is a dialogue between the tradition of the **Newsreader** serif and the modernity of the **Manrope** sans-serif.

- **Display & Headlines (Newsreader):** Used for storytelling, page titles, and musical terms. The serif's characterful terminals evoke the ink of a hand-inked score.
- **UI & Labels (Manrope):** Used for all functional elements, data points, and navigation. It provides the "metronome"—the steady, legible pulse that keeps the user grounded.

**Hierarchy Strategy:** 
Use `display-lg` (3.5rem) for hero moments, paired immediately with `label-md` (0.75rem) for metadata. This extreme scale contrast creates an editorial, high-end feel that standard "step-by-step" hierarchies lack.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen. We reject heavy drop shadows in favor of **Tonal Layering**.

- **The Layering Principle:** A card does not need a shadow to be "above" the background; it simply needs to be one tier higher in the surface-container scale (e.g., `surface-container-lowest` on a `surface-container-low` section).
- **Ambient Shadows:** When a floating state is required (e.g., a dragged music file), use a shadow with a `32px` blur and `6%` opacity. The shadow color must be a tint of `on-surface` (#e5e2e1) rather than pure black.
- **The Ghost Border Fallback:** If accessibility requires a container edge, use the `outline-variant` (#454652) at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components

### Buttons
- **Primary:** `primary` (#cdbdff) fill with `on-primary` (#370096) text. Use the `xl` (0.75rem) roundedness for a modern, tactile feel.
- **Secondary:** Transparent fill with a "Ghost Border" and `primary` text.
- **Tertiary (Melody Blue):** Use `tertiary` (#00daf3) for specialized musical actions (e.g., "Record," "Sync").

### Cards & Lists
- **The Forbid Rule:** Divider lines are strictly forbidden. 
- **List Items:** Separate items using a `surface-container-low` background on hover, or simply 16px of vertical white space.
- **Feature Cards:** Use `surface-container-lowest` (#0e0e0e) for the card body to create a "sunken" or "carved" look against a `surface` background.

### Input Fields
- Avoid the "box" look. Use a `surface-container-highest` (#353534) bottom-weighted fill with no border. 
- The cursor/caret should always use the `tertiary` (#00daf3) color to provide a rhythmic "pop" of color during data entry.

### Music-Specific Components
- **The Waveform/Timeline:** Use `secondary-container` (#3c494f) for the background track and `tertiary` (#00daf3) for the active "Melody Blue" progress to ensure high visibility against the dark charcoal.
- **Metronome/Tempo Chips:** Use `secondary` (#bbc8d0) with `label-sm` typography. These should feel like small, precise machine-tooled parts.

---

## 6. Do's and Don'ts

### Do
- **Do** use intentional asymmetry. A heading might be left-aligned while the body text is indented by two grid columns to create a "musical" syncopation.
- **Do** use `Newsreader` for any text that is meant to be "read" (articles, descriptions) and `Manrope` for any text meant to be "used" (buttons, settings).
- **Do** leverage the `surface-bright` (#393939) token for subtle hover states on dark backgrounds.

### Don't
- **Don't** use pure black (#000000). Always use `surface` or `surface-container-lowest` to maintain the sophisticated "charcoal" depth.
- **Don't** use standard icons. All iconography must be custom-contoured, echoing the curves of musical notation (clefs, notes, and rests).
- **Don't** use harsh transitions. All state changes (hover, active, focus) should have a minimum `200ms` ease-in-out transition to mimic the swell of an instrument.