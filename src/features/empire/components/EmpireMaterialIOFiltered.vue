<script setup lang="ts">
	import { computed, ref, type Ref, useTemplateRef, watch } from "vue";

	// Components
	import EmpireMaterialIOFilters from "@/features/empire/components/EmpireMaterialIOFilters.vue";
	import EmpireMaterialIO from "@/features/empire/components/EmpireMaterialIO.vue";
	import EmpireAnalysis from "@/features/empire/components/EmpireAnalysis.vue";
	import EmpireOpportunities from "@/features/empire/components/EmpireOpportunities.vue";

	import MarketFlagIcon from "@/features/cx/components/MarketFlagIcon.vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { getPlanetName } = usePlanetData();
	import { useExchangeData } from "@/database/services/useExchangeData";
	const { getExchangeTickerLoaded } = useExchangeData();
	import { usePlanContext } from "@/features/planning/usePlanContext";
	const { createPrices } = usePlanContext();
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { inertClone } from "@/util/data";
	import { countLevels, marketCheck } from "@/features/cx/marketCheck.util";

	// UI
	import { PButton } from "@/ui";

	// Types & Interfaces
	import type {
		IEmpireMaterialIO,
		IEmpirePlanListData,
	} from "@/features/empire/empire.types";
	import type {
		IMarketCheck,
		MarketFlagLevel,
	} from "@/features/cx/marketCheck.types";
	import type { PSelectOption } from "@/ui/ui.types";
	import { WORKFORCE_CONSUMPTION_MAP } from "@/features/planning/calculations/workforceCalculations";

	const props = defineProps<{
		content: "materialio" | "analysis" | "opportunities";
		empireMaterialIO: IEmpireMaterialIO[];
		planListData: IEmpirePlanListData[];
		cxUuid?: string;
	}>();

	const emit = defineEmits<{
		"update:content": ["materialio" | "analysis" | "opportunities"];
	}>();

	const workforceMaterial: string[] = [
		...new Set(
			Object.values(WORKFORCE_CONSUMPTION_MAP)
				.flat()
				.map((wm) => wm.ticker)
		),
	];

	// Local State
	const filteredMaterialIO: Ref<IEmpireMaterialIO[]> = ref([]);
	const refMaterialSelectOptions: Ref<PSelectOption[]> = ref([]);
	const refFilterMaterials: Ref<string[]> = ref([]);
	const refPlanetSelectOptions: Ref<PSelectOption[]> = ref([]);
	const refFilterPlanets: Ref<string[]> = ref([]);
	const refFilterLoadbalance: Ref<boolean> = ref(false);
	const refFilterHideConsumables: Ref<boolean> = ref(false);
	const refExpandAll: Ref<boolean> = ref(false);
	const refMaterialIO =
		useTemplateRef<InstanceType<typeof EmpireMaterialIO>>("materialIO");

	/*
	 * Market check on the empire's net flow: one book for the empire's CX
	 * without a planet, so what plans make and use themselves nets out
	 */
	const marketChecks = computed(
		() =>
			new Map(
				marketCheck(
					props.empireMaterialIO,
					createPrices("", props.cxUuid),
					getExchangeTickerLoaded
				).map((c) => [c.ticker, c])
			)
	);
	const marketCounts = computed(() =>
		countLevels([...marketChecks.value.values()])
	);
	const LEVELS: MarketFlagLevel[] = ["red", "amber", "muted"];
	const refMarketFilter: Ref<MarketFlagLevel | null> = ref(null);
	const marketExchanges = computed(() => [
		...new Set(
			[...marketChecks.value.values()]
				.map((c) => c.exchange)
				.filter((e) => e !== "UNIVERSE")
		),
	]);

	function toggleMarketFilter(level: MarketFlagLevel): void {
		refMarketFilter.value = refMarketFilter.value === level ? null : level;
		trackEvent("empire:market_filter", { level: refMarketFilter.value });
		applyFilter();
	}

	// each plan's own share, on the side of the empire's net flow
	function planShares(
		row: IEmpireMaterialIO,
		check: IMarketCheck
	): { name: string; sharePct: number | null }[] {
		const daily = check.traded30d / 30;
		const seen = new Set<string>();
		return [...row.outputPlanets, ...row.inputPlanets]
			.filter((p) => {
				if (seen.has(p.planUuid) || p.delta * row.delta <= 0)
					return false;
				seen.add(p.planUuid);
				return true;
			})
			.map((p) => ({
				name: p.planName ?? p.planetId,
				sharePct: daily > 0 ? (Math.abs(p.delta) / daily) * 100 : null,
			}));
	}
	const marketPlanShares = computed(
		() =>
			new Map(
				props.empireMaterialIO
					.filter((r) => marketChecks.value.get(r.ticker)?.level)
					.map((r) => [
						r.ticker,
						planShares(r, marketChecks.value.get(r.ticker)!),
					])
			)
	);

	// Prop Watcher
	watch(
		() => props.empireMaterialIO,
		() => {
			createFilter();
			applyFilter();
		},
		{ immediate: true }
	);

	/**
	 * Creates filter options based on material i/o data
	 * @author jplacht
	 *
	 * @returns {void}
	 */
	async function createFilter(): Promise<void> {
		refMaterialSelectOptions.value = props.empireMaterialIO.map(
			(m) => {
				return {
					label: m.ticker,
					value: m.ticker,
				};
			}
		);

		let availPlanetIds: string[] = [];

		props.empireMaterialIO.map((p) => {
			availPlanetIds = availPlanetIds.concat(
				p.inputPlanets
					.flat()
					.filter((v) => v)
					.map((pm) => pm.planetId),
				p.outputPlanets
					.flat()
					.filter((v) => v)
					.map((pm) => pm.planetId)
			);
		});

		refPlanetSelectOptions.value = await Promise.all(
			[...new Set(availPlanetIds)].map(async (o) => {
				return {
					label: await getPlanetName(o),
					value: o,
				};
			})
		);
	}

	/**
	 * Opens Material I/O filtered to one material, e.g. from Analysis
	 * @author jplacht
	 *
	 * @param {string} ticker Material ticker
	 */
	function openMaterial(ticker: string): void {
		refFilterMaterials.value = [ticker];
		applyFilter();
		emit("update:content", "materialio");
	}

	/**
	 * Applies filter set by user to data
	 * @author jplacht
	 *
	 * @returns {void}
	 */
	function applyFilter(): void {
		filteredMaterialIO.value = inertClone(props.empireMaterialIO);

		// material
		if (refFilterMaterials.value.length > 0) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter((m) =>
				refFilterMaterials.value.includes(m.ticker)
			);
		}

		// planets
		if (refFilterPlanets.value.length > 0) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter((p) => {
				const inputFlat = p.inputPlanets.flat().map((i) => i.planetId);
				const outputFlat = p.outputPlanets
					.flat()
					.map((o) => o.planetId);

				return (
					inputFlat.some((r) =>
						refFilterPlanets.value.flat().includes(r)
					) ||
					outputFlat.some((r) =>
						refFilterPlanets.value.flat().includes(r)
					)
				);
			});
		}

		// loadbalance
		if (refFilterLoadbalance.value) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter(
				(lb) => lb.input != 0 && lb.output != 0
			);
		}

		// market flag
		if (refMarketFilter.value) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter(
				(m) => marketChecks.value.get(m.ticker)?.level === refMarketFilter.value
			);
		}

		// consumables
		if (refFilterHideConsumables.value) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter(
				(m) => !workforceMaterial.includes(m.ticker)
			);
		}
	}
</script>

<template>
	<div
		class="flex flex-col flex-1"
		:class="content === 'materialio' ? 'min-h-0' : ''">
		<div
			v-if="content != 'opportunities'"
			class="border rounded-[3px] border-b-0 border-white/15 p-3">
			<EmpireMaterialIOFilters
				v-model:load-balance="refFilterLoadbalance"
				v-model:hide-consumables="refFilterHideConsumables"
				v-model:expand-all="refExpandAll"
				v-model:filter-materials="refFilterMaterials"
				v-model:filter-planets="refFilterPlanets"
				:show-expand-all="content === 'materialio'"
				:material-options="refMaterialSelectOptions"
				:planet-options="refPlanetSelectOptions"
				@collapse-all="refMaterialIO?.collapseAll()"
				@apply-filter="applyFilter" />
			<div
				v-if="content === 'materialio'"
				class="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 mt-3 border-t border-white/10 text-sm"
				data-market-chips>
				<span class="text-white">
					{{ t("cx.market_flags.empire.title") }}
				</span>
				<div
					role="group"
					class="flex flex-wrap gap-2"
					:aria-label="t('cx.market_flags.empire.filter_label')">
					<template v-for="level in LEVELS" :key="level">
						<PButton
							v-if="marketCounts[level]"
							size="sm"
							class="min-h-11 sm:min-h-0"
							:pressed="refMarketFilter === level"
							:data-level="level"
							@click="toggleMarketFilter(level)">
							<span class="inline-flex items-center gap-1.5">
								<MarketFlagIcon :level="level" />
								{{
									t(
										`cx.market_flags.empire.chip.${level}`,
										{ n: marketCounts[level] },
										marketCounts[level]
									)
								}}
							</span>
						</PButton>
					</template>
				</div>
				<span class="text-xs text-muted-strong sm:ml-auto">
					<template v-if="cxUuid">
						{{
							marketExchanges.length
								? t(
										marketExchanges.length > 1
											? "cx.market_flags.exchange.many"
											: "cx.market_flags.exchange.one",
										{ exchange: marketExchanges.join(", ") }
									)
								: t("cx.market_flags.exchange.all")
						}}
						· {{ t("cx.market_flags.exchange.from_empire") }}
					</template>
					<template v-else>
						{{ t("cx.market_flags.exchange.all") }} ·
						{{ t("cx.market_flags.exchange.no_cx") }}
					</template>
				</span>
				<p class="basis-full text-xs text-muted">
					{{ t("cx.market_flags.empire.net_note") }}
				</p>
			</div>
		</div>
		<EmpireMaterialIO
			v-if="content === 'materialio'"
			ref="materialIO"
			v-model:expand-all="refExpandAll"
			:empire-material-i-o="filteredMaterialIO"
			:checks="marketChecks"
			:plan-shares="marketPlanShares" />
		<EmpireAnalysis
			v-else-if="content === 'analysis'"
			:empire-material-i-o="filteredMaterialIO"
			:plan-list-data="planListData"
			@open:material="openMaterial" />
		<EmpireOpportunities
			v-else-if="content === 'opportunities'"
			:empire-material-i-o="empireMaterialIO"
			:cx-uuid="cxUuid" />
	</div>
</template>
