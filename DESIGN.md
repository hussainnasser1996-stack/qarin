---
name: Qarin
concept: "Shelf label: the lowest price wears the yellow tag a Gulf electronics shop hangs on the shelf"
colors:
  paper: "#eef1f0"
  surface: "#ffffff"
  sunk: "#f6f8f7"
  ink: "#0c1f24"
  ink-2: "#3a4f55"
  muted: "#66777b"
  line: "#dde3e2"
  line-strong: "#c3cdcc"
  tag: "#ffd23d"
  tag-ink: "#1d1700"
  tag-edge: "#e8b900"
  deal: "#0a8457"
  deal-ink: "#05603f"
  deal-wash: "#e3f5ec"
  warn: "#b04d0c"
  warn-wash: "#fcefe3"
  focus: "#1d5fd6"
dark:
  paper: "#0b1416"
  surface: "#121d20"
  ink: "#e7eeee"
  deal: "#3bc88f"
  warn: "#f19a55"
  tag: "#ffd23d (unchanged: the tag is the same object in any light)"
typography:
  display: "Readex Pro 500/600/700 (headings, prices in tags, logo)"
  body: "IBM Plex Sans Arabic 400/500/600/700 (Arabic + Latin)"
  body-size: 15px
  floor: 11px functional, 12px sentences
  numerals: Western digits in both languages, tabular-nums, isolated LTR (.num / .ltr)
radius: 14px panels; tag is 6px on the hole side, full round on the point side
---

## Overview
Qarin is a price list, not a magazine. The page has one job: show where the same product is cheapest, and by how much. The signature is the **shelf label**: the lowest price sits on a yellow tag with a punched hole, the way it would on a real shop shelf. Next to it, a **spread bar** puts every store's price on one line, so the gap is something you can see, not just read.

## Colors
- Cool grey-green paper, deep teal-black ink.
- **Tag yellow (`--tag`) marks the lowest price, and nothing else.** That covers the PriceTag component, the cheapest dot on a spread bar, the cheapest country in the GCC comparison, and the logo. Never use it for buttons, banners or decoration.
- **Deal green (`--deal`) means savings.** Use it for "save X", "good price" verdicts, drop percentages and the lowest-price chart line.
- **Amber (`--warn`) means "wait"**: usually cheaper, or a price raised before a "sale". It is never decoration.
- Dark mode redefines the tokens through `prefers-color-scheme`. The tag stays yellow.

## Typography
- Readex Pro is the display face, used sparingly: headings, tag prices, logo. It has Arabic and Latin with matching geometry.
- IBM Plex Sans Arabic is the body face for both scripts.
- Arabic gets line-height 1.75 and no letter-spacing.
- Prices are always `.num`: tabular figures, isolated LTR, so "BHD 334.500" never flips inside Arabic text.

## Layout
- Search first. Routes are `/{cc}/{lang}`, and Arabic is fully RTL (`dir="rtl"` on `<html>`).
- Lists are **rows in one panel**, not card grids. Each row has an image, name, spread bar, then the PriceTag on the end edge.
- **Home:** the hero ticket shows the biggest price gap in the country today, with the spread bar animated. If no country gap is available, it falls back to a GCC cross-country ticket. Below it: categories, then biggest gaps, then drops, then stores.
- **Product page:** a header panel with the big tag, the saving and the per-store spread. Then the offer table (in stock first; out of stock collapsed), the history chart, the GCC comparison, the alert form, details and "report a problem". A sticky price bar shows on mobile.

- Use logical properties throughout (`ms-`, `pe-`, `start-`, `text-start`), so RTL mirrors without extra rules.

## Elevation & Depth
- The page is flat: `.panel` uses a 1px `--line` border on `--surface`, with no shadows.
- The only depth is the tag's inset bottom edge (`--tag-edge`), which makes it read as a physical label.

## Shapes
- `.tag` has a punched hole (`::before`). Its point side faces the inline end, and it mirrors in RTL.
- `.spread-fill` and `.dot` mirror their gradient and translate in RTL.

## Motion
- `draw` (the spread bar fills) and `pop` (the tag lands) run once on load.
- Both are off under `prefers-reduced-motion`.

## Components
`Header` (logo is a `.tag` "ق"), `SearchBox` (autocomplete, Arabic → English term mapping), `LocaleSwitch`, `ProductList`, `SpreadBar`, `PriceTag`, `PriceChart` (Recharts), `AlertForm`, `ReportForm`, `MerchantForm`, `Consent`, `Footer`.

## Do's
- Verdict pill: great (green wash), fair (paper), wait (amber wash), new (muted, until 14 days of history).
- Chart: step lines, because prices change in steps. The lowest line is green and 2.5px. Store lines are muted and off by default.
- Every price shows its store and "checked X ago", with the exact time on hover.
- Count **distinct stores**, not offers. A store selling three colours at one price counts once.
- Put base styles in `@layer base` and component classes in `@layer components`. An unlayered `a { color: inherit }` once beat Tailwind utilities and made the go-to-store button text invisible.
- Share images (`opengraph-image`) only embed PNG/JPEG, because Satori can't decode WebP. Every div with more than one child needs `display:flex`.

## Don'ts
- No paid placement. Rank stores by price only.
- Don't put `dynamicParams = false` on the `[cc]/[lang]` layout. It applies to child routes and 404'd every product page that wasn't pre-built.
- Don't add `loading.tsx` to the product route. Streaming starts before `notFound()`/`permanentRedirect()`, so search engines get 200 for missing or moved products.
- Don't run the retailer images through the Vercel image optimiser (`images.unoptimized`), because of the quota.
- Don't use more accent colours. Yellow means cheapest, green means saving, amber means wait.
- Don't machine-translate Arabic copy and ship it. The current Arabic strings are drafted and should get a native review.
