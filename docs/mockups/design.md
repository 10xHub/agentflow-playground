# Agentflow Playground — Design System

Status: Draft for the HTML mockup stage. This is the visual source of truth for the
mockups and the later React build. Style direction: **minimalism, dark-first (OLED)**.

## 1. Philosophy

This is a developer & debugging console, not a marketing surface. The design gets out of
the way so data and controls are legible at a glance.

- **Restraint over decoration.** No gradients-as-branding, no glows, no staggered
  entrance animations. Surfaces are flat; hierarchy comes from spacing, weight, and a
  single accent.
- **One accent, used sparingly.** Green signals *live / connected / success* only. The
  primary action is a high-contrast neutral button, not a colored one. Color is never the
  only signal (icon + text always accompany it).
- **Monospace for machine data.** URLs, tokens, IDs, timings, capability names, and any
  value the backend returns are set in mono. Prose and labels are sans.
- **Calm motion.** Transitions are 150–200ms, opacity/transform only, and exist to explain
  a state change (probe result appears, field toggles) — never to entertain.
- **Honest states.** Off/disabled capabilities are shown muted, not hidden, so the tool
  never implies more than the backend supports.

## 2. Color tokens (dark)

Slate-based, OLED-friendly. Defined as CSS variables; components never use raw hex.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0B0C0E` | App background (flat, near-black) |
| `--surface` | `#131417` | Cards, panels |
| `--surface-2` | `#17181C` | Nested/secondary surface |
| `--elevated` | `#1C1D22` | Inputs, chips, hover fills |
| `--border` | `#26272D` | Default 1px borders/dividers |
| `--border-strong` | `#33353D` | Hover/emphasis borders |
| `--text` | `#ECEDEF` | Primary text (≥ 4.5:1 on all surfaces) |
| `--text-secondary` | `#9A9EA7` | Labels, secondary text (≥ 3:1) |
| `--text-muted` | `#63676F` | Hints, disabled, placeholders |
| `--accent` | `#3ECF8E` | Live / connected / success ONLY |
| `--accent-weak` | `rgba(62,207,142,0.12)` | Accent fill (badges, check bg) |
| `--danger` | `#F26D6D` | Destructive actions, errors |
| `--warn` | `#E5B567` | Warnings, near-expiry |
| `--btn-bg` | `#F2F3F5` | Primary button fill (neutral, high contrast) |
| `--btn-text` | `#0B0C0E` | Primary button text |
| `--focus-ring` | `rgba(236,237,239,0.10)` | Neutral focus ring (with border shift) |

Light mode is a secondary target; when built it uses tonal (not inverted) values and is
contrast-tested independently. The mockup ships dark-first with a light stub.

## 3. Typography

- **Sans (UI):** Fira Sans — labels, prose, buttons. Fallback: system sans.
- **Mono (data):** Fira Code — URLs, tokens, IDs, timings, capabilities, JSON. Fallback:
  `ui-monospace, "SF Mono", Menlo, monospace`.
- **Tabular figures** for any aligned numbers (timings, token counts).

Scale (px): `12` micro/labels · `13` body/inputs · `14` emphasized body · `20` section
titles · `28` page title. Line-height 1.5 for prose, 1.3 for headings.
Weights: 400 body · 500 labels/nav · 600 headings & primary button.

## 4. Spacing, radius, layout

- **Spacing scale (px):** 4 · 8 · 12 · 16 · 20 · 24 · 30 · 40. 8px rhythm.
- **Radius:** `6` small (chips, checks) · `8` inputs/buttons · `10` cards. Deliberately
  tight — minimalism, not rounded/playful.
- **Borders:** 1px, `--border`; hover → `--border-strong`. Dividers may be dashed for
  metadata separators only.
- **Elevation:** effectively flat. At most a single soft shadow on the top-level card
  (`0 16px 40px -24px rgba(0,0,0,0.6)`); no layered shadow scale.
- **Container:** entry card max-width 920px; collapses to single column < 820px.

## 5. Components

- **Input / select:** 40px tall, `--elevated` fill, 1px `--border`, mono text for values.
  Focus: border → `--text-secondary` + 3px `--focus-ring`. Placeholder `--text-muted`.
- **Primary button:** `--btn-bg` fill, `--btn-text`, 600 weight, 44px tall. Loading =
  inline spinner + disabled. One primary per screen.
- **Secondary / ghost button:** transparent fill, 1px `--border`, `--text-secondary`;
  hover raises text to `--text` and border to `--border-strong`.
- **Card:** `--surface`, 1px `--border`, radius 10. Two-pane entry card splits form
  (left) and status (right) with a 1px divider.
- **Status dot:** 8px circle. `--accent` = live; `--text-muted` = idle. Always paired with
  a text label.
- **Badge / chip:** 11–12px, `--elevated` fill, 1px border; mono for technical values.
- **Capability row:** icon-box (check = `--accent` on `--accent-weak`; off = muted dash) +
  mono label. Off rows sit at ~0.5 opacity.
- **Toggle:** 38×22 track; on = accent-tinted track + accent knob.

## 6. Motion

- Micro-interactions 150–200ms, `ease-out` in / `ease-in` out.
- Only transform + opacity animate. No width/height/top/left animation, no layout shift.
- Probe result fades/rises 8px once; capability rows appear together (no per-item stagger).
- Respect `prefers-reduced-motion`: disable non-essential transitions.

## 7. Accessibility

- Primary text ≥ 4.5:1, secondary ≥ 3:1, verified per surface, both themes.
- Every interactive element has a visible focus ring; focus order matches visual order.
- Color never carries meaning alone — status/capability always has icon + text.
- Touch/click targets ≥ 40px tall; `cursor: pointer` on all clickable elements.
- Password/token fields use a show/hide toggle; inputs use semantic types.

## 8. Anti-patterns (explicitly avoided)

- Gradient/glowing logos or buttons as branding.
- Multiple accent colors, or accent used for non-status decoration.
- Staggered "pop" entrance animations, decorative motion.
- Emoji as icons (use SVG/stroke icons, consistent 1.5px stroke).
- Hiding unsupported capabilities instead of muting them.
