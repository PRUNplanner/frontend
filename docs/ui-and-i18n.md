# UI & i18n

## Component kit (`src/ui/`)

Build UI from the `P*` components, exported by `src/ui/index.ts`
(`import { PButton, PSelect } from "@/ui"`; see the [hard rules](../AGENTS.md#hard-rules)
for when to import by path). `PConfirmHost` and `PToastHost` are for
`AppProvider.vue` only; `PPagination`, `PSelectElement`, `PToast` and
`PLayerClose` are internal. Props are documented in each component's
`defineProps`.

- **Kit page:** `/dev/kit` (`views/dev/KitView.vue`) shows every component
  and state; it exists in `pnpm dev` and builds with `VITE_KIT_PAGE=true`.
  Add new components and states there.
- **Styling** lives in `ui/styles.ts` (Tailwind class sets per component);
  change the look there, not per usage. Shared types (`SizeKey` `sm`/`md`
  = 24/28 px, `ColorKey`, `PSelectOption`, `PDataTableColumn`, …) are in
  `ui/ui.types.ts`.
- **Unknown props fail `pnpm tsc`** (`checkUnknownProps` /
  `checkUnknownEvents` in `tsconfig.typecheck.json`). Only `class`,
  `style`, `id`, `title`, `role`, `aria-*` and `data-*` fall through
  (`AllowedComponentProps` in `ui.types.ts`).
- **Buttons:** `PButton` defaults to `type="primary"` and `html-type="button"`
  (never submits on its own). A selection or on/off button takes
  `:pressed` (sets `aria-pressed`, primary while pressed) instead of
  switching `type`. One choice of a few options (views, filters, modes,
  a metric or range) is `PSegmented` (`label` names the group, the
  `option` slot adds a dot or count), never a `PButtonGroup` of pressed
  buttons.
- **Forms:** `<PForm as-form @submit>` renders a real `<form>` (Enter
  submits); its button gets `html-type="submit"` and no `@click`. Give a
  `PFormItem` an `error` to show the message, set the field's error state
  and link it with `aria-describedby`. Outside a form, fields take
  `status` (`error`, `warning`).
- **Notices:** `<PNotice type="info|warning|error">`, never hand-styled
  red or amber boxes.
- **Signed values:** `<PValue :value>` prints the sign and colours by it
  (zero neutral), so it reads without colour.
- **Numbers:** `formatNumber` / `formatAmount` / `formatPayback`
  (`util/numbers.ts`) and `humanizeTimeMs` (`util/date.ts`) show "—" or
  "never" for ∞ / NaN / negative paybacks.
- **Icons:** `@vicons/material` inside `PIcon`.
- **Material tickers:** `features/material_tile/components/MaterialTile.vue`
  (category colour, market card and drawer).

### Overlays

`PModal`, `PDrawer` (`placement="bottom"` is a sheet), `useConfirm()`,
`PPopover`, `PDropdown`, `PTooltip`, `PHoverCard` and `useToast()`.

- Modals and drawers (`useOverlayLayer`) teleport to `body`, set `inert`
  on `#app`, lock scroll, trap Tab and return focus to the opener.
  Popovers, menus and select lists (`useSelectList`) are non-modal layers
  on the same stack: Esc closes the topmost, a click outside closes them
  except inside a layer opened from them. Z-indexes come from
  `ui/zIndex.ts` only.
- `PTooltip` is for short descriptions: it opens on hover, focus and tap,
  sets `aria-describedby` only while open, and makes a trigger without a
  focusable child a tab stop (`noFocus` opts out for many triggers in a
  row). SVG charts reuse this through `useTooltipTrigger`.
- `PHoverCard` (`useHoverCard`) is a card of content next to a trigger with
  hover intent, pinning and a bottom sheet on touch; the slot gets
  `{ pinned, sheet, narrow, close }`.
- `const toast = useToast(); toast(text, { type, action, duration,
  closable })` (6 s default, 0 keeps it) returns a handle with `.destroy()`.
  Outside components import `toast` from `@/ui/useToast`.

### Accessibility

`src/tests/ui/components/a11y.test.ts` runs axe-core on the kit.

- Every control needs a name. Inside a `PFormItem`, fields are labelled
  automatically; elsewhere pass an i18n `aria-label` with context
  ("Amount of {building}"). Icon-only `PButton`s need `aria-label` (dev
  build warns). `PTag closable` names its button "Remove {value}".
- Clickable things are `<button>` or `<a>`, never a `div` with `@click`.
  One focus ring (`:focus-visible`, `--color-focus`); no `outline-none`.
- Auth fields set `autocomplete` (`username`, `current-password`,
  `new-password`); the kit default is off.
- **Touch targets:** at least 24 × 24 px, 44 × 44 px under
  `pointer: coarse`. Small controls get the `touch-target` utility
  (`style.css`, an invisible `::after`); add it to any raw small `<button>`
  and don't clip it with `overflow-hidden`. Text fields and select triggers
  grow to 44 px instead (`pointer-coarse:h-11` / `min-h-11`), and
  `PInputNumber` hides its steppers there.

### Charts (`src/ui/charts/`)

Reuse or extend these rather than wiring chart.js in a feature: chart.js
wrappers (`EmpireBarChart`, via `vue-chartjs`), `MarketExplorationChart`
(`lightweight-charts` candlesticks), and plain SVG/CSS `P*` charts
(`PLineChart`, `PSparkline`, `PScatter`, `PStackedBar`, `PDivergingBar`,
`PWaterfall`, `PRunwayBar`, `PStripPlot`, `PMeter`, `PInlineBar`). Layout
helpers are in `charts.util.ts` and `scatter.util.ts`.

- Colours come only from `useChartTheme()` (`chartTheme.ts`), which follows
  the colour-blind palette live, so keep chart options in a `computed`.
  chart.js options spread `chartTooltip(theme)` / `chartScale(theme)`.
- No hex literals in `src/ui/charts/*.vue` (`chartTheme.test.ts`).

## Tables

`PDataTable` for data tables (typed `columns`, `cell-<key>` /
`header-<key>` slots), `PTable` for small static ones. Examples:
`features/market_live/components/CXPointTable.vue`,
`features/planning/components/PlanMaterialIO.vue`.

```vue
<PDataTable :columns="columns" :data="rows" :row-key="(r) => r.ticker" striped>
	<template #cell-delta="{ row }"><PValue :value="row.delta" /></template>
</PDataTable>
```

- **Sorting:** `sorter: true` or a compare function; the header is a
  button with `aria-sort`. A parent that pages or cuts rows before the table
  owns the sort via `v-model:sort` and `sortRows` (`ui/dataTableSort.ts`).
- **Size:** `minWidth` scrolls sideways instead of squeezing; `maxHeight` or
  `fill` (inside a `flex-1 min-h-0` parent) gives a sticky header and fixed
  layout; `virtual` (needs one of them) for hundreds of rows; `pageSize`
  paginates.

Numeric columns, everywhere:

- **Right-aligned, header too:** `align: "right"`; in `PTable`,
  `class="numeric"` on `th` and `td`.
- **One precision per column:** the same `formatNumber(v, decimals)` for
  every row (no `optionalDecimals`), `formatAmount` for counts, `PValue` for
  signed values. "—" and "never" are the only non-numbers.
- **Units in the header** (`"Daily Profit (ȼ)"`), not the cell;
  `formatPayback(days, false)` drops its " d".
- **Long tables keep their header** (`maxHeight` or `fill`, leaving room for
  sticky bars above); paginated tables don't need it.

## Styling

- **Tailwind v4** (`@tailwindcss/vite`). `src/assets/css/style.css` loads the
  legacy `tailwind.config.js` with `@config` and holds the `@theme` tokens;
  material colours are in `assets/css/materials.css`. The app is dark-only.
- **Semantic colours:** `positive`, `negative`, `warning`, `muted`,
  `muted-strong` (AA on every surface). `data-palette="colorblind"` on
  `<html>` swaps them, so never use raw green/red/orange
  (`src/tests/ui/kitTokens.test.ts` fails on them, and on hex/rgb in the
  kit). Text is at least `text-xs`.
- **Kit tokens:** `surface`, `surface-sunken`, `line`, `line-strong`,
  `hover`, `selected`, `ink`, `ink-strong`, `primary`, `link`,
  `rounded-control`, `rounded-panel`, `shadow-panel`; floating panels share
  `panelConfig.panel` (`ui/styles.ts`). `gray-dark`, `pp-border` and
  `link-primary` in `tailwind.config.js` are legacy aliases; use the
  tokens.
- **Fonts:** Roboto / Roboto Mono via `@fontsource` (`main.ts`); `font-mono`
  only for tickers, ids and code.
- **Custom variants:** `child:`, `child-hover:`, `not-first:`.
- Utility classes in templates; `<style>` blocks are rare.

## Layout & hierarchy

Generated UI gives every element the same weight. Decide what matters
on each view and make the rest quieter.

- **One primary action per view.** Only the main action (Save, Create,
  Search) uses `type="primary"`. Others are `secondary`, `ghost`, or go into
  a "More" menu (`PDropdown` with icons, and a hint on anything that loses
  data). `PButton` defaults to `primary`, so always set `type` on the rest.
- **Every number once per view.** No KPI repeated in a status bar, a card
  and a table. A sticky summary (the plan results bar) is the exception if
  the body doesn't repeat it as a KPI.
- **Big type for values, small for labels.** Labels `text-muted`, values
  bold and `tabular-nums`; the value users compare is the largest thing in
  its group.
- **Tabs for switching views, buttons for doing things.** A row of toggles
  that shows one panel at a time is a tab strip (underline, `aria-pressed`)
  or `PSegmented`, not a row of buttons.
- **Advanced options start collapsed** in forms and modals; show the 2–3
  fields most people need.
- **Colour carries meaning, not decoration.** No gradients, glows or
  decorative coloured borders; material colours and semantic tokens only.
- **One spacing and type scale.** Tailwind steps only (no `text-[13px]`);
  page padding `px-6`, section gaps `gap-6`, inside cards `gap-3`.
- **Icons** where they speed up scanning, never emoji, not next to every
  label.
- **Plain, specific copy** in game terms, with a number if there is one. No
  "effortlessly", "seamless", "powerful", "unlock", "supercharge" or other
  generic SaaS phrasing.

Example: the plan editor header (`views/PlanView.vue`, `PlanMoreMenu`,
`PlanToolTabs`).

## SFC conventions

Beyond the layout and formatting in [AGENTS.md](../AGENTS.md):

- New code uses type-based `defineProps<T>()` and `defineModel` (not a
  `computed` emitting `update:x`); convert older `PropType` props in files
  you touch.
- Page titles: `` useHead({ title: `${t("…")} | PRUNplanner` }) `` from
  `@unhead/vue`.
- `vue/no-unused-properties` warns.

## i18n (`src/lib/i18n/index.ts`)

- vue-i18n, composition API, `globalInjection`: `t()` from `useI18n()` in
  scripts, `$t()` in templates, `i18n.global` outside components.
- Each JSON file in `src/locales/<locale>/` is a namespace:
  `locales/en_US/plan.json` → `t("plan.tools.labels.popr")`; new files are
  picked up by `import.meta.glob`.
- `en_US` loads eagerly and is the fallback. Other locales load lazily in
  `userStore.setLocale`, which drops messages vue-i18n can't compile
  (`dropInvalidMessages`). Write a literal `@` as `{'@'}`.
- The language picker lists only `SupportedLanguages`. The `keymode`
  pseudo-locale renders raw keys, to find where a string comes from.

### Adding or changing text

1. Add the key to `src/locales/en_US/<namespace>.json` only; Crowdin
   (`crowdin.yml`) syncs the other locales. Missing keys fall back to
   English.
2. Use it through `t("namespace.path.key")`.

Help pages: `src/assets/help/en_US/<name>.md` with `{#id}` headings, a
registry entry and a title key, opened with
`<HelpPanel article="<id>" section="<id>" />` (see [features/help.md](features/help.md)).
`src/assets/help/changelog.md` is not translated. Debug tooling is English
only ([hard rules](../AGENTS.md#hard-rules)).

### Browser page translation

Translators (e.g. Chrome's) replace Vue's text nodes with their own
elements:

- Changing text that needs no translation (figures, tickers) gets
  `translate="no"` (`PValue` and `MaterialTile` set it), or the stale copy
  stays on screen.
- Keep text off a fragment's edges: `<span v-if>` instead of a
  `<template v-if>` that starts or ends with text, no text right next to a
  `v-for` or another fragment, and wrap a `v-for` inside an `<i18n-t>` slot
  in a `<span>`. Otherwise removing the fragment crashes the patch.
  `src/tests/ui/translationSafeTemplates.test.ts` checks every template.
