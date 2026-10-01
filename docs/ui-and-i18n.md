# UI & i18n

## Component kit (`src/ui/`)

Build UI from the in-house `P*` components first. The barrel is
`src/ui/index.ts`:

```ts
import { PButton, PForm, PFormItem, PSelect, PInputNumber, PTooltip } from "@/ui";
```

The kit contains `PButton`, `PButtonGroup`, `PCheckbox`, `PForm`,
`PFormItem`, `PFormSeperator` (the misspelling is the real name), `PIcon`,
`PInput`, `PInputNumber`, `PProgressBar`, `PSelect`, `PSelectElement`,
`PSelectMultiple`, `PSpin`, `PTable`, `PTag`, `PToast` (through
`useToast()`, see "Toasts" below), `PTooltip` and `PValue`.

- **Shared props:** `size` (`"sm" | "md"`) and `color` (`primary`,
  `success`, `error`, `warning`, `secondary`). Both types are in
  `ui/ui.types.ts`.
- **Select options** use `PSelectOption` (`{ label, value, children? }`).
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
  - Paginated tables use `:pagination="tablePagination(50)"`
    (`util/pagination.ts`), which puts real buttons in naive-ui's pager.
  - `src/tests/ui/components/a11y.test.ts` runs axe-core on the kit.
- **Numbers:** `formatNumber` / `formatAmount` (`util/numbers.ts`) show "—"
  for ∞ or NaN; payback periods use `formatPayback` ("never" when negative
  or infinite), and `humanizeTimeMs` shows "never" for an infinite runtime.
- **Signed values:** show a profit, delta or other good/bad number with
  `<PValue :value="x" />`. It prints the sign (`+1.00` / `-1.00`) and colours
  by it (zero stays neutral), so it reads without colour. `arrow` adds ▲/▼.
- **Styling:** the Tailwind class sets for each component live in
  `ui/styles.ts`. Change the look there, not per usage.
- **Other libraries, used alongside the kit:**
  - **Data tables:** `XNDataTable` / `XNDataTableColumn` from
    `@skit/x.naive-ui`. Examples: `features/market_live/components/CXPointTable.vue`
    and `features/resource_roi_overview/components/ResourceROITable.vue`.
  - **Overlays** come from raw naive-ui, imported explicitly:
    `import { NModal, NDrawer, NDrawerContent, NPopover } from "naive-ui"`,
    plus `useDialog()`. `AppProvider.vue` supplies the providers.
  - **Toasts:** `const toast = useToast()` from `@/ui`, then
    `toast(text, { type: "error" })` or
    `toast(text, { action: { label, onClick } })`. It renders the kit's
    `PToast` in naive-ui's message queue (bottom-right, kept open on hover)
    and returns the message, so `.destroy()` closes it early. Don't call
    `useMessage()` directly.
  - **Icons:** `@vicons/material`, wrapped in `PIcon`:
    `<PIcon><CheckSharp /></PIcon>`.
  - **Charts:** `src/ui/charts/*.vue` wrap chart.js (`vue-chartjs`,
    datalabels) and `lightweight-charts` (candlesticks). Reuse or extend
    these rather than wiring chart.js in a feature. Ranked values (top N
    plus "Other") use `EmpireBarChart.vue`.
  - **Material chips:** `features/material_tile/components/MaterialTile.vue`
    is the standard way to show a material ticker. It is colour-coded by
    category and has a popover and a market drawer.

## Tables

Every numeric column follows one pattern, so numbers line up and compare
across the app:

- **Right-aligned, header too.** On `XNDataTableColumn` set
  `align="right" title-align="right"`. In `PTable` (native table) put
  `class="numeric"` on the `th` and `td`. Text columns stay left.
- **One precision per column.** Render `formatNumber(v, decimals)` with the
  same `decimals` for every row (no `optionalDecimals`), `formatAmount(v)`
  for counts, or `<PValue :value="v" />` for signed values. "—" and "never"
  are the only non-numbers in a numeric cell.
- **Units in the header, not the cell.** Put ȼ, %, d, t, m³ into the en_US
  header string (`"Daily Profit (ȼ)"`, `"ȼ / day"`, `"Spread %"`); the cell
  holds just the number. `formatPayback(days, false)` drops its " d".
- **Long tables keep their header.** A table that can outgrow the viewport
  gets a fixed header: `max-height="calc(100dvh - …)"` (the body scrolls
  under the header), or `flex-height class="h-full"` inside a
  `flex-1 min-h-0` wrapper of known height (`CXPointTable`,
  `EmpireMaterialIO`). Leave room for sticky bars above it, such as the plan
  status bar. Paginated tables (50 rows) don't need it.

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
  tokens, never raw green/red. Text is at least `text-xs` (12 px).
- **Fonts:** Roboto and Roboto Mono are self-hosted via `@fontsource`
  (`main.ts`). Use `font-mono` only for tickers, ids and code.
- **Other custom colours:** `pp-primary`, `pp-secondary`, `pp-border`,
  `pp-card-header`, `prunplanner` (brand lime),
  `row`, `row-alternate` and `table-border`.
- **Custom variants:** `child:`, `child-hover:` and `not-first:`.
- **The app is dark-only.** naive-ui theme overrides live in
  `src/layout/prunplannerNaiveUI.ts`.
- Prefer utility classes in templates. `<style>` blocks are rare.

## Layout & hierarchy

Generated UI gives every element the same weight. Decide what matters
on each view and make the rest quieter.

- **One primary action per view.** Only the main action (Save, Create,
  Search) uses `type="primary"`. Other actions are `secondary`, a
  text/ghost button (`type="ghost"`), or go into a "More" menu
  (`NDropdown` with an icon, a label, and a hint on anything that loses
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
