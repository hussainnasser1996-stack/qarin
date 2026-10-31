---
name: Qarin
colors:
  paper: "#f4f6f8"
  surface: "#ffffff"
  ink: "#0f1b2d"
  ink-2: "#44506a"
  muted: "#6b7486"
  line: "#e2e6ec"
  line-strong: "#c9d0da"
  deal: "#0b8a5c"
  deal-ink: "#075e3f"
  deal-wash: "#e7f6ef"
  warn: "#b4530f"
  warn-wash: "#fdf1e7"
typography:
  family: "IBM Plex Sans Arabic (Arabic + Latin), weights 400/500/600/700"
  body: 15px
  floor: 11px functional, 12px sentences
  numerals: Western digits in both languages, tabular-nums, isolated LTR
radius: 10px panels, full pill for chips
---

## Overview
Qarin is a price list, not a magazine. You type a search, then scan rows and compare numbers. The one memorable element is the price story: the cheapest price, the deal verdict, and a history line in the single accent colour.

## Colors
- Neutral navy ink on cool paper.
- **Deal green is the only accent.** Use it only for "cheapest", "great price", the lowest-price line on charts, and the go-to-cheapest button. Using it anywhere else weakens that meaning.
- Amber (`warn`) means "usually cheaper, wait" and "raised before drop". It is never decoration.
- Dark mode mirrors these tokens through `prefers-color-scheme`.

## Typography
- One family covers both scripts so Arabic and Latin feel like one voice.
- Arabic gets line-height 1.75 and no letter-spacing.
- Prices are always `.num`: tabular figures, isolated LTR, so "BHD 334.500" never flips inside Arabic text.

## Layout
- Search first.
- Lists are **rows in one panel**, not card grids: image, name, meta, then price on the end edge.
- The product page has a header (image, name, lowest price, verdict), an offer table, the history chart and the GCC comparison. A sticky side column holds the alert form. On phones, a sticky bottom bar shows the cheapest price and the go button.
- Logical properties throughout (`ms-`, `pe-`, `start-`, `text-start`), so RTL mirrors without extra rules.

## Components
- **Offer table:** the cheapest row has a green wash and a "Cheapest" tag. Every offer shows a relative "checked" time, with the exact UTC time on hover.
- **Verdict pill:** great (green wash), fair (paper), wait (amber wash), new (muted, until 14 days of history).
- **Chart:** step lines (prices change in steps). The lowest line is green and 2.5px. Store lines are muted and toggled off by default.

## Do's and Don'ts
- **Do** keep the cheapest offer first. Paid placement inside a price table is never allowed.
- **Do** show freshness on every price.
- **Don't** add a second accent colour, gradient text, hover-lift cards or numbered decoration.
- **Don't** run retailer images through Vercel image optimisation (`images.unoptimized: true`); the quota is small and retailer CDNs are already optimised.
- **Don't** translate Arabic copy by machine and ship it. The current Arabic strings are drafted and should get a native review.
