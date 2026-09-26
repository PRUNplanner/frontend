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
`PSelectMultiple`, `PSpin`, `PTable`, `PTag` and `PTooltip`.

- **Shared props:** `size` (`"sm" | "md"`) and `color` (`primary`,
  `success`, `error`, `warning`, `secondary`). Both types are in
  `ui/ui.types.ts`.
- **Select options** use `PSelectOption` (`{ label, value, children? }`).
- **Styling:** the Tailwind class sets for each component live in
  `ui/styles.ts`. Change the look there, not per usage.
- **Other libraries, used alongside the kit:**
  - **Data tables:** `XNDataTable` / `XNDataTableColumn` from
    `@skit/x.naive-ui`. Examples: `features/market_live/components/CXPointTable.vue`
    and `features/resource_roi_overview/components/ResourceROITable.vue`.
  - **Overlays** come from raw naive-ui, imported explicitly:
    `import { NModal, NDrawer, NDrawerContent, NPopover } from "naive-ui"`,
    plus `useDialog()`. `AppProvider.vue` supplies the providers.
  - **Icons:** `@vicons/material`, wrapped in `PIcon`:
    `<PIcon><CheckSharp /></PIcon>`.
  - **Charts:** `src/ui/charts/*.vue` wrap chart.js (`vue-chartjs`, treemap,
    datalabels) and `lightweight-charts` (candlesticks). Reuse or extend
    these rather than wiring chart.js in a feature.
  - **Material chips:** `features/material_tile/components/MaterialTile.vue`
    is the standard way to show a material ticker. It is colour-coded by
    category and has a popover and a market drawer.

## Styling

- **Tailwind v4** via `@tailwindcss/vite`.
  - `src/assets/css/style.css` imports the legacy `tailwind.config.js` with
    `@config` and adds a small `@theme`.
  - Material category colours are in `assets/css/materials.css`.
- **Custom colours:** `pp-primary`, `pp-secondary`, `pp-border`,
  `pp-card-header`, `prunplanner` (brand lime), `positive`, `negative`,
  `row`, `row-alternate` and `table-border`.
- **Custom variants:** `child:`, `child-hover:` and `not-first:`.
- **The app is dark-only.** naive-ui theme overrides live in
  `src/layout/prunplannerNaiveUI.ts`.
- Prefer utility classes in templates. `<style>` blocks are rare.

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
  locales load lazily in `userStore.setLocale`.
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
