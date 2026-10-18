# DESIGN.md

Design direction for the short link app. Section 1 is the boss's direction, quoted exactly as selected, and it is the authority. Everything after it is derived by the ui-designer to carry that direction into tokens, components, and states. Nothing below adds a new style direction; where a choice was needed (the accent, the theme behavior), the reason is written next to it.

Name: **Stub**, chosen by the boss (section 3).

## 1. Direction (from the boss)

Answered on 2026-10-18 as options in a Q&A. The pick is what the boss chose; the quoted text is the option the boss saw.

| Field | Boss's pick | Option text |
|---|---|---|
| Personality | Quiet utility | "Feels like a precise tool. Lots of whitespace, few colors, nothing decorative. The URL box is the hero." |
| Palette | Warm and earthy | "Off-white paper tones, warm grays, a muted terracotta or olive accent." |
| Typography | System fonts | "The device's native font. Zero download, fastest load, looks native everywhere." |
| Name | Designer proposes names | "The ui-designer suggests 3 short names in DESIGN.md, and you pick one." |

UI copy language: English (boss decision, recorded in `docs/plan.md`).

Mood and identity were not asked as separate questions. They are read from the personality line above and are not extended here.

## 2. Design Read and dials

Reading this as: a two-screen web tool (create a link, read its stats) for anyone with a long link to share, in a quiet paper-and-ink utility style, dial ENERGY 1 / RHYTHM 1 / MOTION 1.

Dial: ENERGY 1 / RHYTHM 1 / MOTION 1

- ENERGY 1: "Quiet utility" and "nothing decorative" ask for a tool that does not raise its voice.
- RHYTHM 1: uniform on purpose. Each screen is one column with one job, so sections have no reason to vary.
- MOTION 1: hover, focus, and pressed states only. No entrance animation, no loops. State changes ("Copied", "Shortening…", the theme switch) happen instantly, with no transition.

One focal point per screen:

- Home before submit: the URL field.
- Home after submit: the short link.
- Stats page: the total clicks number.
- Status pages (404/410): the title sentence.

## 3. Name proposals

The boss chose **Stub** (decision log, section 14). `src/content/copy.ts` holds it in one constant, `APP_NAME`. None of these names were checked for trademarks or domain availability.

1. **Stub** (chosen): a ticket stub is the short piece you keep after the long part is gone, and the paper reference matches the palette.
2. Notch (not chosen): a notch is both a cut and a tally mark, so the name says "shorten" and "count" at once.
3. Snip (not chosen): the plain verb for cutting something short, so the name says what the tool does without explanation.

## 4. Color

**Accent: olive.** Terracotta sits too close to the brick red that error messages need, and the submit button should never read as a warning.

Palette count (R-29): paper and warm-gray neutrals, one olive accent, and brick red used only for errors. Neutrals do not count toward the core palette; brick is a functional status color, not decoration.

**Theme:** the device setting (`prefers-color-scheme`) picks the theme until the person chooses one with the "Dark mode" switch on every page. The choice is remembered per browser (boss decision, section 14). The switch, the token mechanism, and the script that prevents a flash of the wrong theme are in section 15.

### Tokens

Define these as CSS custom properties in `src/app/globals.css`, using the selector pattern in section 15 (light values on `:root`, dark values for the device default and for `data-theme="dark"`). The status pages copy the same hex values and selectors into their inline CSS.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-bg` | `#F6F2EA` | `#1D1B17` | Page background (paper) |
| `--color-surface` | `#FCFAF6` | `#262420` | Input fields, the result panel |
| `--color-note-bg` | `#EDE6D8` | `#322D25` | The shown-once stats link note |
| `--color-text` | `#29251F` | `#ECE6DB` | Body text, headings, links, secondary button labels |
| `--color-text-muted` | `#6A6157` | `#ABA295` | Hints, notes, placeholders, chart axis labels |
| `--color-border` | `#DDD5C8` | `#3A362F` | Hairline dividers only, never the only edge of a control |
| `--color-control-border` | `#8A8073` | `#877E71` | Input and secondary button borders, chart baseline |
| `--color-accent` | `#56662A` | `#B5C27A` | Primary button fill, the 7-character code, focus ring, uniques line |
| `--color-accent-hover` | `#46541F` | `#C6D18E` | Primary button hover and pressed fill |
| `--color-on-accent` | `#FCFAF6` | `#1D1B17` | Text on the primary button |
| `--color-error` | `#A13A26` | `#E8907A` | Error text, invalid field border |
| `--color-focus` | `var(--color-accent)` | `var(--color-accent)` | Focus ring |
| `--chart-clicks` | `#8A8073` | `#877E71` | Clicks bars, breakdown share bars |
| `--chart-uniques` | `var(--color-accent)` | `var(--color-accent)` | Daily unique visitors line and dots |
| `--chart-grid` | `#E4DDD1` | `#34302A` | Chart gridlines (decorative) |
| `--toggle-track` | `var(--color-surface)` | `#ECE6DB` | Theme switch track fill (section 15) |
| `--toggle-knob` | `#6A6157` | `#1D1B17` | Theme switch knob |
| `--toggle-knob-x` | `0` | `0.875rem` | Theme switch knob offset (left in light, right in dark) |

### Where the accent goes

The accent appears in exactly these places:

- The primary "Shorten link" button.
- The 7-character code inside every displayed short link (the domain part stays in text color).
- The daily unique visitors line on the chart.
- The focus ring, which is on one element at a time.

It does not go on links, headings, borders, backgrounds, or state labels. Links use text color with an underline (1px, 2px on hover).

## 5. Contrast results

Checked with `contrast-check.py` from the antislop-human skill (WCAG 2.x formula). Text needs 4.5:1. Control borders, the focus ring, and chart marks need 3:1 (non-text contrast).

### Light

| Foreground | on bg `#F6F2EA` | on surface `#FCFAF6` | on note `#EDE6D8` | Needs |
|---|---|---|---|---|
| Text `#29251F` | 13.64 | 14.61 | 12.27 | 4.5 |
| Muted `#6A6157` | 5.44 | 5.82 | 4.89 | 4.5 |
| Accent `#56662A` (code text, focus ring, uniques line) | 5.65 | 6.05 | 5.08 | 4.5 |
| Accent hover `#46541F` | 7.38 | 7.90 | | 3.0 |
| Error `#A13A26` | 5.97 | 6.40 | 5.37 | 4.5 |
| Control border / clicks bars `#8A8073` | 3.47 | 3.72 | 3.12 | 3.0 |

| Button label | Ratio | Needs |
|---|---|---|
| `#FCFAF6` on accent `#56662A` | 6.05 | 4.5 |
| `#FCFAF6` on accent hover `#46541F` | 7.90 | 4.5 |

### Dark

| Foreground | on bg `#1D1B17` | on surface `#262420` | on note `#322D25` | Needs |
|---|---|---|---|---|
| Text `#ECE6DB` | 13.84 | 12.47 | 11.00 | 4.5 |
| Muted `#ABA295` | 6.82 | 6.15 | 5.42 | 4.5 |
| Accent `#B5C27A` (code text, focus ring, uniques line) | 8.98 | 8.09 | 7.13 | 4.5 |
| Error `#E8907A` | 7.12 | 6.42 | 5.66 | 4.5 |
| Control border / clicks bars `#877E71` | 4.30 | 3.87 | 3.42 | 3.0 |

| Button label | Ratio | Needs |
|---|---|---|
| `#1D1B17` on accent `#B5C27A` | 8.98 | 4.5 |
| `#1D1B17` on accent hover `#C6D18E` | 10.57 | 4.5 |

All pairs pass. The first dark control border tried (`#7D7468`) failed on the note panel at 2.97:1 and was replaced.

Hairlines (`--color-border`, 1.30:1 light, 1.43:1 dark) and gridlines are decorative and are never the only thing that marks a control or a value.

**Chart overlap:** the uniques line against the clicks bars is 1.72:1 light and 2.00:1 dark, below 3:1. The chart spec fixes this with a halo: the line and its dots carry a 2px outline in `--color-bg`, so wherever the line crosses a bar it is edged by page color, which is 5.65:1 (light) and 8.98:1 (dark) against the line. Shape does the rest (section 10).

## 6. Typography

```css
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace;
```

- Sans: the boss picked system fonts, so nothing downloads and every device shows its own native face.
- Mono, still system fonts: short codes are case-sensitive and mix letters and digits, and a monospace face keeps `l`, `I`, `1`, `O`, and `0` apart and the 7 characters evenly spaced, so a code can be read aloud or retyped. It also lines up numbers.
- Mono is only for machine values: short links, the stats link, the target URL, counts, and chart labels. Never for headings or sentences (R-06).

### Scale

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-xs` | 0.75rem (12px) | 1.4 | Chart axis labels only (mono) |
| `--text-sm` | 0.875rem (14px) | 1.5 | Hints, notes, breakdown rows, the stats link value |
| `--text-base` | 1rem (16px) | 1.5 | Body, labels, buttons, the expiry input (16px stops iOS from zooming on focus) |
| `--text-lg` | 1.25rem (20px) | 1.4 | The URL input, the short link in the result, the result panel heading, stats section headings |
| `--text-xl` | `clamp(1.75rem, 1.35rem + 1.6vw, 2.25rem)` (28px to 36px) | 1.2 | The page heading, one per page. The result panel is the exception: its heading uses `--text-lg`, so the short link stays the focal point. |
| `--text-display` | `clamp(2.5rem, 1.9rem + 2.4vw, 3.5rem)` (40px to 56px) | 1.1 | The total clicks number only |

- Weights: 400 for body text, 600 for headings, labels, buttons, and the wordmark. Nothing lighter (thin system weights render unevenly on Windows) and nothing heavier.
- Numbers shown in sans use `font-variant-numeric: tabular-nums`.
- No uppercase labels and no added letter-spacing.
- Counts are formatted with `Intl.NumberFormat("en")` (1,204).

### Dates and times

- Home result: the expiry is formatted in the visitor's local time with a short time zone name, because the visitor typed it in local time.
- Stats page: the stats content is rendered on the server (only the theme switch runs in the browser), so it cannot know the visitor's time zone. Every time on it is shown in UTC with a "UTC" suffix (for example `18 Oct 2026, 14:05 UTC`), and the page states this once (`copy.stats.timesInUtc`). This also matches the chart, which counts UTC days.
- Chart day labels: `19 Sep` style, day first, no year.

## 7. Spacing and layout

### Spacing scale (4px base)

| Token | Value |
|---|---|
| `--space-1` | 0.25rem (4px) |
| `--space-2` | 0.5rem (8px) |
| `--space-3` | 0.75rem (12px) |
| `--space-4` | 1rem (16px) |
| `--space-5` | 1.5rem (24px) |
| `--space-6` | 2rem (32px) |
| `--space-7` | 3rem (48px) |
| `--space-8` | 4rem (64px) |
| `--space-9` | 6rem (96px) |

- Field to its hint or error: `--space-1`. Label to field: `--space-2`.
- Between form groups and between items in a section: `--space-5`.
- Between page sections: `--space-7` on narrow screens, `--space-8` from 48rem.
- Header row (wordmark and theme switch, section 15): `--space-4` top padding.
- Space between the header row and the page heading: `--space-6` on narrow screens, `--space-9` from 48rem. The empty space above the URL box is what makes it the hero, so it stays generous on desktop.
- Page side padding: `--space-4` below 36rem, `--space-6` above.

### Widths

- `--width-home: 40rem`: the home column (form and result).
- `--width-stats: 60rem`: the stats page column.
- Status pages: 32rem.

### Breakpoints (set where the content breaks, not by device list)

Home:

- Below 36rem: the URL field and the "Shorten link" button stack, both full width.
- 36rem and up: the field and the button share one row, and the button keeps its label width.
- Result panel below 44rem: the QR preview sits under the links. From 44rem: the QR preview (10rem square) sits to the right of the links.

Stats:

- Below 40rem: one column. The facts list (created, expires, status) is a single stack, and the total clicks sits above the chart.
- 40rem to 56rem: the facts list goes to two columns. The breakdowns stay in one column with a 32rem max width, so names stay close to their counts.
- 56rem and up: the three breakdowns sit side by side.

### Overflow

- Every URL on screen uses `overflow-wrap: anywhere`. The stats link is about 70 characters and a target URL can be 2,048, which would push a phone layout sideways otherwise.
- URLs are never truncated with an ellipsis, because a cut-off link cannot be checked.
- Short links break only after the last slash: the code has `white-space: nowrap`, and a `<wbr>` after the slash is the preferred break, with `overflow-wrap: break-word` as the fallback. So the 7 characters always stay on one line. A host wider than its column still breaks inside the host instead of overflowing. In the result panel that starts at roughly 20 characters of scheme plus host on a 320px phone and roughly 24 next to the QR code on desktop, depending on the device's mono font. Check this again once the production domain is chosen.
- The chart SVG scales with its container (`width: 100%` plus a `viewBox`).

### Tap targets

- Inputs and the primary button: `min-height: 3rem` (48px). The URL input: `min-height: 3.5rem`.
- Copy buttons and the download link: at least 2.75rem (44px) tall, with at least `--space-2` between neighbors.

## 8. Shape and depth

- `--radius-sm: 4px` for inputs, buttons, and copy controls.
- `--radius-md: 8px` for the result panel and the stats note panel.
- No pill shapes. Chart bars have square corners.
- Borders: 1px `--color-control-border` on inputs and secondary buttons. The URL input gets 2px, because it is the hero control.
- Shadows: none. The paper idea is flat; hierarchy comes from size, weight, and whitespace, and nothing on these pages needs to float.

### Buttons

- Primary (only "Shorten link"): `--color-accent` fill, `--color-on-accent` label, weight 600.
- Secondary (Copy, "Shorten another link", "Load stats again"): `--color-surface` fill, 1px `--color-control-border`, `--color-text` label.
- The QR download is a link (`<a href download>`) styled as a secondary button. "Shorten another link" is also a link (to `/`) styled as a secondary button, so it works without JavaScript (section 11).
- Labels are text only. No icons, no arrows.

## 9. Focus

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

- Applies to every interactive element: inputs, buttons, links, the download link.
- Never remove the outline without this replacement (R-32).
- The 2px offset leaves a strip of page color between the ring and the olive button, so the ring stays visible on the primary button.
- The ring passes 3:1 on every background in both themes (section 5).

## 10. Chart (stats page)

The chart answers one question, written as its title: "Clicks and unique visitors per day", under the "Last 30 days" heading. It is a server-rendered SVG with no client JavaScript.

- **Clicks:** 30 solid bars in `--chart-clicks`, square corners. Bar gap scales with width (about 2px on a phone).
- **Daily unique visitors:** a 2px line in `--chart-uniques` with a dot (3px radius) on each day, both with the 2px `--color-bg` halo from section 5.
- **Told apart without color:** bars against a line with dots. The legend repeats the shapes: a small filled bar next to "Clicks", a short line with a dot next to "Daily unique visitors". The legend labels are text.
- **Baseline:** 1px `--color-control-border`, so a zero day reads as zero, not as missing.
- **Gridlines:** at most two horizontal lines (a rounded maximum and its half) in `--chart-grid`. Y labels at 0 and the rounded maximum, in a left column as wide as the longest label.
- **X labels:** first day, middle day, last day, in mono `--text-xs` and `--color-text-muted`.
- **Axis labels are HTML text outside the SVG**, so they stay at `--text-xs` at every width and grow with browser zoom. Only the marks (bars, line, dots, gridlines, baseline) scale with the SVG.
- **Height:** the plot keeps a fixed aspect ratio and scales with the column: 300 by 192 below 40rem (about 10rem tall on a 320px phone), 900 by 240 from 40rem (about 9rem to 14rem tall).
- **No hover tooltips:** MOTION 1 and no client JS. Exact numbers live in the data table.
- **Accessibility:** the SVG is `aria-hidden="true"`. A visually hidden `<table>` with the caption from `copy.stats.chartTableCaption` carries every day's clicks and unique visitors.
- **Notes under the chart:** `copy.stats.daysInUtcNote` and `copy.stats.uniquesNote`, in `--text-sm` muted.

### Breakdown lists

Devices, Browsers, Operating systems, each with "Last 30 days" under the heading.

- Rows: the name on the left in sans, the count on the right in mono with tabular numbers.
- Under each row, a 4px bar in `--chart-clicks`, its width set to the row's share of the 30-day total. The bar is `aria-hidden`; the count carries the value.
- Top 8 rows, then "Other" last.
- Device type values map through `copy.stats.deviceNames`.

## 11. Components and states

All strings come from `src/content/copy.ts`. The keys are named below.

### Header row (every page)

One row at the top of the page column on every page: home, stats, app 404, and the status pages. The wordmark sits on the left and the theme switch on the right (section 15). The row keeps this layout at every width; at 320px the wordmark and the switch together take about 12rem of the 18rem available. `min-height: 2.75rem`, so the row does not change height when the switch appears. The wordmark links to `/` on every page except home, where it is plain text. The link is at least 2.75rem wide and tall, so it meets the 44px tap target even though "Stub" is a short word.

### Home: create form

The form uses `noValidate`, so the browser's built-in messages never replace our copy. The server action returns the error code and the frontend shows `copy.errors[code]`.

**URL field** (the hero): visible label `home.urlLabel`, `--text-lg`, 2px border, `--color-surface` fill, `type="url"`, `inputMode="url"`, `autoComplete="off"`, `spellCheck={false}`, `autoCapitalize="none"`.

| State | Look and behavior |
|---|---|
| Default | Placeholder `home.urlPlaceholder` in muted text |
| Focus | Focus ring (section 9) |
| Invalid (`url_*` codes) | Border turns `--color-error`, `aria-invalid="true"`, message below in `--color-error` linked with `aria-describedby`, focus moves to the field. The message text is always shown, so the error never depends on color alone. |
| Submitting | Value kept, field is read-only |

**Expiry field:** `type="datetime-local"`, label `home.expiryLabel`, hint `home.expiryHint` below in muted text, `min` set to now plus 1 minute so the picker helps. The client converts the value to ISO-8601 UTC before submit. Invalid (`expiry_*` codes) works like the URL field. Without JavaScript the whole field is hidden, because the value only reaches the server through the client conversion; the form still creates a link with no expiry.

**Submit button** (primary):

| State | Look and behavior |
|---|---|
| Default | `home.submit` ("Shorten link") |
| Hover, pressed | `--color-accent-hover` fill |
| Focus | Focus ring |
| Submitting | Label `home.submitting`, `aria-disabled="true"`, second submits ignored. It keeps its colors so the label stays readable. No spinner. |

**Form-level error** (`rate_limited`, `server_error`): a message under the button in `--color-error`, `role="alert"`. Both field values are kept so the person can retry without retyping.

### Home: result panel

After a successful create, the result panel replaces the form, so the short link is the one focal point. Focus moves to the panel heading (`tabIndex={-1}`). `result.createAnother` brings back an empty form and moves focus to the URL field.

Order inside the panel (`--color-surface`, `--radius-md`, 1px `--color-border`):

1. `result.heading`, in `--text-lg` (section 6), so it does not outweigh the short link.
2. Short link: label `result.shortLinkLabel`, value in mono `--text-lg` with the code in accent, Copy button. In both copy rows the Copy button sits under its value at every width, so the value gets the full column (the links column is narrow next to the QR code) and the two rows read the same.
3. Stats link note (`--color-note-bg`, `--radius-md`): `result.warningTitle` in weight 600, `result.warningBody`, label `result.statsLinkLabel`, value in mono `--text-sm`, Copy button. The note is marked by its title text, not by color.
4. QR: label `result.qrLabel`, 10rem square preview of `/api/qr/{code}` with alt `result.qrAlt(shortUrl)`, download link `result.qrDownload` with `download="{code}-qr.png"`.
5. Expiry line: `result.expiresOn(date)` or `result.neverExpires`.
6. `result.createAnother` as a secondary button.

**Copy buttons:**

| State | Look and behavior |
|---|---|
| Idle | Visible text `result.copy`, accessible name `result.copyShortLinkLabel` or `result.copyStatsLinkLabel` |
| Copied | Visible text `result.copied` for 2 seconds. A polite live region announces `result.shortLinkCopied` or `result.statsLinkCopied`. |
| Failed (clipboard API missing or denied) | `result.copyFailed` shown under the value. The value text has `user-select: all`, so one tap selects it. |
| No JavaScript | Hidden, like the theme switch (R-26). The values stay selectable. |

Without JavaScript the result is rendered by the server, so `result.createAnother` must work as a plain link to `/` (the click handler prevents the reload when JavaScript runs).

**QR preview:**

| State | Look and behavior |
|---|---|
| Loading | The 10rem square is reserved (`--color-surface` with a 1px `--color-control-border`) so the layout does not jump |
| Loaded | The PNG |
| Error (image `onError`) | `result.qrError` inside the box, in `--text-sm` muted text. The copy is kept short enough to fit the 10rem square without scrolling. The download link stays. |

### Stats page

Top to bottom:

1. Header row, then heading `stats.heading` and `stats.bookmarkNote` in muted text.
2. Short link (mono, code in accent) and `stats.targetLabel` with the target URL as a link (`rel="noreferrer"`, wraps anywhere).
3. Facts list (`<dl>`): `stats.createdLabel`, `stats.expiresLabel` (or `stats.neverExpires`), `stats.stateLabel` with `stats.states[state]` in weight 600 and `stats.stateNotes[state]` under it. Then `stats.timesInUtc`.
4. Total clicks: `stats.totalClicksLabel`, the number in `--text-display` (the page's focal point), `stats.totalClicksNote`.
5. `stats.last30DaysHeading`, chart title, legend, chart, notes (section 10).
6. The three breakdown lists.
7. QR: preview and `stats.qrDownload`.

State labels are plain text. No colored badges or status dots, because the word carries the state (R-09, R-31).

| State | What shows |
|---|---|
| Empty (total clicks is 0) | `stats.emptyTitle` and `stats.emptyBody` replace the chart and the breakdowns. Header facts and QR still show. |
| Old clicks only (total above 0, none in 30 days) | The total still shows. `stats.emptyLast30` replaces the chart and the breakdowns. |
| Loading | No route `loading.tsx` and no loading copy. The page is rendered on the server and is only reached by a full page load (a pasted or bookmarked stats link; nothing in the app links to it), so the browser's own loading indicator covers the wait. A `loading.tsx` streamed the page and turned the bad-token 404 into a page that had already started, so it was dropped (decision, 2026-10-18). |
| Error (route `error.tsx`) | `stats.errorTitle`, `stats.errorBody`, and a secondary button `stats.errorRetry` that calls `reset()`. |
| Bad token | `notFound()`, which renders the app 404 with `copy.notFound`. |

### App 404 (`not-found`)

Header row, then `notFound.title`, `notFound.body`, and a `notFound.homeLink` text link. Same column and type as the status pages.

### Status pages (redirect 404 and 410)

- A self-contained HTML document from `renderStatusPage(kind)`, with inline CSS using the same hex values and the same theme selectors as sections 4 and 15.
- Content: the header row (wordmark as a link to `/`, theme switch), an `<h1>` from `statusPages[kind].title`, a paragraph from `.body`, and an underlined link to `/` from `.homeLink`. `<title>` from `.documentTitle`, `<html lang="en">`.
- Two static inline scripts: the head script and the switch script from section 15. Neither contains request data.
- A 32rem column with `--space-9` top padding on desktop and `--space-6` on phones, plus the focus style from section 9.
- No user input is echoed, which the copy respects: no string contains the code.

## 12. Identity motif

Machine values are set in mono and human words in sans, and the 7-character code is always in olive. The same treatment shows on the result panel and the stats header, so the code reads as the product. The wordmark is the app name in system sans, weight 600, text color.

## 13. Assets (R-23)

- Logo: none. The wordmark is the app name as text. The design does not need a logo, icon, or illustration.
- Icons: none. Every control is a text label. The theme switch's track and knob are two CSS boxes, not an image or an icon.
- Favicon: none supplied. Do not ship the default `favicon.ico` from `create-next-app` (it is the Next.js mark). A favicon, if the boss wants one, comes from the boss.
- The QR image is generated by the app from each short link; it is product output, not a design asset.

## 14. Decision log (R-31)

### Boss decisions (2026-10-18)

Picks are quoted as the boss selected them.

| Question | Boss's pick | Option text the boss saw | Applied as |
|---|---|---|---|
| Name | "Stub (Recommended)" | (not forwarded) | The app is Stub. Notch and Snip are marked not chosen (section 3). |
| Theme | "Add a toggle" | "Adds a light/dark switch on every page, remembered per browser. Small extra work outside the plan." | Section 15. |
| URL typed without `https://` | "Reject with hint" | (not forwarded) | The validator stays as planned. `errors.url_invalid` tells the person to include https://. |

### Design decisions

| Decision | Reason |
|---|---|
| Paper background, warm-gray text | The boss picked "off-white paper tones, warm grays". |
| Olive accent | Terracotta sits too close to the brick red errors need. |
| Accent in four places only | One deliberate accent: the action, the code, the uniques line, and focus. |
| Theme switch with two states | The boss picked "Add a toggle", and the device setting already covers the default, so no third state is needed. |
| Switch drawn in the theme's neutrals | The accent stays limited to its four places. |
| System sans | The boss picked system fonts. |
| System mono for machine values | Case-sensitive codes need glyphs that keep `l`, `I`, `1`, `O`, and `0` apart. |
| One column per page | Each screen has one job, and the URL box has to be the hero. |
| Result panel replaces the form | One focal point after submit: the short link. |
| Spacing from a 4px scale | Large steps above the URL box give it the whitespace the boss asked for; small steps keep labels attached to their fields. |
| No cards | Sections are separated by whitespace and headings. The result panel and the note are the only boxes, because each groups the output of one action. |
| No shadows | Flat paper; nothing needs to float. |
| No icons or illustrations | "Nothing decorative"; text labels say more. |
| Bars plus a line in the chart | Clicks and unique visitors stay distinct by shape, not only by color. |
| Times in UTC on the stats page | The stats content is rendered on the server, and the chart already counts UTC days. |
| No loading screen on the stats page | It is only reached by a full page load, so the browser shows the wait, and a streamed loading screen broke the bad-token 404 (section 11). |

## 15. Theme switch

The boss picked "Add a toggle": a light/dark switch on every page, remembered per browser.

**Two states, light and dark.** The device setting already decides the theme until someone chooses, so a third "device" state would only repeat what the default does.

After someone picks a theme, the page stops following the device. Clearing the site's data in the browser brings device-following back.

### Where it goes

In the header row, to the right of the wordmark (section 11), on:

- the home page, the stats page, the stats error page, and the app 404, through `SiteHeader`, which each page renders with its own column width (so the header lines up even when the stats route shows the 404);
- the redirect 404 and 410 status pages, inside the HTML string from `renderStatusPage`.

### Markup and semantics

```html
<button type="button" role="switch" aria-checked="false" data-theme-toggle>
  <span>Dark mode</span>
  <span class="track" aria-hidden="true"><span class="knob"></span></span>
</button>
```

- The visible text is also the accessible name: `copy.theme.toggleLabel` ("Dark mode"). The name never changes; `aria-checked` carries the state, so a screen reader says "Dark mode, switch, on" or "off".
- `aria-checked="true"` while the dark theme shows, `"false"` while the light theme shows.
- It is a native `<button>`, so Tab reaches it and Enter or Space flips it.

### Look

- Button: `display: inline-flex`, `align-items: center`, `gap: var(--space-2)`, `min-height: 2.75rem` (44px tap target), `padding-inline: var(--space-2)`, no border, transparent background, `--radius-sm`. Label in `--text-sm`, `--color-text`.
- Track: 2rem by 1.125rem, `box-sizing: border-box`, 1px `--color-control-border`, fill `--toggle-track`, `--radius-sm`. Not a pill, to match the rest of the radius system.
- Knob: 0.75rem square, 2px radius, fill `--toggle-knob`, centered vertically, 0.125rem from the track's inner left edge, moved by `transform: translateX(var(--toggle-knob-x))`.
- The knob position and the track fill come from the theme tokens (section 4), not from `aria-checked`. They are correct on first paint, before any JavaScript runs.
- Light theme: pale track with a visible border, dark knob on the left. Dark theme: light track, dark knob on the right. The knob position carries the state, so it never depends on color alone.

| State | Look |
|---|---|
| Hover, pressed | Button background `--color-note-bg` |
| Focus | Focus ring from section 9 around the whole button |
| No JavaScript | Hidden (see "Hidden without JavaScript") |

Contrast, from the section 5 checks:

- Light: knob `#6A6157` on track `#FCFAF6` is 5.82:1. Track border `#8A8073` is 3.47:1 on the page and 3.12:1 on the hover background.
- Dark: track `#ECE6DB` is 13.84:1 on the page and 11.00:1 on the hover background. Knob `#1D1B17` on the track is 13.84:1.
- The label uses `--color-text`, which passes on both the page and the hover background in both themes.

### How the theme is chosen

1. No stored choice: the CSS media query decides. This needs no JavaScript and follows the device even if it switches while the page is open.
2. Stored choice: `localStorage` key `stub-theme`, value `"light"` or `"dark"`. Any other value is ignored.
3. On click: switch to the opposite of the theme now showing, set `data-theme` on `<html>`, store it, and update `aria-checked`.
4. If storage is blocked: the switch still changes the theme on the current page, and the choice is not remembered. No message is shown.

### Token selectors

```css
:root {
  color-scheme: light;
  /* light values from section 4 */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    /* dark values from section 4 */
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  /* dark values from section 4 */
}
```

`color-scheme` follows the active theme, so native controls (the date and time picker, scrollbars) match the switch, not only the device.

### No flash of the wrong theme

This goes first in `<head>`, before any stylesheet:

```html
<script>
(function () {
  var root = document.documentElement;
  root.setAttribute("data-js", "");
  try {
    var t = localStorage.getItem("stub-theme");
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
  } catch (e) {}
})();
</script>
```

It runs before the first paint, so a stored choice is applied before anything shows. With no stored choice it sets no theme and the media query decides.

React renders the whole document again in the browser on the bad-token 404 and on the stats error page, which drops the attributes this script set. The switch component re-applies `data-js` and the stored theme when it mounts, so those pages keep the person's choice and the switch.

In the Next.js app, render it inside `<head>` in `src/app/layout.tsx` and put `suppressHydrationWarning` on `<html>`, because the script adds attributes to `<html>` before React hydrates.

### Hidden without JavaScript

A switch that cannot work must not show (R-26):

```css
[data-theme-toggle] { display: none; }
:root[data-js] [data-theme-toggle] { display: inline-flex; }
```

The head script sets `data-js` before paint, so the switch is there from the first frame when JavaScript runs and absent when it does not. Without JavaScript the device setting still picks the theme.

### Switch behavior

```js
function currentTheme() {
  var t = document.documentElement.getAttribute("data-theme");
  if (t === "light" || t === "dark") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// on click
var next = currentTheme() === "dark" ? "light" : "dark";
document.documentElement.setAttribute("data-theme", next);
try { localStorage.setItem("stub-theme", next); } catch (e) {}
button.setAttribute("aria-checked", String(next === "dark"));
```

- On load, set `aria-checked` from `currentTheme()`.
- Listen for `change` on `matchMedia("(prefers-color-scheme: dark)")` and refresh `aria-checked`, so it stays correct while no choice is stored.
- Next.js: a small client component in the header. The server markup has `aria-checked="false"`, and the component sets the real value right after hydration (for example with `useSyncExternalStore` and a server snapshot). The visuals never read `aria-checked`, so nothing jumps.
- Status pages: the same logic as a plain inline script at the end of `<body>`.
- Syncing across open tabs is not required.

## 16. Open questions for the boss

None. The boss answered both questions on 2026-10-18 (section 14).
