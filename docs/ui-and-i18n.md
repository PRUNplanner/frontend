# UI & i18n

## Component kit (`src/ui/`)

Build UI from the in-house `P*` components first. The barrel is
`src/ui/index.ts`:

```ts
import { PButton, PForm, PFormItem, PSelect, PInputNumber, PTooltip } from "@/ui";
```

The kit contains `PButton`, `PButtonGroup`, `PCheckbox`, `PDataTable`,
`PDrawer`, `PDropdown`, `PForm`, `PFormItem`, `PFormSeparator`, `PIcon`,
`PInput`, `PInputNumber`, `PModal`, `PPopover`, `PProgressBar`, `PSelect`,
`PSelectMultiple`, `PSpin`, `PTable`, `PTag`, `PToast` (through
`useToast()`, see "Toasts" below), `PTooltip` and `PValue`, plus
`useConfirm()` (see "Overlays" below). `PPagination` and `PSelectElement`
are internal to `PDataTable` and the selects.

- **Kit page:** `/dev/kit` (`views/dev/KitView.vue`) shows every component
  in every size, type and state. It exists in `pnpm dev` and in builds with
  `VITE_KIT_PAGE=true` (the e2e stack), not in production. Add new
  components and states there.
- **Shared props:** `size` (`"sm" | "md"`) and `type` for the colour
  (`primary`, `success`, `error`, `warning`, `secondary`; buttons also
  `ghost`). Both types are in `ui/ui.types.ts`.
- **Sizes:** every control (`PButton`, `PInput`, `PInputNumber`,
  `PSelect`, `PSelectMultiple`, `PCheckbox`) takes `size`: `md` is 28 px
  tall, `sm` 24 px (checkbox boxes 16 / 14 px), side by side on the kit
  page. `PCheckbox` also takes `indeterminate` (a dash, for "select all"
  over some rows).
- **Touch:** on a touch screen (`pointer: coarse`) every kit target is at
  least 44 × 44 px. Small controls get an invisible hit area from the
  `touch-target` utility (`style.css`, a centred `::after`); put it on any
  raw `<button>` smaller than that too. Text fields and select triggers
  can't take a tap through a pseudo element, so they are 44 px tall there
  (`pointer-coarse:min-h-11`). Desktop sizes don't change. The UI audit
  counts what's left as `smallTargetsTouch`.
- **Unknown props fail `pnpm tsc`** (`checkUnknownProps` and
  `checkUnknownEvents` in `tsconfig.typecheck.json`). `class`, `style`,
  `id`, `title`, `role`, `aria-*` and `data-*` fall through to a
  component's root (allowlisted in `ui/ui.types.ts`); anything else needs a
  declared prop or emit.
- **Field states:** `status` (`"error"` or `"warning"`) on `PInput`,
  `PInputNumber`, `PSelect` and `PSelectMultiple` draws an inset ring in
  `negative` / `warning`; `error` also sets `aria-invalid`. In a form, give
  the `PFormItem` an `error` instead: it shows the message under the field,
  puts the control in the error state and links the message (and the
  `#info` slot) with `aria-describedby`.
- **Notices:** a message in the page is a `<PNotice type="error">`
  (`info`, `warning` or `error`, default `info`), with an optional
  `#action` slot for one button. Errors are `role="alert"`, the others
  `role="status"`. Don't hand-style red or amber boxes.
- **Toggles:** a button that shows a selection or an on/off state takes
  `:pressed="…"` instead of switching `type`: it sets `aria-pressed` and is
  `primary` while pressed, its `type` (default `secondary`) when not. Keep
  `type` only where the colour means something else (a failed save).
- **Tags:** `<PTag closable @close="…">` adds a remove button named
  "Remove {value}", so tags (and `PSelectMultiple` chips) can be removed
  by keyboard.
- **Inputs:** `PInput` has a `#prefix` slot (e.g. a search icon).
  `PSelectMultiple` takes a `placeholder`; both selects only show the
  clear button with `clearable`.
- **Select options** use `PSelectOption` (`{ label, value, badge?, children? }`). `badge` is shown on the right and not searched; arrow keys and Enter move through group children, not group headers.
- **Forms:** `<PForm as-form @submit="…">` renders a real `<form>`, so Enter
  in an input submits. Give its button `html-type="submit"` and no `@click`.
  `PButton` defaults to `type="button"` and never submits on its own.
- **Accessibility:** every control needs a name.
  - Inside a `PFormItem`, `PInput`, `PInputNumber`, `PCheckbox` and
    `PSelect*` are labelled by it automatically (`label[for]` /
    `aria-labelledby`).
  - Elsewhere pass `aria-label` (an i18n string with context, e.g.
    "Amount of {building}"); `PCheckbox` can also take its label as slot text.
  - Icon-only `PButton`s need `aria-label`; the dev build warns without it.
  - Auth fields set `autocomplete` (`username`, `current-password`,
    `new-password`); the kit default is `off`.
  - Keyboard: `PInputNumber` steps with ↑/↓ (its +/- are mouse-only);
    `PSelect` opens with Enter, Space or ↓ and closes with Esc.
  - One focus ring for all controls (`:focus-visible`, `--color-focus` in
    `style.css`); don't add `outline-none`. Clickable things are `<button>`
    or `<a>`, never a `div` with `@click`.
  - Paginated tables use `PDataTable`'s `:page-size="50"`; its
    `PPagination` pages are real buttons with `aria-current`.
  - `src/tests/ui/components/a11y.test.ts` runs axe-core on the kit.
- **Numbers:** `formatNumber` / `formatAmount` (`util/numbers.ts`) show "—"
  for ∞ or NaN; payback periods use `formatPayback` ("never" when negative
  or infinite), and `humanizeTimeMs` shows "never" for an infinite runtime.
- **Signed values:** show a profit, delta or other good/bad number with
  `<PValue :value="x" />`. It prints the sign (`+1.00` / `-1.00`) and colours
  by it (zero stays neutral), so it reads without colour. `arrow` adds ▲/▼.
- **Styling:** the Tailwind class sets for each component live in
  `ui/styles.ts`. Change the look there, not per usage.
- **Data tables:** `PDataTable`, see "Tables" below. Examples:
  `features/market_live/components/CXPointTable.vue` and
  `features/resource_roi_overview/components/ResourceROITable.vue`.
- **Overlays and the rest:**
  - **Overlays:** modals, drawers, confirms, popovers and menus come from
    the kit.
    - `<PModal v-model:show="x" :title="…" :width="480">` with an `#action`
      slot for the footer; `width` is px or any CSS width (default the full
      width), and 16 px of the mask stay visible on each side.
    - `<PDrawer v-model:show="x" :title="…" :width="600">`, with
      `placement`, `bodyClass` and a `#header` slot.
    - Confirms: `if (await useConfirm()({ title, content, positiveText,
      negativeText })) …`; the one `PConfirmHost` sits in `AppProvider.vue`.
    - Both layers teleport to `body`, set `inert` on `#app` and lock the page
      scroll. Focus moves in and returns to the opener, Tab stays inside, and
      Esc closes the top layer (an open `PSelect` list first). `PSelect` lists
      and `PTooltip`s stack above them.
    - `<PPopover>` with a `#trigger` slot: `trigger` `click` (toggles) or
      `manual` (`v-model:show`), `placement`, `panelClass` (added to the
      panel look, replaces the default `p-3` padding), `anchor` (an element
      to position at instead of the trigger) and `arrow`. Emits
      `clickoutside`.
    - `<PDropdown :options @select>`: `{ key, label, icon?, hint?, danger? }`
      or `{ type: "divider" }`, `trigger` `click`, `hover` or `manual`, and
      `anchor`. A `role="menu"`: ↓ on the trigger opens it, ↑/↓/Home/End
      move, Enter or Space picks, Esc closes and returns focus.
    - `<PTooltip>` with a `#trigger` slot shows its default slot on hover,
      on keyboard focus inside the trigger and on a tap; Esc, focus leaving
      and a tap elsewhere close it. A tap on a button, link or checkbox
      inside the trigger runs that control and shows no tooltip, so give
      such a control its own name. The panel is `role="tooltip"` and the
      trigger's first focusable element gets `aria-describedby`; a trigger
      with nothing focusable becomes a tab stop itself (`disabled` turns
      all of it off). Charts with their own SVG tooltips use the same rules
      through `useTooltipTrigger` (`ui/useTooltipTrigger.ts`).
    - Popovers and menus are non-modal layers on the same stack: Esc closes
      the topmost, no inert, scroll lock or focus trap. A click outside
      closes them, except on the trigger, inside, in a `PSelect` list or in
      a layer opened from inside.
  - **Toasts:** `const toast = useToast()` from `@/ui`, then
    `toast(text, { type: "error" })`,
    `toast(text, { action: { label, onClick } })` or
    `toast(text, { duration: 0, closable: true })`. `duration` defaults to
    6 s, 0 keeps it, hover pauses it. It returns a handle, `.destroy()`
    closes it early. The one `PToastHost` in `AppProvider.vue` shows them
    bottom-right above layers; outside components import `toast` from
    `@/ui/useToast`.
  - **Icons:** `@vicons/material`, wrapped in `PIcon`:
    `<PIcon><CheckSharp /></PIcon>`.
  - **Charts:** `src/ui/charts/*.vue` wrap chart.js (`vue-chartjs`,
    datalabels) and `lightweight-charts` (candlesticks). Reuse or extend
    these rather than wiring chart.js in a feature. Ranked values (top N
    plus "Other") use `EmpireBarChart.vue`; a small used-of-total bar
    beside a number (area, housing) is `PMeter.vue` (plain CSS, no chart.js).
    Colours come only from `useChartTheme()` (`chartTheme.ts`): polarity,
    warning, muted, ink, grid, axis, tooltip surface, the fixed exchange colours
    (`exchange("AI1")`, tokens `--color-cx-*` in `style.css`) and the four
    cost parts. It follows the colour-blind preference without a reload, so
    keep chart options in a `computed`. chart.js tooltips and axes spread
    `chartTooltip(theme)` and `chartScale(theme)` from `charts.util.ts`. No
    hex literals in `src/ui/charts/*.vue` (a test checks). The chart series
    (building blocks, visual rules) is indexed in the workspace spec
    `specs/2026-10-13-charts.md`.
  - **Material chips:** `features/material_tile/components/MaterialTile.vue`
    is the standard way to show a material ticker. It is colour-coded by
    category and has a popover and a market drawer.

## Tables

Data tables are `PDataTable`; `PTable` is a plain styled `<table>` for small
static ones. `PDataTable` takes a typed `columns` array instead of child
column components:

```ts
const columns = computed<PDataTableColumn<IMaterialIO>[]>(() => [
	{ key: "ticker", title: t("…ticker"), sorter: true },
	{ key: "delta", title: t("…delta"), align: "right", sorter: true },
]);
```

```vue
<PDataTable :columns="columns" :data="rows" :row-key="(r) => r.ticker" striped>
	<template #cell-delta="{ row }"><PValue :value="row.delta" /></template>
</PDataTable>
```

- **Cells** render `row[key]`, or the `cell-<key>` slot (`{ row, index }`).
  `header-<key>` replaces a title. Cells carry `data-col-key`, rows
  `data-row-key`.
- **Sorting:** `sorter: true` compares `row[key]` (numbers, strings, empty
  values first when ascending); pass a function to compare otherwise, e.g.
  by the name shown instead of an id. A header click cycles descend →
  ascend → none; the header is a button with `aria-sort`, so it sorts by
  keyboard. `defaultSortOrder` sorts on mount.
- **Columns:** `width`, `minWidth` (keeps a column from being squeezed; the
  table scrolls sideways instead), `children` for grouped headers,
  `titleColSpan` to let one title span the next columns.
- **Rows:** `rowClick` makes rows clickable and keyboard-operable (Enter,
  Space), `rowClass` adds classes. The `expand` slot adds an expand button
  per row (`expandLabel` names it) and `v-model:expanded-row-keys`.
- **Slots** `summary` (a full-width footer row) and `empty`. `pageSize`
  paginates with `PPagination`. `popover` switches to the colours used
  inside a popover.
- **Width and height:** `minWidth` on the table (e.g. `:min-width="960"`)
  makes it scroll sideways in its box instead of squeezing columns.
  `maxHeight` limits the body; the header comes on top. A table with
  `maxHeight` or `fill` uses fixed layout, so columns share the width.
- **Long lists:** `virtual` (with `fill` or `maxHeight`) renders only the
  rows in view, measuring their heights as they render. Use it for tables of
  hundreds of rows (CX live, Market Exploration, Production Opportunities).

Every numeric column follows one pattern, so numbers line up and compare
across the app:

- **Right-aligned, header too.** On a `PDataTable` column set
  `align: "right"` (the header follows unless `titleAlign` says otherwise).
  In `PTable` put `class="numeric"` on the `th` and `td`. Text columns stay
  left.
- **One precision per column.** Render `formatNumber(v, decimals)` with the
  same `decimals` for every row (no `optionalDecimals`), `formatAmount(v)`
  for counts, or `<PValue :value="v" />` for signed values. "—" and "never"
  are the only non-numbers in a numeric cell.
- **Units in the header, not the cell.** Put ȼ, %, d, t, m³ into the en_US
  header string (`"Daily Profit (ȼ)"`, `"ȼ / day"`, `"Spread %"`); the cell
  holds just the number. `formatPayback(days, false)` drops its " d".
- **Long tables keep their header.** A table that can outgrow the viewport
  gets a sticky header: `max-height="calc(100dvh - …)"` (the body scrolls
  under the header, which comes on top of that height), or `fill` inside a
  `flex-1 min-h-0` wrapper of known height (`CXPointTable`,
  `EmpireMaterialIO`). Leave room for sticky bars above it, such as the plan
  status bar. Paginated tables (`:page-size="50"`) don't need it.

Examples: `features/planning/components/PlanMaterialIO.vue`,
`features/roi_overview/components/ROIOverviewTable.vue`,
`features/planning/components/PlanWorkforce.vue` (`PTable`).

## Styling

- **Tailwind v4** via `@tailwindcss/vite`.
  - `src/assets/css/style.css` imports the legacy `tailwind.config.js` with
    `@config` and adds a small `@theme`.
  - Material category colours are in `assets/css/materials.css`.
- **Semantic colours** are CSS variables in the `@theme` of `style.css`:
  `positive`, `negative`, `warning`, `muted` (secondary text, instead of
  `text-white/40`–`/50`) and `muted-strong`. All pass 4.5:1 on every app
  surface. The colour-blind preference sets `data-palette="colorblind"` on
  `<html>`, which swaps `positive`/`negative` to blue/orange, so use the
  tokens, never raw green/red/orange (`kitTokens.test.ts` fails on
  them). Text is at least `text-xs` (12 px).
- **Kit tokens** (same file), one value per meaning; the kit has no hex or
  rgb literals (same test):
  - `surface` (every floating panel, modal and drawer), `surface-sunken`
    (table header);
  - `line` / `line-strong` (borders), `hover` (row, option and menu item
    under the pointer), `selected` (keyboard highlight, sorted column);
  - `ink` / `ink-strong` (body and heading text), `primary` (primary
    button), `link` (links, active sort and page);
  - `rounded-control` (4 px: buttons, inputs, selects, tags, checkboxes),
    `rounded-panel` (6 px: popovers, menus, lists, tooltips, toasts, modals,
    tables) and `shadow-panel`.
  - Floating panels share `panelConfig.panel` (`ui/styles.ts`).
  - Buttons: `error` is filled `negative` with dark text, `warning` amber;
    both follow the colour-blind palette.
- **Fonts:** Roboto and Roboto Mono are self-hosted via `@fontsource`
  (`main.ts`). Use `font-mono` only for tickers, ids and code.
- **Other custom colours:** `pp-primary`, `pp-secondary`,
  `pp-card-header`, `prunplanner` (brand lime), `row`, `row-alternate` and
  `table-border`. The older `gray-dark`, `pp-border` and `link-primary`
  are aliases of `surface`, `line` and `link`; use the token names in new
  code.
- **Custom variants:** `child:`, `child-hover:` and `not-first:`.
- **The app is dark-only.**
- Prefer utility classes in templates. `<style>` blocks are rare.

## Layout & hierarchy

Generated UI gives every element the same weight. Decide what matters
on each view and make the rest quieter.

- **One primary action per view.** Only the main action (Save, Create,
  Search) uses `type="primary"`. Other actions are `secondary`, a
  text/ghost button (`type="ghost"`), or go into a "More" menu
  (`PDropdown` with an icon, a label, and a hint on anything that loses
  data). `PButton` defaults to `primary`, so always set `type` on
  non-primary buttons.
- **Every number once per view.** Don't show the same KPI in a status
  bar, a card and a table. A sticky summary (the plan status bar) is the
  exception, as long as the body doesn't repeat it as a KPI.
- **Big type for values, small for labels.** Labels are `text-muted`,
  values bold and `tabular-nums`, and the value users compare is the
  largest thing in its group.
- **Tabs for switching views, buttons for doing things.** A row of
  toggles that shows one panel at a time is a tab strip (underline,
  `aria-pressed`), not a row of buttons.
- **Advanced options start collapsed** in forms and modals; show the
  2–3 fields most people need.
- **Colour carries meaning, not decoration.** No gradients, glows or
  coloured card borders for decoration; material colours and semantic
  tokens only.
- **One spacing and type scale.** Tailwind steps only (no `text-[13px]`,
  `p-[7px]`); page padding `px-6`, section gaps `gap-6`, inside cards
  `gap-3`.
- **Icons:** `@vicons/material` through `PIcon`, never emoji, and never
  an icon next to every label; use them where they speed up scanning.
- **Copy is plain and specific.** Say what the thing does, in game terms,
  with a number if there is one. Avoid "effortlessly", "seamless",
  "powerful", "unlock", "supercharge", "stay ahead" and anything a
  generic SaaS page could say.

Example: the plan editor header (`views/PlanView.vue`, `PlanMoreMenu`,
`PlanToolTabs`).

## SFC conventions

```vue
<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	// Components
	// Types & Interfaces
	// UI
	import { PButton } from "@/ui";
</script>

<template>…</template>
```

- **Formatting.** Prettier formats with `vueIndentScriptAndStyle: true`, so
  the script body is indented one tab.
- **Props.** Both `defineProps<T>()` and the object syntax with `PropType`
  appear in the codebase. Follow whichever the file already uses.
- **Page titles.** Set them with `useHead` from `@unhead/vue`:
  `` useHead({ title: `${t("…")} | PRUNplanner` }) ``.
- **Lint rules.** `vue/no-unused-properties` warns, and
  `vue/max-attributes-per-line` allows 5 attributes on a single line.

## i18n (`src/lib/i18n/index.ts`)

- **Library.** vue-i18n with the composition API (`legacy: false`) and
  `globalInjection`. Use `t()` from `useI18n()` in scripts and `$t()` in
  templates.
- **Namespaces.** Each JSON file in `src/locales/<locale>/` is a top-level
  namespace, so `locales/en_US/plan.json` → `t("plan.tools.labels.popr")`.
  A new file is picked up automatically through `import.meta.glob`.
- **Loading.** `en_US` loads eagerly and is also the fallback. Other
  locales load lazily in `userStore.setLocale`, which drops messages
  vue-i18n can't compile (`dropInvalidMessages`) so they fall back to
  English instead of throwing in a production build. A literal `@` in a
  message is written `{'@'}`.
- **Language picker.** Only the entries in `SupportedLanguages` show up
  there. The rest are commented out until their translations are complete.
- **`keymode`.** This pseudo-locale renders the raw keys, which helps you
  find where a string comes from.
- **Outside components** (composables, the query repository), use
  `i18n.global` from `@/lib/i18n`.

### Adding or changing text

1. Add the key to `src/locales/en_US/<namespace>.json`. Only edit `en_US`.
2. Use it through `t("namespace.path.key")`.
3. Leave the other locales alone. Crowdin (`crowdin.yml`) syncs them from
   `en_US` and opens its own PRs. Missing keys fall back to English.

Help drawer pages follow the same rule. Write them in
`src/assets/help/en_US/<name>.md` and render them with
`<HelpDrawer file-name="<name>" />` (see
[features/help.md](features/help.md)). The changelog is
`src/assets/help/changelog.md` and is not translated.
