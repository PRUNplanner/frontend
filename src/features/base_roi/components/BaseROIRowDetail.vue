<script setup lang="ts">
	import { computed, onMounted, ref, shallowRef } from "vue";
	import { useRouter } from "vue-router";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useBuildingData } from "@/database/services/useBuildingData";
	import { useCXData } from "@/features/cx/useCXData";

	// Engine
	import { calculateBuildingFactionBonus } from "@/features/planning/engine/efficiency";

	// Util
	import { copyToClipboard } from "@/util/data";
	import { formatNumber } from "@/util/numbers";
	import {
		detailSections,
		detailText,
	} from "@/features/base_roi/baseROIDetail.util";
	import {
		hasHistory,
		profitHistory,
	} from "@/features/base_roi/baseROIHistory";
	import { basePlan } from "@/features/base_roi/baseROIRows";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Static
	import { STANDARD_PLAN_PLANET } from "@/features/base_roi/baseROI.constants";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PLineChart from "@/ui/charts/PLineChart.vue";
	import PLayerClose from "@/ui/components/PLayerClose.vue";

	// Types & Interfaces
	import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
	import type {
		IBaseROIRow,
		IBaseROISeries,
	} from "@/features/base_roi/baseROI.types";
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import type { PSelectOption } from "@/ui/ui.types";
	import type { ILineSeries } from "@/ui/charts/charts.types";

	// UI
	import { PButton, PSelect, useToast } from "@/ui";

	const { row, settings, series, tryOnPlanet, cxUuid } = defineProps<{
		row: IBaseROIRow;
		settings: BaseROISettings;
		series: IBaseROISeries | null;
		tryOnPlanet: (row: IBaseROIRow, planet: string) => Promise<IBaseROIRow>;
		/** the CX preference the table prices with */
		cxUuid: string | undefined;
	}>();
	const emit = defineEmits<{ (e: "close"): void }>();

	const router = useRouter();
	const planningStore = usePlanningStore();
	const { getBuilding } = useBuildingData();
	const { findEmpireCXUuid } = useCXData();
	const toast = useToast();
	const theme = useChartTheme();

	/*
	 * Try on a planet (recipe rows): one planet, one engine pass, this
	 * detail only; forgotten when it closes
	 */
	const tried = shallowRef<IBaseROIRow | null>(null);
	const planet = ref<string | undefined>(undefined);
	const loadingPlanet = ref(false);
	const index = shallowRef<PlanetSearchIndexEntry[]>([]);

	// the table loaded the index already: from the query cache
	onMounted(async () => {
		if (row.kind === "recipe")
			index.value = await useQuery("GetPlanetSearchIndex").execute();
	});
	const planetOptions = computed<PSelectOption[]>(() =>
		index.value.map((p) => ({
			label:
				p.planet_name === p.planet_natural_id
					? p.planet_natural_id
					: `${p.planet_name} (${p.planet_natural_id})`,
			value: p.planet_natural_id,
		}))
	);

	async function pickPlanet(id: string | undefined): Promise<void> {
		planet.value = id;
		if (!id) {
			tried.value = null;
			return;
		}
		loadingPlanet.value = true;
		try {
			tried.value = await tryOnPlanet(row, id);
		} catch {
			toast(t("base_roi.detail.planet_failed"), { type: "error" });
			planet.value = undefined;
			tried.value = null;
		} finally {
			loadingPlanet.value = false;
		}
	}

	const shown = computed(() => tried.value ?? row);
	const sections = computed(() =>
		detailSections(shown.value, settings, t)
	);
	const name = computed(
		() =>
			`${shown.value.outputs.map((o) => o.ticker).join(", ")} · ${shown.value.building}`
	);

	const days = (n: number) =>
		Number.isFinite(n) ? formatNumber(n, 1) : t("base_roi.table.never");
	const compare = computed(() =>
		tried.value
			? t("base_roi.detail.compare", {
					planet: tried.value.planetName ?? tried.value.planetNaturalId,
					cost: formatNumber(
						tried.value.metrics.buildingCost - row.metrics.buildingCost,
						0,
						false,
						true
					),
					from: days(row.metrics.breakEven),
					to: days(tried.value.metrics.breakEven),
				})
			: ""
	);

	async function copy(): Promise<void> {
		if (!(await copyToClipboard(detailText(name.value, sections.value))))
			return;
		toast(t("base_roi.detail.copied"));
	}

	/**
	 * A plan runs in an empire: its CX preference and faction bonus. An
	 * empire with the table's CX and no faction bonus for this building
	 * gives the same daily profit; undefined without one.
	 */
	async function matchingEmpire(): Promise<string | undefined> {
		const building = await getBuilding(shown.value.building);
		return Object.values(planningStore.empires).find(
			(e) =>
				findEmpireCXUuid(e.uuid) === cxUuid &&
				!calculateBuildingFactionBonus(building, e)
		)?.uuid;
	}

	const creating = ref(false);
	async function openAsPlan(): Promise<void> {
		const r = shown.value;
		const plan = basePlan(r, r.productionBuildings, r.infrastructure, settings);
		const planetId = r.planetNaturalId ?? STANDARD_PLAN_PLANET;
		creating.value = true;
		try {
			const empireUuid = await matchingEmpire();
			const created = await useQuery("CreatePlan", {
				data: {
					...plan,
					plan_name: t("base_roi.detail.plan_name", { name: name.value }),
					planet_natural_id: planetId,
					empire_uuid: empireUuid,
				},
			}).execute();
			if (!empireUuid)
				toast(t("base_roi.detail.plan_other_empire"), {
					type: "info",
					duration: 10_000,
				});
			await router.push(`/plan/${planetId}/${created.uuid}`);
		} catch {
			toast(t("base_roi.detail.plan_failed"), { type: "error" });
		} finally {
			creating.value = false;
		}
	}

	/*
	 * Section 9: revenue, running cost and profit of the last 30 days
	 */
	const history = computed(() =>
		series
			? profitHistory(shown.value.materials, shown.value.degradation, series)
			: null
	);
	const historyDays = computed(() => {
		const today = new Date();
		const midnight = Date.UTC(
			today.getUTCFullYear(),
			today.getUTCMonth(),
			today.getUTCDate()
		);
		return Array.from(
			{ length: 30 },
			(_, i) => midnight - (29 - i) * 86_400_000
		);
	});
	const chartSeries = computed<ILineSeries[]>(() =>
		history.value
			? [
					{
						key: "revenue",
						label: t("base_roi.detail.history_revenue"),
						color: theme.value.exchange("AI1"),
						values: history.value.revenue,
					},
					{
						key: "cost",
						label: t("base_roi.detail.history_cost"),
						color: theme.value.negative,
						values: history.value.cost,
					},
					{
						key: "profit",
						label: t("base_roi.detail.history_profit"),
						color: theme.value.positive,
						values: history.value.profit,
					},
				]
			: []
	);
</script>

<template>
	<div class="flex flex-col gap-3 py-2" data-base-roi-detail>
		<div class="flex flex-row flex-wrap items-center gap-x-3 gap-y-2">
			<div class="flex flex-row items-center gap-2">
				<MaterialTile
					v-for="o in shown.outputs.slice(0, 3)"
					:key="o.ticker"
					:ticker="o.ticker" />
				<h3 class="font-bold text-base">{{ shown.building }}</h3>
			</div>
			<div class="flex flex-row flex-wrap items-center gap-2 ml-auto">
				<template v-if="row.kind === 'recipe'">
					<span class="text-muted">{{ t("base_roi.detail.try_planet") }}</span>
					<PSelect
						class="w-60"
						:value="planet"
						:options="planetOptions"
						:placeholder="t('base_roi.detail.standard_planet')"
						:aria-label="t('base_roi.detail.try_planet')"
						:disabled="loadingPlanet"
						searchable
						@update:value="(v) => pickPlanet(v as string | undefined)" />
					<PButton
						v-if="tried"
						size="sm"
						type="secondary"
						@click="pickPlanet(undefined)">
						{{ t("base_roi.detail.back_standard") }}
					</PButton>
				</template>
				<PButton size="sm" type="secondary" @click="copy">
					{{ t("base_roi.detail.copy") }}
				</PButton>
				<PButton size="sm" type="secondary" :loading="creating" @click="openAsPlan">
					{{ t("base_roi.detail.open_plan") }}
				</PButton>
				<PLayerClose :aria-label="t('base_roi.detail.close')" @click="emit('close')" />
			</div>
		</div>
		<p v-if="loadingPlanet" class="text-sm text-muted" aria-live="polite">
			{{ t("base_roi.detail.loading_planet") }}
		</p>
		<p v-else-if="compare" class="text-sm font-bold" aria-live="polite">
			{{ compare }}
		</p>

		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			<section
				v-for="s in sections"
				:key="s.id"
				class="rounded-md border border-white/10 p-3 min-w-0"
				:aria-labelledby="`base-roi-${row.key}-s${s.id}`">
				<h4
					:id="`base-roi-${row.key}-s${s.id}`"
					class="mb-2 text-xs font-bold uppercase">
					<span class="text-muted">{{ s.id }}</span> {{ s.title }}
				</h4>
				<dl class="flex flex-col gap-1 text-sm">
					<div
						v-for="(l, i) in s.lines"
						:key="i"
						class="flex flex-col"
						:class="l.total ? 'border-t border-white/10 pt-1 font-bold' : ''">
						<div class="flex flex-row justify-between gap-3">
							<!-- the label keeps its width, a long value wraps -->
							<dt class="flex flex-row items-center gap-1.5 shrink-0 max-w-[60%]">
								<MaterialTile v-if="l.ticker" :ticker="l.ticker" />
								<span v-else>{{ l.label }}</span>
							</dt>
							<dd class="font-mono text-right min-w-0 [overflow-wrap:anywhere]">{{ l.value }}</dd>
						</div>
						<span v-if="l.formula" class="font-mono text-xs text-muted font-normal">
							{{ l.formula }}
						</span>
					</div>
				</dl>
				<template v-if="s.id === 9">
					<div v-if="history" class="mt-2 h-40">
						<PLineChart
							:days="historyDays"
							:series="chartSeries"
							:label="t('base_roi.detail.history_note')" />
					</div>
					<p class="mt-1 text-xs text-muted">
						{{
							series && !hasHistory(shown.materials, series)
								? t("base_roi.table.history_none")
								: t("base_roi.detail.history_note")
						}}
					</p>
				</template>
				<router-link
					v-if="s.id === 10 && shown.planetNaturalId"
					:to="`/plan/${shown.planetNaturalId}`"
					class="mt-2 inline-block text-link-primary hover:underline">
					{{ t("base_roi.detail.open_planet", { planet: shown.planetName ?? shown.planetNaturalId }) }}
				</router-link>
			</section>
		</div>
	</div>
</template>
