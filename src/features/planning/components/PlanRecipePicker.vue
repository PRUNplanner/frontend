<script setup lang="ts">
	import {
		computed,
		nextTick,
		onMounted,
		onUnmounted,
		ref,
		type Ref,
		useId,
		useTemplateRef,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		dependencyNote,
		inputSource,
		pickerOptions,
		recipeConsumers,
		type PickerMode,
		type PickerSort,
	} from "@/features/planning/recipePicker.util";
	import { humanizeTimeMs } from "@/util/date";
	import { formatNumber, formatPayback, formatPercent } from "@/util/numbers";

	// Types & Interfaces
	import type {
		IMaterialIO,
		IProductionBuilding,
	} from "@/features/planning/usePlanCalculation.types";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// UI
	import { PIcon, PSegmented, PValue } from "@/ui";
	import { CloseSharp, WarningAmberSharp } from "@vicons/material";

	/**
	 * Inline recipe picker under a recipe row (change) or under
	 * "+ Recipe" (add): click or Enter commits, Esc closes
	 *
	 * @author jplacht
	 */
	const {
		mode,
		building,
		recipeIndex = undefined,
		materialIO,
		buildings,
		planetId,
	} = defineProps<{
		mode: PickerMode;
		building: IProductionBuilding;
		// change: the order being replaced
		recipeIndex?: number;
		materialIO: IMaterialIO[];
		buildings: IProductionBuilding[];
		planetId: string;
	}>();

	const emit = defineEmits<{
		(e: "pick", recipeId: string): void;
		(e: "close"): void;
	}>();

	const { isAvailable: hasInsights, recipePopularity } = usePlanetInsights(
		() => planetId
	);
	const plansHere = (id: string): number | undefined =>
		recipePopularity(building.name, id);

	const current = computed(() =>
		recipeIndex === undefined
			? undefined
			: building.activeRecipes[recipeIndex]
	);

	const sort: Ref<PickerSort> = ref("daily");
	// shown with insights only: without them there is one order
	const sortOptions = [
		{ value: "daily" as const, label: t("plan.picker.sort.daily") },
		{ value: "popular" as const, label: t("plan.picker.sort.popular") },
	];

	const rows = computed(() =>
		pickerOptions(
			mode,
			building.recipeOptions,
			building.activeRecipes.map((r) => r.recipeId),
			current.value?.recipeId,
			sort.value,
			plansHere
		)
	);

	// the current recipe's figures: active recipes carry none of their own
	const currentRevenue = computed(
		() =>
			building.recipeOptions.find(
				(o) => o.recipe_id === current.value?.recipeId
			)?.dailyRevenue ?? 0
	);

	const note = computed(() =>
		current.value
			? dependencyNote(current.value.recipe, materialIO, buildings)
			: undefined
	);

	const noteText = computed(() => {
		const n = note.value;
		if (!n) return "";
		const amount = formatNumber(n.amount);
		return n.consumers.length > 0
			? t("plan.picker.dependency", {
					buildings: n.consumers.map((c) => c.building).join(", "),
					ticker: n.ticker,
					outputs: [
						...new Set(n.consumers.flatMap((c) => c.outputs)),
					].join(", "),
					amount,
				})
			: t("plan.picker.dependency_workforce", {
					ticker: n.ticker,
					amount,
				});
	});

	const title = computed(() =>
		mode === "change"
			? t("plan.picker.change_title")
			: t("plan.picker.add_title", { building: building.name })
	);
	const subtitle = computed(() => {
		const c = current.value;
		if (!c) return "";
		return t("plan.picker.replacing", {
			amount: c.amount,
			ticker: c.recipe.outputs.map((o) => o.material_ticker).join(", "),
		});
	});

	// the keyboard highlight, over selectable rows only
	const active: Ref<number> = ref(-1);
	const selectable = computed(() =>
		rows.value.flatMap((r, i) => (r.disabled ? [] : [i]))
	);
	watch(
		selectable,
		(s) => {
			if (!s.includes(active.value)) active.value = s[0] ?? -1;
		},
		{ immediate: true }
	);

	const listId = useId();
	const optionId = (i: number): string => `${listId}-${i}`;
	const listRef = useTemplateRef<HTMLElement>("list");

	function move(step: 1 | -1): void {
		const s = selectable.value;
		if (s.length === 0) return;
		const at = s.indexOf(active.value);
		active.value = s[(at + step + s.length) % s.length];
		void nextTick(() =>
			document
				.getElementById(optionId(active.value))
				?.scrollIntoView({ block: "nearest" })
		);
	}

	function choose(i: number): void {
		const row = rows.value[i];
		if (!row || row.disabled) return;
		emit("pick", row.recipe.recipe_id);
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === "ArrowDown") move(1);
		else if (e.key === "ArrowUp") move(-1);
		else if (e.key === "Enter") choose(active.value);
		else if (e.key === "Escape") emit("close");
		else return;
		e.preventDefault();
		e.stopPropagation();
	}

	// a click outside closes it; the openers toggle it themselves, and a
	// tile's price overlay (a teleported tooltip) belongs to it
	const rootRef = useTemplateRef<HTMLElement>("root");
	function onOutside(e: PointerEvent): void {
		const target = e.target as Element | null;
		if (
			rootRef.value?.contains(target) ||
			target?.closest(
				"[data-recipe-button], [data-add-recipe], [role=tooltip]"
			)
		)
			return;
		emit("close");
	}

	onMounted(() => {
		trackEvent("plan:recipe_picker_open", { mode });
		listRef.value?.focus({ preventScroll: true });
		document.addEventListener("pointerdown", onOutside);
	});
	onUnmounted(() => document.removeEventListener("pointerdown", onOutside));

	// per row: inputs the plan makes itself, and plan buildings it feeds
	// per row, under its inputs: inputs the plan makes itself, plan
	// buildings it feeds, and whether it's the current or an ordered recipe
	const notes = computed(() =>
		rows.value.map((row) => {
			const made = row.recipe.inputs
				.map((m) => m.material_ticker)
				.filter((ticker) => inputSource(ticker, materialIO) === "made")
				.join(", ");
			const feeds = recipeConsumers(row.recipe, buildings)
				.map((c) => c.building)
				.join(", ");
			return [
				...(made ? [t("plan.picker.uses_made", { tickers: made })] : []),
				...(feeds ? [t("plan.picker.feeds", { buildings: feeds })] : []),
				...(row.current
					? [t("plan.picker.current")]
					: row.inPlan
						? [t("plan.picker.in_plan")]
						: []),
			].join(" · ");
		})
	);

	// a phone keeps makes, from and ȼ/day
	const grid =
		"grid grid-cols-[5rem_minmax(0,1fr)_6rem_4.5rem_4.5rem_3.5rem] max-md:grid-cols-[auto_minmax(0,1fr)_auto]! max-md:[&>*:nth-child(n+4)]:hidden gap-x-2 items-center";
</script>

<template>
	<!-- a phone: a bottom sheet over a backdrop, a tap outside closes it -->
	<div
		class="md:hidden fixed inset-0 z-1100 bg-black/60"
		aria-hidden="true"
		data-picker-backdrop />
	<section
		ref="root"
		:aria-label="title"
		class="my-1 border border-line-strong rounded bg-surface tabular-nums max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-1101 max-md:my-0 max-md:flex max-md:flex-col max-md:max-h-[80dvh] max-md:rounded-none max-md:rounded-t-2xl max-md:pb-[env(safe-area-inset-bottom)]"
		@keydown.esc.stop="emit('close')">
		<header
			class="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-line">
			<span class="text-sm font-medium text-ink-strong">{{ title }}</span>
			<span v-if="subtitle" class="text-xs text-muted">{{ subtitle }}</span>
			<span class="grow" />
			<PSegmented
				v-if="hasInsights"
				v-model:value="sort"
				size="sm"
				:options="sortOptions"
				:label="t('plan.picker.sort.label')" />
			<button
				type="button"
				class="touch-target flex items-center justify-center size-6 rounded-control text-muted hover:text-white hover:bg-hover cursor-pointer"
				:aria-label="t('plan.picker.close')"
				@click="emit('close')">
				<PIcon :size="16"><CloseSharp /></PIcon>
			</button>
		</header>
		<div
			v-if="note"
			role="note"
			class="flex items-center gap-2 px-3 py-1.5 border-b border-line bg-warning/5 text-xs text-ink"
			data-dependency-note>
			<PIcon :size="14" class="text-warning shrink-0">
				<WarningAmberSharp />
			</PIcon>
			<span>{{ noteText }}</span>
		</div>
		<div
			:class="grid"
			class="px-3 py-1 text-xs font-medium text-muted">
			<span>{{ t("plan.picker.columns.makes") }}</span>
			<span>{{ t("plan.picker.columns.from") }}</span>
			<span class="text-right">{{ t("plan.picker.columns.daily") }}</span>
			<span class="text-right">{{ t("plan.picker.columns.area") }}</span>
			<span class="text-right">{{ t("plan.picker.columns.payback") }}</span>
			<span class="text-right">
				<template v-if="hasInsights">
					{{ t("plan.picker.columns.plans") }}
				</template>
			</span>
		</div>
		<div
			ref="list"
			role="listbox"
			tabindex="0"
			:aria-label="title"
			:aria-activedescendant="active >= 0 ? optionId(active) : undefined"
			class="max-h-[min(24rem,50vh)] max-md:max-h-none max-md:flex-1 max-md:min-h-0 overflow-y-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
			@keydown="onKeydown">
			<div
				v-for="(row, i) in rows"
				:id="optionId(i)"
				:key="row.recipe.recipe_id"
				role="option"
				:aria-selected="i === active ? 'true' : 'false'"
				:aria-disabled="row.disabled ? 'true' : undefined"
				:class="[
					grid,
					// the current recipe carries the accent bar, the
					// keyboard/mouse highlight only the background
					row.current
						? 'border-l-prunplanner bg-prunplanner/5'
						: 'border-l-transparent',
					row.disabled && !row.current
						? 'opacity-50 cursor-not-allowed'
						: '',
					!row.disabled ? 'cursor-pointer hover:bg-hover' : '',
					i === active ? 'bg-hover' : '',
				]"
				class="pl-2.5 pr-3 py-1.5 pointer-coarse:min-h-11 border-t border-t-line border-l-2"
				@mousemove="!row.disabled && (active = i)"
				@click="choose(i)">
				<!-- what it makes, and how long one run takes -->
				<span class="flex flex-col items-start gap-0.5">
					<span class="flex flex-wrap items-center gap-1">
						<MaterialTile
							v-for="m in row.recipe.outputs"
							:key="`OUT#${m.material_ticker}`"
							:ticker="m.material_ticker"
							:amount="m.material_amount"
							disable-drawer />
					</span>
					<span class="text-xs text-muted text-nowrap">
						{{ humanizeTimeMs(row.recipe.time_ms) }}
					</span>
				</span>
				<span class="min-w-0">
					<span class="flex flex-wrap items-center gap-1">
						<MaterialTile
							v-for="m in row.recipe.inputs"
							:key="`IN#${m.material_ticker}`"
							:ticker="m.material_ticker"
							:amount="m.material_amount"
							disable-drawer />
					</span>
					<span
						v-if="notes[i]"
						class="block mt-0.5 text-xs text-muted truncate"
						:title="notes[i]">
						{{ notes[i] }}
					</span>
				</span>
				<span class="text-right text-sm leading-tight">
					<PValue class="block" :value="row.recipe.dailyRevenue" />
					<span
						v-if="current && !row.current"
						class="block text-xs text-muted">
						{{
							t("plan.picker.vs_now", {
								delta: formatNumber(
									row.recipe.dailyRevenue - currentRevenue,
									0,
									false,
									true
								),
							})
						}}
					</span>
				</span>
				<span class="text-right text-sm">
					<PValue :value="row.recipe.profitPerArea" />
				</span>
				<span class="text-right text-sm text-ink">
					{{ formatPayback(row.recipe.roi) }}
				</span>
				<span class="text-right text-xs text-muted-strong">
					<template v-if="hasInsights">
						{{
							plansHere(row.recipe.recipe_id) !== undefined
								? formatPercent(plansHere(row.recipe.recipe_id)!, 0)
								: t("plan.picker.below_threshold")
						}}
					</template>
				</span>
			</div>
		</div>
		<footer
			class="flex flex-wrap items-center gap-3 px-3 py-1.5 border-t border-line text-xs text-muted">
			<span>{{ t("plan.picker.per_building") }}</span>
			<span class="grow" />
			<span>
				{{
					mode === "add"
						? t("plan.picker.keys_add")
						: t("plan.picker.keys")
				}}
			</span>
		</footer>
	</section>
</template>
