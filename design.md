# Design — BAP System

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

This is an **admin panel**, not a marketing site. The diversification rule that
normally makes consecutive Hallmark outputs differ is **inverted here**: pages
must share the system, not differ from each other. A page that drifts from this
file is the defect.

## Genre

modern-minimal

## Macrostructure family

One family only — this app has no marketing or content surfaces.

- App pages: **Workbench**. Variation knobs: panel count, panel arrangement
  (single column · two-up · left-form/right-list · **left-rail/right-canvas**),
  and whether the header carries an action cluster. Everything else is fixed.

  *left-rail/right-canvas* (`19rem`–`22rem` sticky rail + `minmax(0,1fr)`
  canvas) is for pages where controls or input tools serve one large artifact —
  Preview & Print (settings → document) and Master Mahasiswa (import tools →
  table) are the reference implementations. Controls collect into stacked panels in the rail;
  the artifact owns the rest of the width. Never stack control rows above the
  artifact: four full-width filter rows push the thing the page exists to show
  below the fold.

## Shell

There is **no chrome bar**. Page identity lives in the content column.

- `<PageShell>` — the only container. **No max-width cap** — content fills the
  column beside the rail. `px-5 / sm:px-8 / lg:px-10` (40px at desktop),
  `pt-7 pb-16`. Every page uses it; no page sets its own width.
- `<PageHeader>` — title (28–31px, weight 600), one muted meta line (a sentence
  **or** a count), optional right-aligned action cluster. **No rule beneath it** —
  the gap is the separator. Carries the mobile sidebar trigger inline.
- `<PageSections>` — `flex flex-col gap-6` between top-level blocks.
- Nav: **N3 side-rail, floating inset**. Rounded panel, hairline border.

### Shell metrics (measured off the reference)

| | |
|---|---|
| Rail column | 288px (`--sidebar-width: 18rem`) |
| Rail inset | 16px each side → 256px panel |
| Rail inner padding | 12px (`px-3`) |
| Nav item | 40px tall, 46px pitch (`h-10` + `gap-1.5`) |
| Nav icon → label | 18px icon, 12px gap |
| Nav label | 15px (`0.9375rem`) |
| Group label | 11px uppercase, `0.07em` (`.hm-eyebrow`) |
| Dividers | under the rail header, above the account block — inset to the items |
| Content side padding | 40px at desktop, no max-width cap |
| Page title | 30px / 600 (`sm:text-[1.875rem]`) |
| Header → content gap | 28px (`mb-7`) |
| Buttons | 36px tall (`h-9`), radius 10px |
| Collapsed rail | 88px column (56px panel + 16px inset), 8px inner padding, 40px square items |

### Collapsed rail

The rail must stay usable, not merely narrow:

- Labels are **hidden outright** (`[&>span]:hidden`), never truncated. A clipped
  first letter beside an icon is the failure this rule exists to prevent.
- Group labels are `display: none` — not `opacity: 0`, so they stop claiming
  vertical space. The grouping they carried is restored by a **hairline between
  groups**, otherwise eleven icons read as one undifferentiated column.
- The wordmark becomes the **expand control** and swaps to a panel icon on
  hover. Without it the rail has no way back — `Ctrl/⌘ + B` is a shortcut, not
  an affordance.
- Every item keeps its `tooltip`, which only renders in this state.
- The account row stays reachable: it shrinks to the 40px avatar and still opens
  the menu, so Export / Pengaturan / Reset / Keluar are never stranded behind an
  expand step.

- **The rail carries no action button at all.** It navigates, and nothing else.
  A page's primary action goes in `<PageHeader actions>`; the one global action
  (Export Excel) sits inside the account menu, with Pengaturan, Reset data, and
  Keluar. A filled CTA block in the footer competed with the nav for attention
  and pushed the account row off its baseline.
- Save state is a **floating pill**, bottom-right. It has no bar to live in.

## Theme

Cobalt, retuned neutral. Indigo is preserved from the original build but capped.

- `--ground`      `oklch(1 0 0)` — white page floor, same value as `--panel`.
  A panel is separated from the page **only** by its hairline, never by tone.
  Do not tint the ground to "make cards pop" — that is the change that made
  this shell read grey against the reference.

**Surfaces run bright.** Every neutral surface sits at L ≥ 0.97; the greys are
present only to the degree a state needs to be legible (hover, active nav, icon
tile, table head). Nothing in this app is a mid-grey panel.
- `--panel`       `oklch(1 0 0)` — the one card surface
- `--panel-2`     `oklch(0.988 0.001 286)` — panel hover / recessed rows
- `--rule`        `oklch(0.938 0.003 286)` — hairline; carries all elevation
- `--foreground`  `oklch(0.19 0.006 286)` — ink
- `--muted-foreground` `oklch(0.552 0.014 286)`
- `--tile`        `oklch(0.979 0.001 286)` — neutral tile (avatars, `tone="neutral"`)
- `--tile-ink`    `oklch(0.44 0.012 286)`
- `--nav-active`  `oklch(0.972 0.002 286)` — active nav fill, **never indigo**
- `--primary`     `oklch(0.21 0.006 286)` — **ink, not indigo.** A filled action
  button only reads as the strongest thing on a white page if it is nearly
  black. Inverted on dark (`oklch(0.985 0 0)`), where a black fill would vanish.
- `--brand`       `oklch(0.488 0.243 264.376)` — the hue, declared once
- `--brand-soft`  `oklch(0.957 0.022 265)` — icon-tile fill
- `--link`        `var(--brand)` — text links
- `--ring`        `var(--brand)` — focus ring
- `--warn`        `oklch(0.545 0.135 62)` — semantic warning
- `--warn-soft`   `oklch(0.963 0.032 72)` — warning surface

`--warn` is for a **degraded dependency or a soft failure** (a remote API that
didn't answer, a search that returned nothing). It is not `--destructive`, which
is reserved for actions that destroy data. Keeping them apart stops every
non-happy path from shouting in red. Never reach for a raw Tailwind palette
(`bg-orange-50`, `text-green-600`) for these — that is how the pre-redesign
build ended up with five unrelated status colours.

Dark mode mirrors this with elevation carried by **lightness**, never by glow
shadow: ground `oklch(0.152 …)` → panel `oklch(0.197 …)` → panel-2 `oklch(0.234 …)`.

### Accent budget

Indigo may occupy **no more than ~4% of any viewport**, and after the primary
button went to ink it sits well under that. Its only sanctioned homes are:
**text links** (`--link`), the **focus ring** (`--ring`), and **chart series**.

**Where the colour lives.** Buttons are ink, so if nothing else carried the hue
the app would read flat. It is carried by:

- **Icon tiles** — `bg-brand-soft` + `text-brand` on every `<IconTile>`. This is
  the reference's own move; its cards use a tinted tile, not a tinted button.
- **The active nav mark** — the fill stays neutral, but the icon takes
  `--brand`, so "you are here" is a colour signal rather than another grey.
- **Text links**, the **focus ring**, and **chart series**.

Panel heads, filter chips, and button fills stay neutral. Chart series step
down in chroma (`--chart-1` … `--chart-5`) rather than reaching for new hues.

A black underlined word is not a link — that is why `--link` exists separately
from `--primary`. Never point a text link at `--primary`.

## Typography

- Display: **Figtree**, weight 600, `font-style: normal`
- Body: **Figtree**, weight 400
- Mono: Geist Mono (tabular figures, NIM columns — Figtree has no mono cut)

Figtree is a **variable** font (wght 300–900), so `next/font` needs no weight
array — every weight the UI asks for is a real cut rather than a synthesised
one. If you swap to a non-variable face (Poppins, for one), you must list every
weight explicitly or the browser fakes the missing ones.

Chosen as the closest free stand-in for **Gellix**, the commercial geometric
sans in the reference shell. Gellix is not on Google Fonts and needs a purchased
webfont licence self-hosted through `next/font/local`; Figtree matches its
geometric bowls and tall x-height without the licence.

**Wiring, not just importing.** `next/font` only *declares* a CSS variable —
it does not apply anything. The variable has to be mapped in `@theme inline`
(`--font-sans: var(--font-poppins), …`) and applied on `body`. This project
shipped a `--font-geist-sans` declaration for months with no `font-family` rule
reading it, so the app rendered in the browser's default sans the whole time.
If you swap the typeface, check the rendered output, not the import.

`<html>` therefore carries **both** `font.className` (applies `font-family`
directly) and `font.variable` (exposes the custom property for Tailwind). The
className is the safety net: if the variable chain breaks, `body`'s declaration
becomes invalid at computed-value time and simply inherits the right face from
`<html>` instead of collapsing to the system sans.

**Turbopack's cache survives a plain restart.** After changing `next/font` or an
`@theme` block, a stale chunk can keep serving the old CSS. Stop the dev server,
delete `.next`, then start again — and verify in the built CSS, not by eye.

### Printed documents are exempt

BAP documents print in **Times New Roman** by institutional convention. That is
a document requirement, not a theme choice, so it must never follow the UI
typeface. It is enforced in two independent places, deliberately:

- Each document component (`RecapTable`, `DaftarHadirDocument`, `BapDocument`)
  sets Times inline on its own root, so the on-screen preview matches the print
  output.
- Each `@media print` block in `PreviewPrintPage` re-forces it with
  `* { font-family: 'Times New Roman' … !important }`.

Belt and braces on purpose: the inline rule keeps preview and export identical,
the print rule catches anything nested that the inline rule doesn't reach.
- Display tracking: `-0.021em`
- Page title: `1.5rem` / `1.875rem` at `sm`
- Panel title: `0.875rem`, weight 600
- Micro-label (`.hm-eyebrow`): `0.6875rem`, weight 500, `0.07em`, uppercase

Headings are **roman**. No italic headers, no gradient text. Any container of
tabulated figures gets `font-variant-numeric: tabular-nums` (`<table>` and
`[data-numeric]` get it automatically).

## Spacing

4-point named scale, `--space-3xs` … `--space-2xl`, in `globals.css`. Pages use
Tailwind's scale, which maps onto it.

## Geometry

- `--panel-radius` `0.875rem` — panels, empty states, tiles
- `--control-radius` `0.625rem` — buttons, inputs, nav items, chips
- `--tile-radius` `0.625rem` — icon tiles

There is **one card shape**. `<Panel>` is it. Do not hand-roll
`bg-card rounded-xl border shadow-sm` — that is what made the old build read as
assembled rather than designed.

## Charts

Every series colour comes from `--color-chart-1…5` or the categorical
`--reason-*` set. Never a raw palette class, never a new hue invented at the
call site.

**A chart has to answer a question someone actually asks.** The dashboard's old
per-subject bar chart ranked absences across every course — real data, but no
decision followed from it. What replaced it answers *"which week am I behind
on"* and *"is attendance degrading"*, which are the two questions this app
exists to serve.

**Prefer a chart that does something.** The semester-progress bars are
clickable and set the selected week, so the chart is a control as well as a
picture. A chart you can only look at has to work harder to justify its space.

**Never invent a data point to fill a chart.** If the series is empty, render
the compact empty message instead of a plausible-looking curve.

**Absence figures come from `src/utils/attendance.ts` — never from
`students.length`.** A course split across two time slots on the same day is two
schedule rows but ONE teaching block, so summing raw rows double-counts.
`tallyWeekAbsence()` dedupes by `(blockKey, nim)`, treats a blank `remarks` as
unclassified rather than absent (matching the printed BAP), and keeps the most
severe remark when two slots disagree. `countEntryAbsence()` is the per-session
variant for the "Tdk Hadir" column, which must NOT dedupe — each session has its
own attendance sheet.

## Empty states

`<EmptyState>` is the only empty-case component. Anatomy, top to bottom:

1. **Dot field** (`.hm-empty-field`) — a masked radial-dot backdrop. It is the
   visual language of *a canvas nobody has filled yet*, which is what earns it a
   place: an ambient blob or a hand-drawn browser window would be decoration
   without a semantic anchor (gates 45 and 47). Masked so it fades well before
   the edges and never competes with the message.
2. **`<IconTile size="lg">`** — 56px, brand-tinted, hairline so it reads against
   the dots. Routed through the shared primitive; do not hand-roll a tile here.
3. **Title** (18px semibold) and **description**, capped at `max-w-sm` so the
   cluster reads as one object rather than three stranded elements.
4. **Actions** — short labels, never two lines.
5. **`hint`** *(optional)* — a hairline-separated rail for secondary routes in,
   or a constraint the user needs to know before their first attempt.
   **Caller-supplied only; never invent copy to fill it.** No hint, no rail.

`size="compact"` for empty states nested inside a panel body or a scroll region,
where the full `py-16 sm:py-20` is far too tall.

## Inline styles carry variables, never values

React assigns ordinary CSS properties straight to the CSSOM, and a value with a
nested `var()` — especially inside `color-mix()` — gets dropped on that path.
The element renders with no background at all. Custom properties go through
`setProperty` and survive.

**So: put the computation in a component class, and let the inline style carry
only the custom property.**

```tsx
/* wrong — silently renders nothing */
<button style={{ backgroundColor: `color-mix(in oklch, var(--note-blue) 55%, var(--panel))` }} />

/* right */
<button style={{ ['--note']: 'var(--note-blue)' }} className="hm-swatch" />
```

`.hm-note`, `.hm-swatch`, and `.hm-note-strip` all follow this shape.

## Dialogs

`src/components/ui/dialog.tsx` — Radix Dialog in the project's own import style.
`DialogHeader` / `DialogBody` / `DialogFooter` are three fixed regions: only the
body scrolls, so a long note never pushes the title or the Save button off the
sheet.

**Forms belong in a dialog, not inline.** An inline create panel toggles the
page between two heights and shoves the content below it; an inline *edit* form
inside a card resizes that card and breaks the grid around it. One dialog serving
both create and edit means one form, one code path, one shape.

`DialogContext` (`showAlert` / `showConfirm`) is a different thing — it is for
alerts and confirmations only, and stays that way.

### Colour as user data

When a colour is something the **user picked** (a note's colour), it is a token,
not a palette class. Declare **one hue anchor per colour** (`--note-blue`) and
derive the surface and border from it in a component class:

```css
.hm-note {
  background-color: color-mix(in oklch, var(--note) 9%,  var(--panel));
  border-color:     color-mix(in oklch, var(--note) 34%, var(--panel-2));
}
```

The element sets `--note: var(--note-blue)` inline. One token per colour instead
of three, and light/dark handled once.

**Watch the cascade:** `.hm-note` lives in `@layer components`, so any Tailwind
utility (`bg-panel`, `border-rule`) on the same element **wins**. Don't mix them
— either use the component class alone, or carry the hue some other way (the
note dialogs use a 3px top strip reading `var(--note)`).

## Filtering a saved collection

When a page lets the user narrow a list it already holds:

- **Derive the options from the data**, never from a hard-coded list. A dropdown
  that offers a value returning zero rows is a bug the user has to discover.
- Filters **combine with AND**, and stack with free-text search.
- The header meta switches to `"N dari M"` the moment anything is narrowed, so
  the user can always see they are looking at a subset.
- Ship a **visible reset** whenever a filter is active — both in the filter bar
  and in the empty state. An empty result with no way out is a dead end.
- Filter **client-side** when the collection is already fully loaded. Adding
  query params to an endpoint that returns the whole set anyway just adds a
  round-trip.

## Range sliders

Use `.hm-range`. `appearance: none` strips the **thumb** as well as the track in
WebKit, so any range styled with a Tailwind background silently becomes an
invisible, undraggable bar. `.hm-range` draws the thumb back on both engines
(`::-webkit-slider-thumb` and `::-moz-range-thumb`), sizes it to 16px, and moves
it to `--brand` on hover/drag. Never put `appearance-none` on a bare range.

## Scroll

Three classes, one language. Every scrollable surface in the app uses one.

| Class | Chrome | Edge fade |
|---|---|---|
| `.hm-scroll` | thin 6px thumb | vertical — top shade after you scroll down, bottom shade until you reach the end |
| `.hm-scroll-x` | thin 6px thumb | horizontal — same cue on the inline axis, for wide tables |
| `.hm-scrollbar` | thin 6px thumb | none — use when the scroller draws its own border, since a fade clips it |

Two affordances on purpose:

- The **thumb is always faintly visible** (`--scroll-thumb`) whenever an area
  scrolls, so it announces itself before you touch it; it firms up to
  `--scroll-thumb-strong` on hover/focus and to `--tile-ink` while dragging.
  Do not make the thumb transparent at rest — that is the pattern that leaves
  people unaware the area moves.
- The **edge fade** is driven by the element's own scroll position via
  `animation-timeline: scroll(self)`, so it says "there is more past this edge"
  and retires when there isn't. When the content doesn't overflow, the timeline
  is inactive and the fade lengths fall back to `0` — no fade on a short list.

Wrapped in `@supports (animation-timeline: scroll())`; browsers without it get
the thumb alone. Under `prefers-reduced-motion: reduce` the fade is dropped
entirely and the thumb carries the affordance on its own.

### Overscroll containment is per-axis — never blanket

`overflow-x: auto` promotes the *other* axis from `visible` to `auto`. A
horizontally-scrolling table is therefore a vertical scroll container too — one
that never has anywhere to go. Putting `overscroll-behavior: contain` on it
swallows the wheel, and **the page stops scrolling wherever a table sits under
the cursor**.

- `.hm-scroll` → `overscroll-behavior-y: contain` (real vertical panes)
- `.hm-scroll-x` / `.hm-scrollbar` → `overscroll-behavior-x: contain` only,
  which still suppresses swipe-to-go-back while letting the wheel chain to the
  page

Never write the shorthand `overscroll-behavior: contain` on a scroller in this
codebase.

## Elevation

Hairline borders carry elevation. Panels are **shadow-less**. `shadow-lg` is
reserved for genuine overlays: modals, dropdowns, the saving pill.

The hairline is deliberately faint. On displays at ≥ 1.5 dppx the panel
surfaces (`[data-slot="panel" | "stat-tile" | "action-tile" | "empty-state"]`,
the rail, `.hm-panel`) drop to `border-width: 0.5px` — a real half-pixel line,
not just a lighter one. Form fields keep the full 1px: an input has to read as
editable, so `--input` sits a step firmer than `--rule`.

Since ground and panel are both white, this hairline is the **only** thing
separating a panel from the page. Lighten it further and the structure goes.

## Motion

- Easings: `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in`, `--ease-in-out`
- Durations: `--dur-instant` 90ms · `--dur-short` 180ms · `--dur-medium` 280ms
- Named properties only. **`transition-all` is banned.**
- Reveal pattern: **none**. The page is composed, not animated in.
- Reduced-motion: global `prefers-reduced-motion: reduce` collapses everything
  to ~0ms.
- Focus rings appear **instantly** — never inside a transition.

## Microinteractions stance

- Silent success. Toasts only for failures and async work whose effect is invisible.
- Optimistic update + Undo over confirmation dialogs, except for genuinely
  irreversible destructive actions (reset data, semester archive).
- Hover tooltip delay 800ms · focus tooltip delay 0ms.
- **No hover-only controls.** Row and card actions stay visible (at reduced
  opacity) and come to full strength on `group-hover` *and* `group-focus-within`.
  An affordance that only exists on hover does not exist on touch or keyboard.
- Under three motion primitives per page.

## CTA voice

- Primary: `<Button>` default — **ink fill, white label**, `--control-radius`,
  one line. This is the header's action button.
- Secondary: `<Button variant="outline">` — hairline, panel fill.
- Tertiary: `<Button variant="ghost">`.
- The rail has **no CTA**. Every action button in the app is either a
  `<PageHeader>` action or an item in the account menu.
- Labels are one or two words and **never wrap to two lines**.

## Per-page allowances

- App pages **must not** use enrichment. Function carries the page.
- No hero illustrations, no decorative background elements, no icon-tile
  feature grids used as decoration.

## What pages MUST share

- `<PageShell>` container and its side padding.
- `<PageHeader>` shape: title · meta · optional actions, no rule beneath.
- `<Panel>` as the only card, with `<PanelHeader>` carrying a **neutral** 40px
  icon tile.
- `<EmptyState>` for every empty case.
- The accent budget and its placement.
- Geist display + body.
- The CTA voice.

## What pages MAY differ on

- Panel count and arrangement within the Workbench family.
- Whether the header carries an action cluster, and what is in it.
- Whether the header carries an action cluster.

## Banned in this codebase

These were present in the pre-redesign build and must not return:

- Gradient hero banners, gradient headlines (`bg-clip-text`), aurora blur blobs
- Glassmorphism panels (`backdrop-blur` outside genuine modal backdrops)
- Emoji standing in for icons (`📋`, `📄`, `✨`)
- Per-page ad-hoc palettes (`bg-green-600`, `bg-violet-600`, `bg-amber-600`,
  `bg-blue-600` as button fills)
- Four different container max-widths
- Page-specific actions in the sidebar rail
- The page title rendered twice (chrome bar + in-page heading)
- `transition-all`
- Hand-rolled card classes

## Exports

### tokens.css

See [`tokens.css`](tokens.css) at the project root — the portable extraction of
this system. `src/app/globals.css` is the live implementation.

### Tailwind v4 `@theme`

The live `@theme inline` block lives in `src/app/globals.css`. It maps every
token above onto Tailwind utilities: `bg-ground`, `bg-panel`, `bg-panel-2`,
`border-rule`, `bg-tile`, `text-tile-ink`, `rounded-panel`, `rounded-control`,
`rounded-tile`.
