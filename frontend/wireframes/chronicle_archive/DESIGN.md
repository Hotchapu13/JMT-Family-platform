```markdown
# Design System Strategy: The Living Archive

## 1. Overview & Creative North Star
**Creative North Star: The Digital Curator**

This design system is not a template; it is a curated exhibition. It rejects the "app-like" rigidity of modern SaaS in favor of a high-end editorial experience that feels like walking through a private library at dusk. We move beyond the grid by utilizing intentional asymmetry, overlapping elements, and generous whitespace that evokes the feeling of artifacts laid out on a physical desk.

The system is designed to feel authoritative yet tactile. By layering "parchment" surfaces and utilizing ink-like typography, we bridge the gap between historical preservation and modern digital performance. This is a space for deep focus, where the UI recedes to let the "legacy" take center page.

---

## 2. Colors & Tonal Depth
Our palette is rooted in natural materials: vellum, oxidized ink, sun-scorched earth, and forest pigments.

*   **Primary (`#a23900`):** Legacy Orange. Used for calls to action and critical interactive wayfinding. It represents the "spark" of discovery.
*   **Secondary (`#4e6352`):** Heritage Green. Used for grounding elements, tertiary backgrounds, and moments of calm.
*   **Neutral/Background (`#fff8ef`):** Parchment Cream. This is the foundation. A subtle vellum texture overlay is required on the base `surface` to prevent a "flat" digital feel.

### The "No-Line" Rule
Explicitly prohibit the use of 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through background color shifts. Use `surface-container-low` to define a new content area against a `surface` background. The eye should perceive the change in "paper weight" rather than a drawn line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of documents. 
*   **Surface (Base):** The primary vellum sheet.
*   **Surface-Container-Low:** Inset areas for secondary information (e.g., sidebars or archival metadata).
*   **Surface-Container-High:** For interactive "cards" or "specimens" that need to appear closer to the user.

### The "Glass & Gradient" Rule
To avoid a static appearance, use "Vellum Glass" for floating navigation bars or modals. Utilize `surface` colors at 85% opacity with a `20px` backdrop-blur. For primary CTAs, apply a subtle linear gradient from `primary` to `primary_container` to give the button a "die-cut" physical depth.

---

## 3. Typography
The typography system is a dialogue between the old world (Serif) and the new (Sans-serif).

*   **Display & Headlines (Noto Serif / Playfair):** These are our "titles on the museum wall." Use `display-lg` for hero moments with tight tracking (-2%) to emphasize the elegance of the serif.
*   **Body & Titles (Work Sans / Montserrat):** The "Curator’s Notes." These are set with a generous 1.5 line height for maximum legibility. 
*   **Label Scale:** Labels should be uppercase with +10% letter spacing, evoking the feel of cataloged index cards.

The contrast between the sophisticated, slightly flamboyant serifs and the utilitarian sans-serifs creates a sense of academic rigor and premium storytelling.

---

## 4. Elevation & Depth
In this system, elevation is achieved through **Tonal Layering** rather than light sources.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft "lift" that mimics paper resting on paper.
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(44, 44, 44, 0.06)`. The shadow must be tinted with `on-surface` (`#1e1b13`) rather than pure black to maintain the warmth of the library environment.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similar tone, use a "Ghost Border": the `outline-variant` token at 15% opacity. Never use 100% opaque borders for containers.
*   **Glassmorphism:** Use semi-transparent layers for elements like "Artifact Overlays." This allows the underlying texture of the "parchment" background to bleed through, ensuring the UI feels integrated into the environment.

---

## 5. Components

### Buttons
*   **Primary:** Sharp 0px corners. Background: `primary`. Text: `on_primary`. No border.
*   **Secondary:** Sharp 0px corners. Background: `transparent`. Border: 1px "Ghost Border" using `outline`. 
*   **States:** On hover, primary buttons should shift to `primary_container` with a subtle 2px lift via an ambient shadow.

### Cards (The "Exhibit Box")
*   **Structure:** No borders. Use `surface-container-high`. 
*   **Images:** Images within cards must feature a 1px solid border (`#E8DFD0`) and a soft 15% opacity drop shadow, making the photograph appear "pasted" onto the archival record.
*   **Spacing:** Use `spacing-8` (2.75rem) for internal padding to maintain an editorial, airy feel.

### Input Fields
*   **Style:** Minimalist. Only a bottom-border using `outline-variant`. 
*   **Focus:** The bottom border transitions to `primary` (Legacy Orange). Labels use `label-md` and sit above the field like a typewriter header.

### Lists & Dividers
*   **Rule:** Forbid the use of horizontal divider lines. 
*   **Execution:** Use vertical white space (`spacing-6` or `spacing-8`) and subtle shifts to `surface-container-low` to distinguish between list items.

### Special Component: The "Archival Timeline"
A custom component for this project. A vertical line using `outline-variant` at 20% opacity, with `primary` orange dots representing "Historical Milestones." Labels use `title-sm` with `notoSerif` for a dated, historical feel.

---

## 6. Do's and Don'ts

### Do:
*   **Use Intentional Asymmetry:** Offset images from text blocks to create an editorial layout.
*   **Embrace Whitespace:** Treat the screen like a physical page; don't feel the need to fill every corner.
*   **Micro-Animations:** Use `scroll-reveal` to fade elements in with a slight vertical slide (20px) to mimic a curator laying items on a table.

### Don't:
*   **Don't use Rounded Corners:** This system is built on the precision of cut paper and architectural lines. `0px` radius is mandatory for all components.
*   **Don't use High-Contrast Dividers:** Never use a dark line to separate content. Use a change in the surface container tone.
*   **Don't use Standard Drop Shadows:** Avoid the "floating app" look. Shadows should be so subtle they are felt, not seen.
*   **Don't use Pure Black:** Always use `Ink Charcoal` (#2C2C2C) for text to maintain the organic, ink-on-paper quality.

---

## 7. Motion & Interaction
*   **Parallax Transitions:** Background vellum textures should move at 10% of the scroll speed to provide a sense of physical depth.
*   **Signature Interaction:** When hovering over an "Artifact" (Image), the 1px border should change from `heritage-green` to `legacy-orange`, and the drop-shadow should slightly expand, mimicking a magnifying glass effect.```