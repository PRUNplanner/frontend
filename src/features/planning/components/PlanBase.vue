<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

	// Util
	import { cogcTextMapping } from "@/features/planning_data/usePlan";
	import { cogcShare } from "@/features/planning/planView.util";
	import { formatNumber, formatPercent } from "@/util/numbers";

	// Types & Interfaces
	import type {
		ExpertType,
		InfrastructureType,
		PlanCOGCProgram,
		PlanEmpire,
		WorkforceType,
	} from "@/features/api/schemas/planningData.schemas";
	import type {
		Planet,
		PlanetResourceType,
	} from "@/features/api/schemas/gameData.schemas";
	import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
	import type { HabSolverGoal } from "@/features/planning/calculations/habOptimization";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
	import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
	import PlanArea from "@/features/planning/components/PlanArea.vue";
	import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
	import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
	import PlanExperts from "@/features/planning/components/PlanExperts.vue";

	// UI
	import { PTooltip } from "@/ui";

	/**
	 * Base setup in one pane: empire and prices, planet, workforce,
	 * housing and experts, each a foldable section with a summary line
	 *
	 * @author jplacht
	 */
	const props = defineProps<{
		disabled: boolean;
		result: IPlanResult;
		planet: Planet;
		autoOptimizeHabs: boolean;
		empireOptions?: PlanEmpire[];
		activeEmpire?: PlanEmpire;
		planEmpires: PlanEmpire[];
		cxUuid?: string;
		// a visitor without empires: where the prices come from
		priceSource?: string;
	}>();

	const emit = defineEmits<{
		(e: "update:active-empire", empireUuid: string): void;
		(e: "update:permits", value: number): void;
		(e: "update:corphq", value: boolean): void;
		(e: "update:cogc", value: PlanCOGCProgram): void;
		(
			e: "update:lux",
			workforce: WorkforceType,
			luxType: "lux1" | "lux2",
			value: boolean
		): void;
		(
			e: "update:infrastructure",
			infrastructure: InfrastructureType,
			value: number
		): void;
		(
			e: "update:auto-optimize-habs",
			value: boolean,
			goal: HabSolverGoal
		): void;
		(e: "optimize-habs", goal: HabSolverGoal): void;
		(e: "update:expert", expert: ExpertType, value: number): void;
		(e: "create:building:recipe", ticker: string, recipeId: string): void;
		(e: "open:insights"): void;
	}>();

	const planningStore = usePlanningStore();
	const { isAvailable: hasInsights, totalPlans } = usePlanetInsights(
		() => props.planet.planet_natural_id
	);

	const cogcLabel = computed(() => t(cogcTextMapping[props.result.cogc]));

	const expertTotal = computed(() =>
		Object.values(props.result.experts).reduce((s, e) => s + e.amount, 0)
	);

	const cogcHint = computed(() => {
		if (props.result.cogc === "---") return undefined;
		const { tickers, share } = cogcShare(props.result.production.buildings);
		if (tickers.length === 0) return t("plan.base.planet.cogc_none");
		return t("plan.base.planet.cogc_boosts", {
			buildings: tickers.join(", "),
			share: formatPercent(share * 100, 0),
		});
	});

	const summary = computed(() => {
		const r = props.result;
		const cxName = props.cxUuid
			? planningStore.cxs[props.cxUuid]?.cx_name
			: undefined;
		const used = Object.values(r.workforce).filter(
			(w) => w.required > 0 || w.capacity > 0
		);
		const housing = (
			Object.entries(r.infrastructure) as [InfrastructureType, number][]
		)
			.filter(([, n]) => n > 0)
			.map(([inf, n]) => `${n} ${inf}`);
		return {
			empire: [props.activeEmpire?.empire_name, cxName ?? props.priceSource]
				.filter(Boolean)
				.join(" · "),
			planet: t(
				"plan.base.planet.summary",
				{ cogc: cogcLabel.value, n: r.area.permits },
				r.area.permits
			),
			workforce: used.length
				? t("plan.base.workforce.summary", {
						eff: formatNumber(
							Math.min(...used.map((w) => w.efficiency)) * 100,
							1
						),
					})
				: "",
			housing: [
				...housing,
				...(props.autoOptimizeHabs ? [t("plan.base.housing.auto")] : []),
			].join(" · "),
			experts: t("plan.base.experts.summary", { n: expertTotal.value }),
		};
	});

	const extractor = (type: PlanetResourceType): string =>
		type === "MINERAL" ? "EXT" : type === "GASEOUS" ? "COL" : "RIG";

	const productionBuildings = computed(() =>
		props.result.production.buildings.map((b) => ({
			name: b.name,
			expertise: b.expertise,
		}))
	);

	const section = "border-t border-line first:border-t-0";
	const head =
		"flex items-center gap-2 h-10 pointer-coarse:h-11 px-3 cursor-pointer list-none hover:bg-hover [&::-webkit-details-marker]:hidden";
	const body = "px-3 pb-3";
</script>

<template>
	<div class="text-sm">
		<details :class="section">
			<summary :class="head">
				<span class="flex-1 font-medium text-ink-strong">
					{{ t("plan.base.empire.label") }}
				</span>
				<span class="text-xs text-muted truncate">
					{{ summary.empire }}
				</span>
			</summary>
			<div :class="body">
				<PlanConfiguration
					:disabled="disabled"
					:empire-options="empireOptions"
					:active-empire="activeEmpire"
					:plan-empires="planEmpires"
					:cx-uuid="cxUuid"
					:planet-id="planet.planet_natural_id"
					:price-source="priceSource"
					@update:active-empire="
						(uuid: string) => emit('update:active-empire', uuid)
					" />
			</div>
		</details>

		<details :class="section" open>
			<summary :class="head">
				<span class="flex-1 font-medium text-ink-strong">
					{{ t("plan.base.planet.label") }}
				</span>
				<span class="text-xs text-muted truncate tabular-nums">
					{{ summary.planet }}
				</span>
			</summary>
			<div :class="body" class="flex flex-col gap-3">
				<PlanBonuses
					:disabled="disabled"
					:corphq="result.corphq"
					:cogc="result.cogc"
					:cogc-hint="cogcHint"
					:planet-natural-id="planet.planet_natural_id"
					@update:corphq="(v: boolean) => emit('update:corphq', v)"
					@update:cogc="(v: PlanCOGCProgram) => emit('update:cogc', v)" />
				<PlanArea
					:disabled="disabled"
					:area-data="result.area"
					:planet-natural-id="planet.planet_natural_id"
					@update:permits="(v: number) => emit('update:permits', v)" />
				<div
					v-if="planet.resources.length"
					class="flex flex-wrap items-center gap-1 text-xs text-muted-strong">
					<span class="pr-1">
						{{ t("plan.base.planet.resources") }}
					</span>
					<PTooltip
						v-for="resource in planet.resources"
						:key="`PLANET#RESOURCE#${resource.material_ticker}`">
						<template #trigger>
							<button
								type="button"
								class="inline-flex min-h-6 pointer-coarse:min-h-11 items-center cursor-pointer disabled:cursor-default"
								:disabled="disabled"
								:aria-label="
									t('plan.base.planet.add_extractor', {
										building: extractor(resource.resource_type),
										ticker: resource.material_ticker,
									})
								"
								@click="
									emit(
										'create:building:recipe',
										extractor(resource.resource_type),
										`${extractor(resource.resource_type)}#${resource.material_ticker}`
									)
								">
								<MaterialTile
									:key="resource.material_ticker"
									:ticker="resource.material_ticker"
									:amount="
										parseFloat(
											formatNumber(resource.daily_extraction)
										)
									"
									disable-drawer
									:enable-popover="false" />
							</button>
						</template>
						{{
							t("plan.base.planet.add_extractor", {
								building: extractor(resource.resource_type),
								ticker: resource.material_ticker,
							})
						}}
					</PTooltip>
				</div>
				<button
					v-if="hasInsights"
					type="button"
					class="self-start min-h-6 pointer-coarse:min-h-11 text-xs text-link hover:underline cursor-pointer text-left"
					@click="emit('open:insights')">
					{{
						t("plan.base.planet.insights", {
							n: totalPlans,
							planet: planet.planet_natural_id,
						})
					}}
				</button>
			</div>
		</details>

		<details :class="section" open>
			<summary :class="head">
				<span class="flex-1 font-medium text-ink-strong">
					{{ t("plan.base.workforce.label") }}
				</span>
				<span class="text-xs text-muted truncate tabular-nums">
					{{ summary.workforce }}
				</span>
			</summary>
			<div :class="body">
				<PlanWorkforce
					:disabled="disabled"
					:workforce-data="result.workforce"
					:planet-natural-id="planet.planet_natural_id"
					@update:lux="
						(w: WorkforceType, l: 'lux1' | 'lux2', v: boolean) =>
							emit('update:lux', w, l, v)
					" />
			</div>
		</details>

		<details :class="section">
			<summary :class="head">
				<span class="flex-1 font-medium text-ink-strong">
					{{ t("plan.base.housing.label") }}
				</span>
				<span class="text-xs text-muted truncate tabular-nums">
					{{ summary.housing }}
				</span>
			</summary>
			<div :class="body">
				<PlanInfrastructure
					:disabled="disabled"
					:infrastructure-data="result.infrastructure"
					:auto-optimize-habs="autoOptimizeHabs"
					:planet-natural-id="planet.planet_natural_id"
					@update:infrastructure="
						(i: InfrastructureType, v: number) =>
							emit('update:infrastructure', i, v)
					"
					@update:auto-optimize-habs="
						(v: boolean, g: HabSolverGoal) =>
							emit('update:auto-optimize-habs', v, g)
					"
					@optimize-habs="(g: HabSolverGoal) => emit('optimize-habs', g)" />
			</div>
		</details>

		<details :class="section" open>
			<summary :class="head">
				<span class="flex-1 font-medium text-ink-strong">
					{{ t("plan.base.experts.label") }}
				</span>
				<span class="text-xs text-muted truncate tabular-nums">
					{{ summary.experts }}
				</span>
			</summary>
			<div :class="body">
				<PlanExperts
					:disabled="disabled"
					:expert-data="result.experts"
					:buildings="productionBuildings"
					:planet-natural-id="planet.planet_natural_id"
					@update:expert="
						(e: ExpertType, v: number) => emit('update:expert', e, v)
					" />
			</div>
		</details>
	</div>
</template>
