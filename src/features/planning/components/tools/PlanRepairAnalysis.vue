<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		type PropType,
		ref,
		type Ref,
		toRef,
		watch,
	} from "vue";
	import { debounce, type DebouncedFunc } from "lodash-es";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	import { useUserStore } from "@/stores/userStore";

	// Composables
	import { useRepairAnalysis } from "@/features/repair_analysis/useRepairAnalysis";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import RepairBuildingDetail from "@/features/repair_analysis/components/RepairBuildingDetail.vue";
	import RepairBuildingList from "@/features/repair_analysis/components/RepairBuildingList.vue";
	import RepairDueTag from "@/features/repair_analysis/components/RepairDueTag.vue";
	import RepairFIOBuildings from "@/features/repair_analysis/components/RepairFIOBuildings.vue";
	import RepairMaterialList from "@/features/repair_analysis/components/RepairMaterialList.vue";

	// Util
	import {
		dueInDays,
		REPAIR_DAY_MAX,
	} from "@/features/repair_analysis/repairAnalysis.util";
	import { isInfrastructureBuilding } from "@/features/fio_repair/fioRepair.util";
	import { relativeFromDate } from "@/util/date";
	import { clamp, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IPlanRepairAnalysisDataProp } from "@/features/planning/components/tools/planRepairAnalysis.types";
	import type { IRepairFIOBuilding } from "@/features/repair_analysis/useRepairAnalysis.types";

	// UI
	import { PIcon, PNotice, PTooltip } from "@/ui";
	import { InfoOutlined } from "@vicons/material";

	const props = defineProps({
		data: {
			type: Array as PropType<IPlanRepairAnalysisDataProp[]>,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planetNaturalId: {
			type: String,
			required: false,
			default: undefined,
		},
		// a shared plan: the store's FIO data is the viewer's, not the owner's
		shared: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const DAY_MS = 86_400_000;

	const { buildings, materialsFor, materialsForAll } = useRepairAnalysis(
		toRef(props, "data"),
		toRef(props, "cxUuid"),
		toRef(props, "planetNaturalId")
	);

	/*
	 * Intervals: each type starts at its best day; overrides live only
	 * while the tool is open
	 */
	const overrides: Ref<Record<string, number>> = ref({});
	watch(buildings, (list) => {
		const known = new Set(list.map((b) => b.ticker));
		for (const ticker of Object.keys(overrides.value))
			if (!known.has(ticker)) delete overrides.value[ticker];
	});

	const intervals = computed<Record<string, number>>(() =>
		Object.fromEntries(
			buildings.value.map((b) => [
				b.ticker,
				overrides.value[b.ticker] ?? b.best,
			])
		)
	);

	type IntervalSource = "input" | "slider" | "preset" | "reset";
	// a burst of slider steps or +/- clicks is one event per type
	const intervalEvents = new Map<
		string,
		DebouncedFunc<(source: IntervalSource, in_range: boolean) => void>
	>();
	function trackInterval(
		source: IntervalSource,
		ticker: string,
		in_range: boolean
	): void {
		let send = intervalEvents.get(ticker);
		if (!send) {
			send = debounce(
				(s: IntervalSource, r: boolean) =>
					trackEvent("repair_analysis:interval_set", {
						source: s,
						ticker,
						in_range: r,
					}),
				1000
			);
			intervalEvents.set(ticker, send);
		}
		send(source, in_range);
	}
	onBeforeUnmount(() => intervalEvents.forEach((send) => send.flush()));

	function setInterval(
		ticker: string,
		value: number,
		source: IntervalSource
	): void {
		const building = buildings.value.find((b) => b.ticker === ticker);
		if (!building) return;
		const day = clamp(Math.round(value), 1, REPAIR_DAY_MAX);
		overrides.value[ticker] = day;
		trackInterval(
			source,
			ticker,
			day >= building.range[0] && day <= building.range[1]
		);
	}

	function resetAll(): void {
		overrides.value = {};
		trackInterval("reset", "all", true);
	}

	/*
	 * Selection; on phones the list opens the detail as its own view
	 */
	const selected: Ref<string | undefined> = ref(undefined);
	const selectedBuilding = computed(
		() =>
			buildings.value.find((b) => b.ticker === selected.value) ??
			buildings.value[0]
	);

	const phoneQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(max-width: 767px)")
			: null;
	const isPhone: Ref<boolean> = ref(phoneQuery?.matches ?? false);
	const phoneDetail: Ref<boolean> = ref(false);
	const onMedia = (e: MediaQueryListEvent) => {
		isPhone.value = e.matches;
		// wider screens show list and detail together
		if (!e.matches) phoneDetail.value = false;
	};
	phoneQuery?.addEventListener("change", onMedia);
	onBeforeUnmount(() => phoneQuery?.removeEventListener("change", onMedia));

	const root: Ref<HTMLElement | null> = ref(null);

	function select(ticker: string): void {
		selected.value = ticker;
		if (!isPhone.value) return;
		phoneDetail.value = true;
		root.value?.scrollIntoView?.({ block: "start" });
	}

	/*
	 * Materials, only for the chosen intervals
	 */
	const selectedMaterials = computed(() =>
		selectedBuilding.value
			? materialsFor(
					selectedBuilding.value,
					intervals.value[selectedBuilding.value.ticker]
				)
			: undefined
	);
	const allMaterials = computed(() =>
		materialsForAll((ticker) => intervals.value[ticker])
	);

	/*
	 * FIO: the player's buildings on this planet
	 */
	const userStore = useUserStore();
	const planningStore = usePlanningStore();

	const site = computed(() =>
		Object.values(planningStore.fio_sites_planets).find(
			(s) => s.PlanetIdentifier === props.planetNaturalId
		)
	);
	const fioState = computed<"hidden" | "none" | "no_site" | "site">(() => {
		if (props.shared) return "hidden";
		if (!userStore.hasFIO) return "none";
		return site.value ? "site" : "no_site";
	});
	const planetLabel = computed(
		() => site.value?.PlanetName || props.planetNaturalId || ""
	);

	const fioBuildings = computed<Record<string, IRepairFIOBuilding[]>>(() => {
		const result: Record<string, IRepairFIOBuilding[]> = {};
		if (fioState.value !== "site") return result;
		const now = Date.now();
		for (const b of site.value!.Buildings) {
			if (isInfrastructureBuilding(b.BuildingTicker)) continue;
			const list = (result[b.BuildingTicker] ??= []);
			list.push({
				index: list.length + 1,
				ageDays: b.BuildingLastRepair
					? Math.floor(
							(now - new Date(b.BuildingLastRepair).getTime()) /
								DAY_MS
						)
					: undefined,
				condition: b.Condition,
				repairMaterials: b.RepairMaterials.map((m) => ({
					ticker: m.MaterialTicker,
					amount: m.MaterialAmount,
				})),
			});
		}
		return result;
	});

	const ages = (ticker: string): number[] =>
		(fioBuildings.value[ticker] ?? [])
			.map((b) => b.ageDays)
			.filter((a): a is number => a !== undefined);

	// days until the first building of each type is due
	const due = computed(() => {
		if (fioState.value !== "site") return undefined;
		const result: Record<string, number | undefined> = {};
		for (const b of buildings.value) {
			const days = ages(b.ticker).map((a) =>
				dueInDays(intervals.value[b.ticker], a)
			);
			result[b.ticker] = days.length ? Math.min(...days) : undefined;
		}
		return result;
	});

	const nextDue = computed(() => {
		let next: { ticker: string; index: number; days: number } | undefined;
		for (const b of buildings.value)
			for (const f of fioBuildings.value[b.ticker] ?? []) {
				if (f.ageDays === undefined) continue;
				const days = dueInDays(intervals.value[b.ticker], f.ageDays);
				if (!next || days < next.days)
					next = { ticker: b.ticker, index: f.index, days };
			}
		return next;
	});

	const fioTimestamp = computed(() => planningStore.fio_storage_timestamp);
	const fioStale = computed(
		() =>
			!!fioTimestamp.value &&
			Date.now() - new Date(fioTimestamp.value).getTime() > DAY_MS
	);

	/*
	 * Plan stats
	 */
	const stats = computed(() => {
		let profit = 0;
		let best = 0;
		let perDay = 0;
		for (const b of buildings.value) {
			const day = intervals.value[b.ticker];
			profit += b.curve[day].profit * b.amount;
			best += b.curve[b.best].profit * b.amount;
			perDay += b.curve[day].repair * b.amount;
		}
		return { profit, delta: profit - best, perDay };
	});

	const signed = (v: number) => (v > 0 ? "+" : "") + formatNumber(v, 0);
	const hasBuildings = computed(() => props.data.some((d) => d.amount > 0));
</script>

<template>
	<div ref="root" class="@container flex flex-col gap-3.5">
		<div class="flex items-center flex-wrap gap-x-8 gap-y-2.5">
			<h2 class="text-lg font-bold text-ink-strong">
				{{ $t("plan.tools.repair_analysis.title") }}
			</h2>
			<div
				v-if="buildings.length && !phoneDetail"
				class="grid grid-cols-2 sm:flex gap-x-8 gap-y-2 max-sm:w-full max-sm:p-3 max-sm:bg-surface max-sm:border max-sm:border-line max-sm:rounded-panel"
				data-testid="repair-stats">
				<div class="flex flex-col">
					<span class="text-xs text-muted uppercase tracking-wide">
						{{ $t("plan.tools.repair_analysis.stats.profit") }}
					</span>
					<span>
						<b class="text-lg text-positive">
							{{ signed(stats.profit) }}
						</b>
						<span class="text-muted">
							{{ $t("plan.tools.repair_analysis.per_day") }}
						</span>
						<span
							class="ms-1 text-xs"
							:class="
								Math.abs(stats.delta) < 0.5
									? 'text-muted'
									: 'text-warning font-medium'
							"
							data-testid="repair-stats-delta">
							{{
								Math.abs(stats.delta) < 0.5
									? $t(
											"plan.tools.repair_analysis.stats.all_best"
										)
									: $t(
											"plan.tools.repair_analysis.stats.vs_best",
											{
												delta: signed(stats.delta),
											}
										)
							}}
						</span>
					</span>
				</div>
				<div
					v-if="fioState === 'site' && nextDue"
					class="flex flex-col"
					data-testid="repair-stats-next">
					<span class="text-xs text-muted uppercase tracking-wide">
						{{ $t("plan.tools.repair_analysis.stats.next_due") }}
					</span>
					<span class="flex items-center gap-2">
						<b class="text-lg text-ink-strong">
							{{ nextDue.ticker }} #{{ nextDue.index }}
						</b>
						<RepairDueTag :days="nextDue.days" />
					</span>
				</div>
				<div
					v-else
					class="flex flex-col"
					data-testid="repair-stats-cost">
					<span class="text-xs text-muted uppercase tracking-wide">
						{{ $t("plan.tools.repair_analysis.stats.repair_cost") }}
					</span>
					<span>
						<b class="text-lg text-ink-strong">
							{{ formatNumber(stats.perDay, 0) }}
						</b>
						<span class="text-muted">
							{{ $t("plan.tools.repair_analysis.stats.per_day") }}
						</span>
					</span>
				</div>
				<div class="flex flex-col max-sm:col-span-2">
					<span class="text-xs text-muted uppercase tracking-wide">
						{{ $t("plan.tools.repair_analysis.stats.one_repair") }}
					</span>
					<span>
						<b class="text-lg text-ink-strong">
							{{ formatNumber(allMaterials.cost, 0) }}
						</b>
						<span class="text-muted">
							ȼ · {{ formatNumber(allMaterials.weight, 1) }} t ·
							{{ formatNumber(allMaterials.volume, 1) }} m³
						</span>
					</span>
				</div>
			</div>
			<span
				v-if="fioState === 'site' || fioState === 'no_site'"
				class="flex items-center gap-1 ml-auto text-sm text-muted-strong"
				data-testid="repair-fio-note">
				{{
					$t("plan.tools.repair_analysis.fio.last_update", {
						when: relativeFromDate(fioTimestamp ?? undefined),
					})
				}}
				<PTooltip v-if="fioStale">
					<template #trigger>
						<PIcon
							:size="16"
							class="text-link"
							:aria-label="
								$t('plan.tools.repair_analysis.fio.stale')
							">
							<InfoOutlined />
						</PIcon>
					</template>
					{{ $t("plan.tools.repair_analysis.fio.stale") }}
				</PTooltip>
			</span>
		</div>

		<p v-if="!hasBuildings" class="text-muted">
			{{ $t("plan.tools.repair_analysis.empty") }}
		</p>

		<div
			v-else-if="buildings.length && selectedBuilding"
			class="grid gap-3 items-start @min-[1100px]:grid-cols-[minmax(480px,540px)_minmax(0,1fr)] @min-[1100px]:grid-rows-[auto_1fr]">
			<RepairBuildingList
				v-if="!phoneDetail"
				class="@min-[1100px]:col-start-1 @min-[1100px]:row-start-1"
				:buildings="buildings"
				:intervals="intervals"
				:selected="selectedBuilding.ticker"
				:due="due"
				:cards="isPhone"
				@select="select"
				@update:interval="(t, v) => setInterval(t, v, 'input')"
				@reset="resetAll" />

			<RepairBuildingDetail
				v-if="!isPhone || phoneDetail"
				class="@min-[1100px]:col-start-2 @min-[1100px]:row-start-1 @min-[1100px]:row-span-2"
				:back="isPhone"
				:building="selectedBuilding"
				:interval="intervals[selectedBuilding.ticker]"
				:materials="selectedMaterials!"
				:ages="ages(selectedBuilding.ticker)"
				@update:interval="
					(v, source) =>
						setInterval(selectedBuilding!.ticker, v, source)
				"
				@back="phoneDetail = false">
				<template #fio>
					<RepairFIOBuildings
						v-if="fioState === 'site'"
						:ticker="selectedBuilding.ticker"
						:planet="planetLabel"
						:buildings="fioBuildings[selectedBuilding.ticker] ?? []"
						:interval="intervals[selectedBuilding.ticker]"
						:planned="selectedBuilding.amount"
						:stale="fioStale" />
					<PNotice v-else-if="fioState === 'none'">
						{{ $t("plan.tools.repair_analysis.fio.connect") }}
						<RouterLink
							to="/profile#fio"
							class="block mt-1 font-medium text-link">
							{{
								$t(
									"plan.tools.repair_analysis.fio.connect_link"
								)
							}}
						</RouterLink>
					</PNotice>
					<PNotice v-else-if="fioState === 'no_site'">
						{{
							$t("plan.tools.repair_analysis.fio.no_site", {
								planet: planetLabel,
							})
						}}
					</PNotice>
				</template>
			</RepairBuildingDetail>

			<section
				v-if="!phoneDetail"
				:aria-label="$t('plan.tools.repair_analysis.all.title')"
				class="self-start py-3 px-4 bg-surface border border-line rounded-panel @min-[1100px]:col-start-1 @min-[1100px]:row-start-2">
				<RepairMaterialList
					:list="allMaterials"
					:limit="isPhone ? 6 : undefined"
					:title="$t('plan.tools.repair_analysis.all.title')"
					:subtitle="$t('plan.tools.repair_analysis.all.subtitle')" />
			</section>
		</div>

		<p class="text-xs text-muted">
			{{ $t("plan.tools.repair_analysis.footnote") }}
		</p>
	</div>
</template>
