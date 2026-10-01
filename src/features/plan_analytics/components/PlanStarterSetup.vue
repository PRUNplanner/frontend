<script setup lang="ts">
	import { computed, type ComputedRef, ref, type Ref } from "vue";

	// Composables
	import { useBuildingData } from "@/database/services/useBuildingData";
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import {
		segmentColor,
		STARTER_MAX_BUILDINGS,
		STARTER_PRESELECT_PERCENTAGE,
		starterExperts,
	} from "@/features/plan_analytics/planInsights.util";
	import { formatPercent } from "@/util/numbers";

	// Types & Interfaces
	import type { PlanetResource } from "@/features/api/schemas/gameData.schemas";
	import type { IStarterSetup } from "@/features/plan_analytics/usePlanetInsights.types";

	// UI
	import { PButton, PCheckbox } from "@/ui";
	import { InsightsSharp } from "@vicons/material";

	const { planetId, planetResources } = defineProps<{
		planetId: string;
		planetResources: PlanetResource[];
	}>();

	const emit = defineEmits<{
		(e: "apply", setup: IStarterSetup, isSelectionChanged: boolean): void;
		(e: "dismiss"): void;
	}>();

	const { getBuildingRecipes } = useBuildingData();
	const { totalPlans, popularBuildings, typicalRecipes, experts } =
		usePlanetInsights(() => planetId);

	const candidates = computed(() =>
		popularBuildings.value.slice(0, STARTER_MAX_BUILDINGS).map((b) => {
			// only recipes the building can run here
			const options = getBuildingRecipes(b.ticker, planetResources);
			const recipes = (typicalRecipes(b.ticker)?.recipes ?? []).filter(
				(r) => options.some((o) => o.recipe_id === r.recipeid)
			);
			return {
				ticker: b.ticker,
				percentage: b.percentage,
				amount: Math.max(1, Math.round(b.median_amount)),
				recipes,
				outputs: recipes.flatMap(
					(r) =>
						options
							.find((o) => o.recipe_id === r.recipeid)
							?.outputs.map((m) => m.material_ticker) ?? []
				),
			};
		})
	);

	const preselected: ComputedRef<Set<string>> = computed(
		() =>
			new Set(
				candidates.value
					.filter((c) => c.percentage >= STARTER_PRESELECT_PERCENTAGE)
					.map((c) => c.ticker)
			)
	);

	// undefined until the user changes a checkbox
	const selection: Ref<Set<string> | undefined> = ref(undefined);
	const checked: ComputedRef<Set<string>> = computed(
		() => selection.value ?? preselected.value
	);

	function toggle(ticker: string, value: boolean): void {
		const next = new Set(checked.value);
		if (value) next.add(ticker);
		else next.delete(ticker);
		selection.value = next;
	}

	const isSelectionChanged: ComputedRef<boolean> = computed(
		() =>
			checked.value.size !== preselected.value.size ||
			[...checked.value].some((t) => !preselected.value.has(t))
	);

	const addedExperts = computed(() => starterExperts(experts.value));

	const expertSplit = computed(() => {
		const sorted = [...experts.value].sort(
			(a, b) => b.plans_percentage - a.plans_percentage
		);
		const total = sorted.reduce((sum, e) => sum + e.plans_percentage, 0);
		return sorted.map((e) => ({
			type: e.type,
			percentage: e.plans_percentage,
			width: total > 0 ? (e.plans_percentage / total) * 100 : 0,
			added: addedExperts.value.find((a) => a.type === e.type)?.amount,
		}));
	});

	function apply(): void {
		emit(
			"apply",
			{
				buildings: candidates.value
					.filter((c) => checked.value.has(c.ticker))
					.map(({ ticker, amount, recipes }) => ({
						ticker,
						amount,
						recipes,
					})),
				experts: addedExperts.value,
			},
			isSelectionChanged.value
		);
	}
</script>

<template>
	<div class="p-3 sm:p-6 flex justify-center">
		<div
			class="w-full max-w-215 border border-white/15 rounded bg-gray-dark p-4 sm:p-5 flex flex-col gap-4">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h3 class="text-white font-bold text-base mb-1">
						{{
							$t("plan.tools.plan_starter.title", {
								planet: planetId,
							})
						}}
					</h3>
					<p class="text-muted-strong text-sm">
						{{
							$t("plan.tools.plan_starter.description", {
								plans: totalPlans,
								max: STARTER_MAX_BUILDINGS,
								percent: formatPercent(
									STARTER_PRESELECT_PERCENTAGE,
									0
								),
							})
						}}
					</p>
				</div>
				<span
					class="hidden sm:flex h-7 w-7 shrink-0 text-prunplanner"
					aria-hidden="true">
					<InsightsSharp />
				</span>
			</div>

			<div class="flex flex-col">
				<div
					class="hidden md:grid grid-cols-[13rem_1fr_6rem_1fr] gap-3 px-2.5 pb-1 text-xs font-bold uppercase text-muted">
					<span class="pl-6">{{ $t("plan.tools.plan_starter.columns.building") }}</span>
					<span>{{ $t("plan.tools.plan_starter.columns.in_plans") }}</span>
					<span>{{ $t("plan.tools.plan_starter.columns.amount") }}</span>
					<span>{{ $t("plan.tools.plan_starter.columns.recipes") }}</span>
				</div>
				<div
					v-for="c in candidates"
					:key="`STARTER#${c.ticker}`"
					class="grid grid-cols-[1fr_auto] md:grid-cols-[13rem_1fr_6rem_1fr] items-center gap-x-3 gap-y-1 px-2.5 py-1.5 rounded hover:bg-white/5">
					<!-- the label (ticker and name) toggles it too -->
					<PCheckbox
						class="min-w-0"
						:checked="checked.has(c.ticker)"
						@update:checked="
							(value?: boolean) => toggle(c.ticker, !!value)
						">
						<span class="inline-block py-0.5 cursor-pointer">
						<strong class="font-mono text-white">
							{{ c.ticker }}
						</strong>
						<span class="text-xs text-muted-strong ml-1.5">
							{{ $t(`game.building.${c.ticker}`) }}
						</span>
						</span>
					</PCheckbox>
					<span
						class="pl-6 md:pl-0 flex items-center gap-2 text-xs">
						<span
							class="block h-1.5 w-22 shrink-0 overflow-hidden rounded-full bg-white/10">
							<span
								class="block h-full bg-prunplanner"
								:style="{ width: `${c.percentage}%` }"></span>
						</span>
						<span class="text-white">
							{{ formatPercent(c.percentage, 0) }}
						</span>
					</span>
					<span
						class="row-start-1 col-start-2 md:row-start-auto md:col-start-auto font-mono text-sm">
						{{
							$t("plan.tools.plan_starter.typical_amount", {
								amount: c.amount,
							})
						}}
					</span>
					<span
						class="pl-6 md:pl-0 col-span-2 md:col-span-1 flex flex-wrap items-center gap-1.5">
						<MaterialTile
							v-for="ticker in c.outputs"
							:key="`STARTER#${c.ticker}#${ticker}`"
							:ticker="ticker"
							disable-drawer
							:enable-popover="false" />
						<span
							v-if="c.outputs.length === 0"
							class="text-xs text-muted">
							{{ $t("plan.tools.plan_starter.no_recipe") }}
						</span>
					</span>
				</div>
			</div>

			<div v-if="expertSplit.length" class="flex flex-col gap-1.5 px-2.5">
				<div class="text-xs font-bold uppercase text-muted">
					{{ $t("plan.tools.plan_starter.experts") }}
				</div>
				<div
					class="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
					<div
						v-for="(item, index) in expertSplit"
						:key="`STARTER#EXPERT#BAR#${item.type}`"
						class="h-full"
						:class="segmentColor(index)"
						:style="{ width: `${item.width}%` }"></div>
				</div>
				<ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
					<li
						v-for="(item, index) in expertSplit"
						:key="`STARTER#EXPERT#${item.type}`"
						class="flex items-center gap-1.5">
						<span
							:class="['h-2 w-2 rounded-full', segmentColor(index)]"
							aria-hidden="true"></span>
						{{
							$t("plan.tools.plan_starter.expert_share", {
								expert: $t(
									`game.expertise.${item.type.toUpperCase()}`
								),
								percent: formatPercent(item.percentage, 0),
							})
						}}
						<strong v-if="item.added" class="text-white">
							{{
								$t("plan.tools.plan_starter.expert_added", {
									amount: item.added,
								})
							}}
						</strong>
					</li>
				</ul>
			</div>

			<div
				class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 pt-4">
				<div class="flex flex-col gap-1 text-xs text-muted">
					<p>{{ $t("plan.tools.plan_starter.based_on") }}</p>
					<i18n-t keypath="plan.tools.plan_starter.turn_off" tag="p">
						<template #link>
							<router-link
								:to="{ name: 'profile' }"
								class="text-link-primary hover:underline">
								{{ $t("plan.tools.plan_starter.turn_off_link") }}
							</router-link>
						</template>
					</i18n-t>
				</div>
				<div class="flex gap-2 shrink-0">
					<PButton type="secondary" @click="emit('dismiss')">
						{{ $t("plan.tools.plan_starter.start_empty") }}
					</PButton>
					<PButton :disabled="checked.size === 0" @click="apply">
						{{
							$t("plan.tools.plan_starter.apply", {
								count: checked.size,
							})
						}}
					</PButton>
				</div>
			</div>
		</div>
	</div>
</template>
