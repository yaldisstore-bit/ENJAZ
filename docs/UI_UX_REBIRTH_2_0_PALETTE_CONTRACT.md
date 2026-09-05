# ENJAZ UI/UX Rebirth 2.0 — Locked Palette Contract

Status: **LOCKED / USER-APPROVED**

This document is the authoritative color contract for the Rebirth 2.0 presentation layer.

## Absolute palette

No color outside these five may be introduced into the Rebirth 2.0 UI:

- `#F2F3F4`
- `#DED1C6`
- `#A77693`
- `#174871`
- `#0F2D4D`

No legacy yellow/black identity may be carried into Rebirth 2.0. No green/red/orange/cyan/violet or other semantic color families may be added later.

Gradients, when used, may only transition between these five palette tokens. Opacity may be applied structurally, but no additional raw color literal may be introduced.

## Semantic roles

### `#F2F3F4` — Canvas / Light Surface
- Primary application canvas.
- Light elevated surfaces.
- Inverse text/icons on the two dark blues when contrast requires it.
- Form fields and calm content regions where appropriate.

### `#DED1C6` — Warm Secondary Surface
- Secondary panels and sheets.
- Section separation.
- Quiet selected/hover surface treatment where contrast remains compliant.
- Structural warmth without introducing another hue.

### `#A77693` — Identity Accent
- Brand accent and selected indicators.
- Highlights, rails, small graphical accents, chips where the text itself remains on a high-contrast surface.
- Charts/markers/attention details where color is supplementary rather than the only carrier of meaning.

**Accessibility restriction:** `#A77693` must not be used as the sole background behind normal-size body text because none of the other four palette colors reaches WCAG AA 4.5:1 against it for normal text. Use it as an accent, icon, border, large-type treatment, or non-text visual emphasis.

### `#174871` — Primary Interactive Blue
- Primary buttons.
- Active navigation.
- Links and interactive emphasis.
- Success/info action surfaces when paired with explicit iconography/text labels rather than color alone.
- `#F2F3F4` may be used as inverse text on this color.

### `#0F2D4D` — Deep Structural Blue
- Primary body text and headings on light/warm surfaces.
- Dark structural surfaces.
- Executive/command surfaces.
- Strongest visual hierarchy and high-contrast anchors.
- `#F2F3F4` may be used as inverse text on this color.

## Contrast rules

Approved high-contrast text pairs for normal text include:
- `#0F2D4D` on `#F2F3F4`
- `#0F2D4D` on `#DED1C6`
- `#174871` on `#F2F3F4`
- `#174871` on `#DED1C6`
- `#F2F3F4` on `#174871`
- `#F2F3F4` on `#0F2D4D`

Do not use low-contrast palette pairs for normal body copy merely because both values belong to the approved palette.

## Semantic states without foreign colors

Rebirth 2.0 must not add green/red/orange semantic colors.

State meaning must be communicated redundantly through:
- explicit Arabic label,
- icon/symbol,
- shape/border treatment,
- hierarchy/position,
- one of the five approved palette tokens.

Recommended mapping:
- success / confirmed: `#174871` + explicit check/label,
- information / active: `#174871` + information/state icon,
- warning / needs attention: `#DED1C6` surface + `#0F2D4D` text + warning icon,
- critical / blocked: `#A77693` accent + explicit critical icon/label on a high-contrast light or dark text surface,
- disabled / quiet: `#DED1C6` with `#0F2D4D` text and reduced structural emphasis.

Color must never be the only state signal.

## Usage proportions

The palette is not a license to use all five colors at equal visual weight.

Default composition target:
- dominant: `#F2F3F4`
- structural dark: `#0F2D4D`
- interaction: `#174871`
- warm secondary: `#DED1C6`
- identity accent: `#A77693`

The result should feel calm, premium and coherent rather than colorful.

## Enforcement

- Rebirth 2.0 components must consume centralized palette tokens.
- No arbitrary hex/rgb/hsl color literals are allowed in the Rebirth 2.0 source tree.
- No legacy visual token may be imported into the new presentation layer.
- Any future palette change requires explicit user approval and a change to this contract before implementation.
