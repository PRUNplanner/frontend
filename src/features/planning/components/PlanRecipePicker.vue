<script setup lang="ts">
	import {
		computed,
		nextTick,
		onMounted,
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
	import PlanSegmented from "@/features/planning/components/PlanSegmented.vue";

	// UI
	import { PIcon, PValue } from "@/ui";
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
	const sortOptions = computed(() => [
		{ value: "daily" as const, label: t("plan.picker.sort.daily") },
		{ value: "area" as const, label: t("plan.picker.sort.area") },
		{ value: "payback" as const, label: t("plan.picker.sort.payback") },
		...(hasInsights.value
			? [{ value: "popular" as const, label: t("plan.picker.sort.popular") }]
			: []),
	]);

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

	onMounted(() => {
		trackEvent("plan:recipe_picker_open", { mode });
		listRef.value?.focus({ preventScroll: true });
	});

	const feeds = (i: number): string =>
		recipeConsumers(rows.value[i].recipe, buildings)
			.map((c) => c.building)
			.join(", ");

	const grid =
		"grid grid-cols-[5rem_minmax(0,1fr)_6rem_4.5rem_4.5rem_3.5rem] gap-x-2 items-center";
</script>

<template>
	<section
		:aria-label="title"
		class="my-1 border border-line-strong rounded bg-surface tabular-nums"
		@keydown.esc.stop="emit('close')">
		<header
			class="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-line">
			<span class="text-sm font-medium text-ink-strong">{{ title }}</span>
			<span v-if="subtitle" class="text-xs text-muted">{{ subtitle }}</span>
			<span class="grow" />
			<PlanSegmented
				v-model="sort"
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
			class="max-h-[min(24rem,50vh)] overflow-y-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
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
					row.disabled
						? row.current
							? 'bg-hover'
							: 'opacity-50 cursor-not-allowed'
						: 'cursor-pointer hover:bg-hover',
					i === active
						? 'bg-hover border-l-prunplanner'
						: 'border-l-transparent',
				]"
				class="pl-2.5 pr-3 py-1.5 pointer-coarse:min-h-11 border-t border-t-line border-l-2"
				@mousemove="!row.disabled && (active = i)"
				@click="choose(i)">
				<span class="flex flex-wrap items-center gap-1">
					<MaterialTile
						v-for="m in row.recipe.outputs"
						:key="`OUT#${m.material_ticker}`"
						:ticker="m.material_ticker"
						:amount="m.material_amount"
						disable-drawer
						:enable-popover="false" />
				</span>
				<span class="min-w-0">
					<span class="flex flex-wrap items-center gap-1">
						<span
							v-for="m in row.recipe.inputs"
							:key="`IN#${m.material_ticker}`"
							class="inline-flex items-center gap-0.5">
							<MaterialTile
								:ticker="m.material_ticker"
								:amount="m.material_amount"
								disable-drawer
								:enable-popover="false" />
							<span
								role="img"
								:aria-label="
									t(
										`plan.picker.source.${inputSource(m.material_ticker, materialIO)}`
									)
								"
								class="size-1.5 rounded-full"
								:class="
									inputSource(m.material_ticker, materialIO) ===
									'made'
										? 'bg-positive'
										: 'bg-warning'
								" />
						</span>
					</span>
					<span class="block text-xs text-muted truncate">
						{{ humanizeTimeMs(row.recipe.time_ms) }}
						<template v-if="feeds(i)">
							· {{ t("plan.picker.feeds", { buildings: feeds(i) }) }}
						</template>
						<template v-if="row.current">
							· {{ t("plan.picker.current") }}
						</template>
						<template v-else-if="row.inPlan">
							· {{ t("plan.picker.in_plan") }}
						</template>
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
			<span class="inline-flex items-center gap-1">
				<span class="size-1.5 rounded-full bg-positive" />
				{{ t("plan.picker.source.made") }}
			</span>
			<span class="inline-flex items-center gap-1">
				<span class="size-1.5 rounded-full bg-warning" />
				{{ t("plan.picker.source.bought") }}
			</span>
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
