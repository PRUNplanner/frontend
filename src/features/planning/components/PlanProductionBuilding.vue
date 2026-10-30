<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		nextTick,
		type PropType,
		useId,
		useTemplateRef,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		IMaterialIO,
		IProductionBuilding,
	} from "@/features/planning/usePlanCalculation.types";
	import type { PlanDataBuilding } from "@/features/api/schemas/planningData.schemas";
	import type { ITypicalRecipes } from "@/features/plan_analytics/usePlanetInsights.types";
	import type { IBuildingChange } from "@/features/sharing/sharedPlan.types";

	// Composables
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";
	import PlanRecipePicker from "@/features/planning/components/PlanRecipePicker.vue";

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";
	import { zeroEfficiencyReason } from "@/features/planning/engine/efficiency";

	// UI
	import { PTooltip, PButton, PIcon, PInputNumber, PValue } from "@/ui";
	import {
		CheckSharp,
		DeleteOutlineSharp,
		ExpandLessSharp,
		ExpandMoreSharp,
	} from "@vicons/material";

	/**
	 * A building row of the production list (count, efficiency, revenue,
	 * area) with its orders indented below, the recipe picker and the
	 * status line of the last picked recipe
	 *
	 * @author jplacht
	 */
	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		buildingData: {
			type: Object as PropType<IProductionBuilding>,
			required: true,
		},
		buildingIndex: {
			type: Number,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planetId: {
			type: String,
			required: true,
		},
		// what changed against the shared plan
		change: {
			type: Object as PropType<IBuildingChange>,
			required: false,
			default: undefined,
		},
		// recipes hidden, the outputs shown in the row
		folded: {
			type: Boolean,
			required: false,
			default: false,
		},
		// experts placed in this building's field
		experts: {
			type: Number,
			required: false,
			default: 0,
		},
		// open picker: the order it replaces, or null to add one
		picker: {
			type: [Number, null] as PropType<number | null | undefined>,
			required: false,
			default: undefined,
		},
		// after a pick: under which order, and what changed
		status: {
			type: Object as PropType<{ recipe: number; text: string }>,
			required: false,
			default: undefined,
		},
		materialIO: {
			type: Array as PropType<IMaterialIO[]>,
			required: false,
			default: () => [],
		},
		buildings: {
			type: Array as PropType<IProductionBuilding[]>,
			required: false,
			default: () => [],
		},
	});

	const emit = defineEmits<{
		(e: "update:building:amount", index: number, value: number): void;
		(e: "delete:building", index: number): void;
		(
			e: "update:building:recipe:amount",
			buildingIndex: number,
			recipeIndex: number,
			value: number
		): void;
		(
			e: "delete:building:recipe",
			buildingIndex: number,
			recipeIndex: number
		): void;
		(
			e: "add:building:recipes",
			buildingIndex: number,
			recipes: PlanDataBuilding["active_recipes"]
		): void;
		(
			e: "update:building:recipe",
			buildingIndex: number,
			recipeIndex: number,
			recipeid: string
		): void;
		(
			e: "pick:building:recipe",
			buildingIndex: number,
			recipeid: string
		): void;
		(e: "toggle:fold"): void;
		(e: "open:picker", recipeIndex: number | null): void;
		(e: "close:picker"): void;
		(e: "undo"): void;
	}>();

	// Local State
	const localBuildingData: ComputedRef<IProductionBuilding> = computed(
		() => props.buildingData
	);

	const { typicalRecipes } = usePlanetInsights(() => props.planetId);

	// the planet's typical recipes for an empty building, only ones it can run
	const typicalMix: ComputedRef<ITypicalRecipes | undefined> = computed(
		() => {
			if (
				props.disabled ||
				localBuildingData.value.activeRecipes.length > 0
			)
				return undefined;
			const typical = typicalRecipes(localBuildingData.value.name);
			if (!typical) return undefined;
			const optionIds = new Set(
				localBuildingData.value.recipeOptions.map((o) => o.recipe_id)
			);
			const recipes = typical.recipes.filter((r) =>
				optionIds.has(r.recipeid)
			);
			return recipes.length > 0 ? { ...typical, recipes } : undefined;
		}
	);

	const typicalMixOutputs: ComputedRef<string[]> = computed(() =>
		(typicalMix.value?.recipes ?? []).flatMap(
			(r) =>
				localBuildingData.value.recipeOptions
					.find((o) => o.recipe_id === r.recipeid)
					?.outputs.map((m) => m.material_ticker) ?? []
		)
	);

	// why a building produces nothing, shown next to "0.00 %"
	const zeroReason: ComputedRef<string | undefined> = computed(() => {
		if (localBuildingData.value.totalEfficiency !== 0) return undefined;
		const type = zeroEfficiencyReason(
			localBuildingData.value.efficiencyElements
		);
		if (!type) return undefined;
		return type === "FERTILITY" || type === "WORKFORCE"
			? `plan.components.production_building.zero_reason.${type}`
			: `game.efficiency_type.${type}`;
	});

	// a recipe's ȼ per building and day, as the picker shows it
	const optionDaily = (recipeId: string): number =>
		localBuildingData.value.recipeOptions.find(
			(o) => o.recipe_id === recipeId
		)?.dailyRevenue ?? 0;

	// "✓ Agriculture · 3 experts": the expertise green with a tick when the
	// planet's COGC lifts it, red with a cross when not, then what else
	// lifts the efficiency
	// the expertise's program lifts by 1.25 (engine/efficiency.ts); a
	// workforce program's 1.1 lifts any building of that tier and is listed
	const isExpertiseCOGC = (e: { efficiencyType: string; value: number }) =>
		e.efficiencyType === "COGC" && e.value === 1.25;
	const cogcMatch = computed(() =>
		localBuildingData.value.efficiencyElements.some(isExpertiseCOGC)
	);
	// the fold button's label replaces its content: the line is its description
	const subLineId = useId();
	const subParts: ComputedRef<string[]> = computed(() => {
		const b = localBuildingData.value;
		const parts: string[] = [];
		for (const e of b.efficiencyElements) {
			if (
				e.efficiencyType === "WORKFORCE" ||
				isExpertiseCOGC(e) ||
				e.value === 1
			)
				continue;
			parts.push(
				e.efficiencyType === "EXPERT"
					? t(
							"plan.production.experts",
							{ n: props.experts },
							props.experts
						)
					: t(`game.efficiency_type.${e.efficiencyType}`)
			);
		}
		return parts;
	});
	const subLine = computed(() =>
		[
			...(localBuildingData.value.expertise
				? [t(`game.expertise.${localBuildingData.value.expertise}`)]
				: []),
			...subParts.value,
		].join(" · ")
	);

	const outputTickers: ComputedRef<string[]> = computed(() => [
		...new Set(
			localBuildingData.value.activeRecipes.flatMap((r) =>
				r.recipe.outputs.map((o) => o.material_ticker)
			)
		),
	]);

	// a closed picker gives the focus back to what opened it
	const rootRef = useTemplateRef<HTMLElement>("root");
	watch(
		() => props.picker,
		(now, before) => {
			if (now !== undefined || before === undefined) return;
			void nextTick(() => {
				// another picker or field took the focus meanwhile: keep it
				const focused = document.activeElement;
				if (
					focused &&
					focused !== document.body &&
					!rootRef.value?.contains(focused)
				)
					return;
				const opener =
					before === null
						? rootRef.value?.querySelector("[data-add-recipe]")
						: rootRef.value?.querySelectorAll(
								"[data-recipe-button]"
							)[before];
				(opener as HTMLElement | null | undefined)?.focus();
			});
		}
	);

	function pick(recipeId: string): void {
		if (props.picker === null)
			emit("pick:building:recipe", props.buildingIndex, recipeId);
		else if (props.picker !== undefined)
			emit(
				"update:building:recipe",
				props.buildingIndex,
				props.picker,
				recipeId
			);
	}
</script>

<template>
	<div
		ref="root"
		class="border-b border-line"
		:data-building="localBuildingData.name">
		<!-- a phone: tile, name and delete; under them the count and ȼ/day -->
		<div
			class="grid grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_4.5rem_6.5rem_4.5rem_1.75rem] pointer-coarse:grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_4.5rem_6.5rem_4.5rem_2.75rem] @max-[40rem]/prod:grid-cols-[2.75rem_minmax(0,1fr)_auto]! gap-x-2 @max-[40rem]/prod:gap-y-2 items-center py-2 pl-2 border-l-2 tabular-nums"
			:class="
				localBuildingData.amount > 0
					? 'border-l-transparent'
					: 'border-l-negative'
			"
			data-building-row>
			<span
				class="flex items-center justify-center h-6 rounded-control border border-line-strong bg-surface text-xs font-bold text-ink-strong">
				{{ localBuildingData.name }}
			</span>
			<!-- name over what lifts it; a wide production column puts both on
				one line, the name whole, the rest cut short (all of it on hover) -->
			<button
				type="button"
				class="min-w-0 min-h-6 pointer-coarse:min-h-11 text-left cursor-pointer @min-[48rem]/prod:flex @min-[48rem]/prod:items-center @min-[48rem]/prod:gap-x-3"
				:aria-expanded="folded ? 'false' : 'true'"
				:aria-label="
					t('plan.production.fold', {
						building: t(`game.building.${localBuildingData.name}`),
					})
				"
				:aria-describedby="subLineId"
				@click="emit('toggle:fold')">
				<span
					class="flex items-center gap-1 font-medium text-ink-strong @min-[48rem]/prod:shrink-0 @min-[48rem]/prod:max-w-[60%]">
					<span
						class="truncate @max-[40rem]/prod:whitespace-normal"
						:title="t(`game.building.${localBuildingData.name}`)">
						{{ t(`game.building.${localBuildingData.name}`) }}
					</span>
					<PIcon :size="18" class="shrink-0 text-muted-strong">
						<ExpandMoreSharp v-if="folded" />
						<ExpandLessSharp v-else />
					</PIcon>
					<template v-if="folded">
						<MaterialTile
							v-for="ticker in outputTickers"
							:key="`FOLDED#${ticker}`"
							:ticker="ticker"
							disable-drawer
							:enable-popover="false" />
					</template>
					<span
						v-for="kind in change?.kinds"
						:key="kind"
						class="text-xs font-bold uppercase"
						:class="
							kind === 'added' ? 'text-positive' : 'text-warning'
						"
						data-badge>
						{{ t(`sharing.compare.${kind}`) }}
					</span>
				</span>
				<span
					:id="subLineId"
					class="block text-xs text-muted line-clamp-2 @min-[48rem]/prod:min-w-0 @min-[48rem]/prod:truncate"
					:title="subLine">
					<span
						v-if="zeroReason"
						class="text-negative"
						data-zero-reason>
						{{ t(zeroReason) }} ·
					</span>
					<span
						v-if="localBuildingData.expertise"
						class="whitespace-nowrap"
						:class="cogcMatch ? 'text-positive' : 'text-negative'"
						:title="
							t(
								cogcMatch
									? 'plan.production.cogc_match'
									: 'plan.production.cogc_no_match'
							)
						"
						data-cogc-match>
						<span aria-hidden="true">{{
							cogcMatch ? "✓" : "✗"
						}}</span>
						<span class="sr-only"
							>{{
								t(
									cogcMatch
										? "plan.production.cogc_match"
										: "plan.production.cogc_no_match"
								)
							}}:</span
						>
						{{ t(`game.expertise.${localBuildingData.expertise}`) }}
					</span>
					<!-- break between the parts, never inside one -->
					<template v-for="part in subParts" :key="part">
						<template
							v-if="
								localBuildingData.expertise ||
								part !== subParts[0]
							">
							·
						</template>
						<span class="whitespace-nowrap">{{ part }}</span>
					</template>
				</span>
			</button>
			<PInputNumber
				:aria-label="
					t('plan.components.production_building.qty_label', {
						building: localBuildingData.name,
					})
				"
				:value="localBuildingData.amount"
				size="sm"
				:disabled="disabled"
				:show-buttons="!disabled"
				:min="0"
				class="w-full @max-[40rem]/prod:w-36 @max-[40rem]/prod:row-start-2 @max-[40rem]/prod:col-span-2"
				@update:value="
					(value) => {
						if (value !== null && value !== undefined)
							emit(
								'update:building:amount',
								buildingIndex,
								value
							);
					}
				" />
			<span
				class="text-right text-sm whitespace-nowrap @max-[40rem]/prod:hidden">
				<PTooltip>
					<template #trigger>
						<span class="text-ink-strong hover:cursor-help">
							{{
								formatPercent(
									localBuildingData.totalEfficiency * 100,
									1
								)
							}}
						</span>
					</template>
					<div
						v-for="element in localBuildingData.efficiencyElements"
						:key="`${localBuildingData.name}#EFFICIENCY#${element.efficiencyType}`"
						class="flex flex-row justify-between gap-x-3 child:p-1">
						<div>
							{{
								t(
									`game.efficiency_type.${element.efficiencyType}`
								)
							}}
						</div>
						<div>{{ formatNumber(element.value * 100) }} %</div>
					</div>
				</PTooltip>
			</span>
			<span
				class="text-right text-sm @max-[40rem]/prod:row-start-2 @max-[40rem]/prod:col-start-3 @max-[40rem]/prod:leading-tight">
				<PValue :value="localBuildingData.dailyRevenue" />
				<span class="@min-[40rem]/prod:hidden block text-xs text-muted">
					{{
						t("plan.production.card_meta", {
							efficiency: formatPercent(
								localBuildingData.totalEfficiency * 100,
								1
							),
							area: localBuildingData.areaUsed,
						})
					}}
				</span>
			</span>
			<span class="text-right text-sm text-ink @max-[40rem]/prod:hidden">
				{{ localBuildingData.areaUsed }}
			</span>
			<button
				v-if="!disabled"
				type="button"
				class="touch-target flex items-center justify-center size-6 pointer-coarse:size-11 rounded-control text-muted hover:text-negative hover:bg-negative/10 cursor-pointer @max-[40rem]/prod:row-start-1 @max-[40rem]/prod:col-start-3 @max-[40rem]/prod:justify-self-end"
				:aria-label="
					t('plan.production.delete_building', {
						building: localBuildingData.name,
					})
				"
				@click="emit('delete:building', buildingIndex)">
				<PIcon :size="16"><DeleteOutlineSharp /></PIcon>
			</button>
		</div>

		<!-- one grid for the building's orders (their rows use its columns):
			amount, inputs (they wrap first when tight) and arrow + outputs (never
			squeezed) as wide as the widest of the whole
			plan (PlanProduction measures them), so they line up across
			buildings; the opener, runtime, ȼ/day, COGM, delete. Everything else
			in it spans the full width -->
		<div
			v-if="!folded"
			class="ml-4 mb-2 pl-3 border-l border-line @min-[40rem]/prod:grid @min-[40rem]/prod:grid-cols-[5rem_minmax(0,var(--recipe-in,12rem))_var(--recipe-out,8rem)_minmax(min-content,1fr)_4.5rem_6.5rem_4.5rem_1.75rem] pointer-coarse:@min-[40rem]/prod:grid-cols-[5rem_minmax(0,var(--recipe-in,12rem))_var(--recipe-out,8rem)_minmax(min-content,1fr)_4.5rem_6.5rem_4.5rem_2.75rem] @min-[40rem]/prod:gap-x-2 @min-[40rem]/prod:[&>*]:col-span-full"
			data-recipes>
			<template
				v-for="(recipe, index) in localBuildingData.activeRecipes"
				:key="`RECIPE#${index}#${recipe.recipeId}`">
				<PlanProductionRecipe
					:disabled="disabled"
					:recipe-index="index"
					:building-amount="localBuildingData.amount"
					:option-daily="optionDaily(recipe.recipeId)"
					:recipe-data="recipe"
					:cx-uuid="cxUuid"
					:planet-id="planetId"
					:is-new="!!change?.newRecipes.includes(recipe.recipeId)"
					:picker-open="picker === index"
					:striped="index % 2 === 1"
					@update:building:recipe:amount="
						(i: number, value: number) =>
							emit(
								'update:building:recipe:amount',
								buildingIndex,
								i,
								value
							)
					"
					@delete:building:recipe="
						(i: number) =>
							emit('delete:building:recipe', buildingIndex, i)
					"
					@open:picker="
						(i: number) =>
							picker === i
								? emit('close:picker')
								: emit('open:picker', i)
					" />
				<PlanRecipePicker
					v-if="picker === index"
					mode="change"
					:building="localBuildingData"
					:recipe-index="index"
					:material-i-o="materialIO"
					:buildings="buildings"
					:planet-id="planetId"
					@pick="pick"
					@close="emit('close:picker')" />
				<div
					v-if="status?.recipe === index"
					role="status"
					class="flex items-center gap-2 my-1 px-3 py-1 rounded-control bg-positive/5 text-xs text-ink">
					<PIcon :size="14" class="text-positive"
						><CheckSharp
					/></PIcon>
					<span>{{ status.text }}</span>
					<button
						type="button"
						class="min-h-6 pointer-coarse:min-h-11 font-medium text-link hover:underline cursor-pointer"
						@click="emit('undo')">
						{{ t("plan.history.undo") }}
					</button>
					<span class="grow" />
					<span class="text-muted">{{
						t("plan.picker.undo_key")
					}}</span>
				</div>
			</template>

			<div
				v-if="localBuildingData.activeRecipes.length === 0"
				class="flex flex-wrap items-center gap-x-2.5 gap-y-1 py-2 text-muted text-xs">
				<!-- nothing ordered yet, or nothing this building can make here -->
				<span>
					{{
						localBuildingData.recipeOptions.length
							? t("plan.components.production_building.no_recipe")
							: t(
									"plan.components.production_building.no_recipe_available"
								)
					}}
				</span>
				<template v-if="typicalMix">
					<span>
						{{ t("plan.components.production_building.mix_hint") }}
					</span>
					<PButton
						size="sm"
						type="secondary"
						:aria-label="
							t(
								'plan.components.production_building.mix_add_label',
								{
									building: localBuildingData.name,
								}
							)
						"
						@click="
							emit(
								'add:building:recipes',
								buildingIndex,
								typicalMix.recipes
							)
						">
						<span class="flex items-center gap-1.5">
							<MaterialTile
								v-for="ticker in typicalMixOutputs"
								:key="`${localBuildingData.name}#MIX#${ticker}`"
								:ticker="ticker"
								disable-drawer
								:enable-popover="false" />
							<span class="text-prunplanner">
								{{ formatPercent(typicalMix.percentage, 0) }}
							</span>
							{{
								t("plan.components.production_building.mix_add")
							}}
						</span>
					</PButton>
				</template>
			</div>

			<!-- in the brand yellow, so a second order is easy to find -->
			<button
				v-if="!disabled && localBuildingData.recipeOptions.length > 0"
				type="button"
				class="inline-flex items-center h-7 pointer-coarse:min-h-11 my-1 justify-self-start px-2.5 rounded-control border text-xs font-medium text-prunplanner cursor-pointer transition-colors hover:border-prunplanner hover:bg-prunplanner/10"
				:class="
					picker === null
						? 'border-prunplanner bg-prunplanner/15'
						: 'border-prunplanner/40'
				"
				:aria-expanded="picker === null ? 'true' : 'false'"
				data-add-recipe
				@click="
					picker === null
						? emit('close:picker')
						: emit('open:picker', null)
				">
				{{ t("plan.production.add_recipe") }}
			</button>
			<PlanRecipePicker
				v-if="picker === null"
				mode="add"
				:building="localBuildingData"
				:material-i-o="materialIO"
				:buildings="buildings"
				:planet-id="planetId"
				@pick="pick"
				@close="emit('close:picker')" />
		</div>
	</div>
</template>
