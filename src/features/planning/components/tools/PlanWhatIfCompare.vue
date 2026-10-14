<script lang="ts">
	// module scope: the last compared plan per open plan, for this tab
	const picks = new Map<string, string>();
</script>

<script setup lang="ts">
	import { computed, ref, shallowRef, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { useCXData } from "@/features/cx/useCXData";
	import {
		getActiveEmpire,
		usePlanContext,
	} from "@/features/planning/usePlanContext";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Engine
	import { calculatePlan } from "@/features/planning/engine/calculatePlan";

	// Util
	import {
		compareRows,
		compareVerdict,
		materialChanges,
	} from "@/features/planning/util/whatIf.util";
	import { paybackDays } from "@/features/sharing/sharedPlan.util";
	import { compactNumber } from "@/ui/charts/charts.util";
	import { formatNumber, formatPayback } from "@/util/numbers";

	// Components
	import PDivergingBar from "@/ui/charts/PDivergingBar.vue";

	// Types & Interfaces
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import type {
		Plan,
		PlanEmpire,
	} from "@/features/api/schemas/planningData.schemas";
	import type {
		IPlanCalculation,
		IPlanInput,
	} from "@/features/planning/engine/engine.types";
	import type {
		CompareFigure,
		ICompareRow,
	} from "@/features/planning/util/whatIf.types";
	import type { PDataTableColumn, PSelectOption } from "@/ui/ui.types";

	// UI
	import { PDataTable, PSelect, PSpin, PTooltip } from "@/ui";

	const { t } = useI18n();

	const props = defineProps<{
		plan: IPlanInput["plan"];
		planUuid: string | undefined;
		empire: PlanEmpire | undefined;
		cxUuid: string | undefined;
		planet: Planet;
	}>();

	const planningStore = usePlanningStore();
	const { getGameData, createPrices, loadGameData } = usePlanContext();
	const { findEmpireCXUuid } = useCXData();
	const { materialsMap, getMaterialClass } = useMaterialData();

	/*
	 * Plans and picker
	 */

	const plans = shallowRef<Plan[]>();
	const failed = ref(false);
	useQuery("GetAllPlans")
		.execute()
		.then((data) => (plans.value = data))
		.catch(() => (failed.value = true));

	const samePlanet = (p: Plan) =>
		p.planet_natural_id === props.planet.planet_natural_id;
	const byName = (a: Plan, b: Plan) => a.plan_name.localeCompare(b.plan_name);

	// the open plan excluded, this planet's plans first
	const others = computed(() => {
		const list = (plans.value ?? []).filter(
			(p) => p.uuid !== props.planUuid
		);
		return [
			...list.filter(samePlanet).sort(byName),
			...list
				.filter((p) => !samePlanet(p))
				.sort(
					(a, b) =>
						a.planet_natural_id.localeCompare(
							b.planet_natural_id
						) || byName(a, b)
				),
		];
	});

	const options = computed<PSelectOption[]>(() => {
		const same = others.value.filter(samePlanet);
		const rest = others.value.filter((p) => !samePlanet(p));
		return [
			...(same.length
				? [
						{
							label: `${t("plan.tools.whatif.compare.same_planet")} · ${props.planet.planet_name}`,
							value: "same",
							children: same.map((p) => ({
								label: p.plan_name,
								value: p.uuid,
							})),
						},
					]
				: []),
			...(rest.length
				? [
						{
							label: t("plan.tools.whatif.compare.other_planets"),
							value: "other",
							children: rest.map((p) => ({
								label: p.plan_name,
								value: p.uuid,
								badge: p.planet_natural_id,
							})),
						},
					]
				: []),
		];
	});

	const pickKey = computed(() => props.planUuid ?? "new");
	const picked = ref<string | number | null | undefined>();

	// keep a valid pick: the remembered one, else the first in the list
	watch(
		others,
		(list) => {
			if (list.some((p) => p.uuid === picked.value)) return;
			const remembered = picks.get(pickKey.value);
			picked.value =
				list.find((p) => p.uuid === remembered)?.uuid ?? list[0]?.uuid;
		},
		{ immediate: true }
	);

	/*
	 * Calculations
	 */

	// this plan as the plan view shows it, recalculated while it is edited
	const mine = computed<IPlanCalculation>(() =>
		calculatePlan(
			{
				plan: props.plan,
				empire: props.empire,
				cxUuid: props.cxUuid,
				recipeOptions: false,
			},
			{
				...getGameData(),
				planet: props.planet,
				prices: createPrices(
					props.planet.planet_natural_id,
					props.cxUuid
				),
			}
		)
	);

	interface IOther {
		plan: Plan;
		cxUuid: string | undefined;
		calculation: IPlanCalculation;
	}
	const other = shallowRef<IOther>();
	const calcFailed = ref(false);
	let latest = 0;

	// the other plan as its own plan view calculates it: its first empire
	// (else the user's first) and that empire's CX preference
	async function calculateOther(plan: Plan): Promise<IOther> {
		const empires = Object.values(planningStore.empires);
		const empireUuid = plan.empires?.[0]?.uuid ?? empires[0]?.uuid;
		const cxUuid = findEmpireCXUuid(empireUuid);
		// its planet may not be loaded in this session yet
		const [gameData, planet] = await Promise.all([
			loadGameData(),
			useQuery("GetPlanet", {
				planetNaturalId: plan.planet_natural_id,
			}).execute(),
		]);
		const ctx = {
			...gameData,
			planet,
			prices: createPrices(plan.planet_natural_id, cxUuid),
		};
		return {
			plan,
			cxUuid,
			calculation: calculatePlan(
				{
					plan,
					empire: getActiveEmpire(empireUuid, empires),
					cxUuid,
					recipeOptions: false,
				},
				ctx
			),
		};
	}

	watch(
		picked,
		async (uuid) => {
			const run = ++latest;
			calcFailed.value = false;
			const plan = others.value.find((p) => p.uuid === uuid);
			if (!plan) return (other.value = undefined);
			picks.set(pickKey.value, plan.uuid);
			try {
				const result = await calculateOther(plan);
				if (run !== latest) return;
				other.value = result;
				trackEvent("plan:whatif_compare", {
					same_planet: samePlanet(plan),
				});
			} catch (err) {
				console.error(err);
				if (run !== latest) return;
				other.value = undefined;
				calcFailed.value = true;
			}
		},
		{ immediate: true }
	);

	const rows = computed(() =>
		other.value ? compareRows(mine.value, other.value.calculation) : []
	);
	const changes = computed(() =>
		other.value ? materialChanges(mine.value, other.value.calculation) : []
	);
	const otherName = computed(() => other.value?.plan.plan_name ?? "");
	const verdict = computed(() =>
		compareVerdict(rows.value, changes.value, otherName.value, t)
	);
	const priceSource = computed(() =>
		other.value?.cxUuid
			? t("plan.tools.whatif.compare.source_cx", {
					name: otherName.value,
					cx: planningStore.getCX(other.value.cxUuid).cx_name,
				})
			: t("plan.tools.whatif.compare.source_universe", {
					name: otherName.value,
				})
	);

	/*
	 * Key figures
	 */

	const DECIMALS: Partial<Record<CompareFigure, number>> = {
		profitArea: 2,
	};
	function value(key: CompareFigure, v: number): string {
		if (key === "roi") return formatPayback(v);
		const text = formatNumber(v, DECIMALS[key] ?? 0);
		return key === "area" ? text : `${text} ȼ`;
	}
	function difference(row: ICompareRow): string {
		if (!Number.isFinite(row.delta)) return "—";
		const decimals = row.key === "roi" ? 2 : (DECIMALS[row.key] ?? 0);
		const text = formatNumber(row.delta, decimals, false, row.delta !== 0);
		if (row.key === "roi") return `${text} d`;
		return row.key === "area" ? text : `${text} ȼ`;
	}
	const differenceClass = (row: ICompareRow) =>
		row.better === undefined
			? "text-muted-strong"
			: row.better
				? "text-positive"
				: "text-negative";

	// both bars of a row share its larger value; a payback that never
	// happens has no bar
	function bars(row: ICompareRow): { a: number; b: number } {
		const size = (v: number) =>
			row.key === "roi"
				? Number.isFinite(paybackDays(v))
					? v
					: 0
				: Math.abs(v);
		const max = Math.max(size(row.a), size(row.b));
		return {
			a: max ? (size(row.a) / max) * 100 : 0,
			b: max ? (size(row.b) / max) * 100 : 0,
		};
	}

	const columns = computed<PDataTableColumn<ICompareRow>[]>(() => [
		{ key: "figure", title: t("plan.tools.whatif.compare.columns.figure") },
		{ key: "a", align: "right", titleAlign: "right" },
		{ key: "b", align: "right", titleAlign: "right" },
		{
			key: "delta",
			title: t("plan.tools.whatif.compare.columns.difference"),
			align: "right",
			titleAlign: "right",
		},
		{
			key: "bars",
			title: t("plan.tools.whatif.compare.columns.side_by_side"),
			minWidth: 120,
		},
	]);
	const rowKey = (row: ICompareRow) => row.key;
	// daily profit and ROI decide most comparisons
	const strong = (row: ICompareRow) =>
		row.key === "profit" || row.key === "roi";

	/*
	 * What changes
	 */

	const TOP = 6;
	const shown = computed(() => changes.value.slice(0, TOP));
	const rest = computed(() => changes.value.slice(TOP));
	const restSum = computed(() =>
		rest.value.reduce((sum, c) => sum + c.delta, 0)
	);
	const maxAbs = computed(() =>
		Math.max(
			Math.abs(restSum.value),
			...shown.value.map((c) => Math.abs(c.delta))
		)
	);
	const signed = (v: number) => (v > 0 ? "+" : "") + compactNumber(v);
	const valueClass = (v: number) =>
		v > 0 ? "text-positive" : "text-negative";
	const chipClass = (ticker: string) =>
		materialsMap.value[ticker] ? getMaterialClass(ticker) : "bg-black/40";
</script>

<template>
	<div class="flex flex-col gap-3">
		<p v-if="failed" class="text-negative py-6">
			{{ t("plan.tools.whatif.compare.error") }}
		</p>
		<div v-else-if="!plans" class="py-6 text-center text-muted">
			<PSpin size="lg" />
			<br />
			{{ t("plan.tools.whatif.compare.loading") }}
		</div>
		<p v-else-if="!others.length" class="text-muted py-6">
			{{ t("plan.tools.whatif.compare.no_plans") }}
		</p>
		<template v-else>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
				<span v-if="other" class="text-xs text-muted">
					{{ priceSource }}
				</span>
				<div
					class="flex flex-wrap items-center gap-x-3 gap-y-1 w-full sm:w-auto sm:ml-auto">
					<span class="text-sm text-muted">
						{{ t("plan.tools.whatif.compare.picker") }}
					</span>
					<PSelect
						v-model:value="picked"
						class="w-full sm:w-72"
						searchable
						:options="options"
						:aria-label="t('plan.tools.whatif.compare.picker')" />
				</div>
			</div>

			<p v-if="calcFailed" class="text-negative py-6">
				{{ t("plan.tools.whatif.compare.calc_error") }}
			</p>

			<div
				v-if="other"
				class="grid grid-cols-[minmax(0,1fr)] @[1000px]:grid-cols-[minmax(0,1fr)_340px] gap-3 items-start">
				<div class="flex flex-col gap-2 min-w-0">
					<PDataTable
						:columns="columns"
						:data="rows"
						:row-key="rowKey"
						:min-width="560">
						<template #header-a>
							<span class="inline-flex items-center gap-1.5">
								<span
									aria-hidden="true"
									class="size-2.5 rounded-xs bg-(--chart-ink)/72" />
								{{ t("plan.tools.whatif.compare.this_plan") }}
							</span>
						</template>
						<template #header-b>
							<span
								class="inline-flex items-center gap-1.5 max-w-40">
								<span
									aria-hidden="true"
									class="shrink-0 size-2.5 rounded-xs bg-(--color-cx-ai1)" />
								<span class="truncate" :title="otherName">
									{{ otherName }}
								</span>
							</span>
						</template>
						<template #cell-figure="{ row }">
							<span
								class="whitespace-nowrap"
								:class="{
									'font-bold text-white': strong(row),
								}">
								{{
									t(
										`plan.tools.whatif.compare.figures.${row.key}`
									)
								}}
							</span>
						</template>
						<template #cell-a="{ row }">
							<span class="tabular-nums whitespace-nowrap">
								{{ value(row.key, row.a) }}
							</span>
						</template>
						<template #cell-b="{ row }">
							<span class="tabular-nums whitespace-nowrap">
								{{ value(row.key, row.b) }}
							</span>
						</template>
						<template #cell-delta="{ row }">
							<span
								class="tabular-nums whitespace-nowrap font-bold"
								:class="differenceClass(row)">
								{{ difference(row) }}
							</span>
						</template>
						<template #cell-bars="{ row }">
							<div
								role="img"
								class="flex flex-col gap-1"
								:aria-label="
									t('plan.tools.whatif.compare.bars_label', {
										a: value(row.key, row.a),
										b: value(row.key, row.b),
										name: otherName,
									})
								">
								<div
									class="h-1.5 rounded-r-sm bg-(--chart-ink)/72"
									:style="{ width: `${bars(row).a}%` }" />
								<div
									class="h-1.5 rounded-r-sm bg-(--color-cx-ai1)"
									:style="{ width: `${bars(row).b}%` }" />
							</div>
						</template>
					</PDataTable>
					<p class="text-xs text-muted">
						{{ t("plan.tools.whatif.compare.footnote") }}
					</p>
				</div>

				<div class="flex flex-col gap-3">
					<div
						class="flex flex-col gap-2 border border-white/10 rounded p-3 text-sm">
						<h3 class="font-bold text-white">
							{{ t("plan.tools.whatif.compare.verdict.title") }}
						</h3>
						<p data-verdict>{{ verdict }}</p>
					</div>

					<div
						class="flex flex-col gap-2 border border-white/10 rounded p-3 text-sm">
						<div
							class="flex flex-wrap items-baseline justify-between gap-x-3">
							<h3 class="font-bold text-white">
								{{
									t("plan.tools.whatif.compare.changes.title")
								}}
							</h3>
							<span class="text-xs text-muted">
								{{
									t(
										"plan.tools.whatif.compare.changes.subtitle",
										{
											name: otherName,
										}
									)
								}}
							</span>
						</div>
						<p v-if="!changes.length" class="text-muted">
							{{ t("plan.tools.whatif.compare.changes.none") }}
						</p>
						<ul v-else class="flex flex-col gap-1">
							<li v-for="c in shown" :key="c.ticker">
								<PTooltip placement="top">
									<template #trigger>
										<div
											class="flex items-center gap-2 min-h-11 @[640px]:min-h-7">
											<span
												class="shrink-0 w-12 px-1 rounded-sm text-xs text-center font-bold"
												:class="chipClass(c.ticker)">
												{{ c.ticker }}
											</span>
											<PDivergingBar
												class="flex-1"
												:value="c.delta"
												:max-abs="maxAbs"
												:label="
													t(
														'plan.tools.whatif.compare.changes.bar_label',
														{
															ticker: c.ticker,
															value: signed(
																c.delta
															),
														}
													)
												" />
											<span
												class="shrink-0 w-16 text-right text-xs font-bold tabular-nums"
												:class="valueClass(c.delta)">
												{{ signed(c.delta) }}
											</span>
										</div>
									</template>
									<div
										class="flex flex-col gap-1 min-w-48 text-sm">
										<div class="font-bold">
											{{ c.ticker }}
											<span
												v-if="materialsMap[c.ticker]"
												class="font-normal text-muted">
												{{
													materialsMap[c.ticker].name
												}}
											</span>
										</div>
										<div class="flex justify-between gap-4">
											<span class="text-muted">
												{{
													t(
														"plan.tools.whatif.compare.this_plan"
													)
												}}
											</span>
											<span class="tabular-nums">
												{{ formatNumber(c.a, 0) }} ȼ
											</span>
										</div>
										<div class="flex justify-between gap-4">
											<span class="text-muted truncate">
												{{ otherName }}
											</span>
											<span class="tabular-nums">
												{{ formatNumber(c.b, 0) }} ȼ
											</span>
										</div>
									</div>
								</PTooltip>
							</li>
							<li v-if="rest.length">
								<PTooltip placement="top">
									<template #trigger>
										<div
											class="flex items-center gap-2 min-h-11 @[640px]:min-h-7">
											<span
												class="shrink-0 w-12 px-1 rounded-sm text-xs text-center font-bold bg-white/10 text-muted-strong"
												:aria-label="
													t(
														'plan.tools.whatif.compare.changes.more_label',
														{ n: rest.length },
														rest.length
													)
												">
												{{
													t(
														"plan.tools.whatif.compare.changes.more",
														{ n: rest.length }
													)
												}}
											</span>
											<PDivergingBar
												class="flex-1"
												:value="restSum"
												:max-abs="maxAbs"
												:label="
													t(
														'plan.tools.whatif.compare.changes.bar_label',
														{
															ticker: rest
																.map(
																	(c) =>
																		c.ticker
																)
																.join(', '),
															value: signed(
																restSum
															),
														}
													)
												" />
											<span
												class="shrink-0 w-16 text-right text-xs font-bold tabular-nums"
												:class="valueClass(restSum)">
												{{ signed(restSum) }}
											</span>
										</div>
									</template>
									<div
										class="flex flex-col gap-1 min-w-40 text-sm">
										<div
											v-for="c in rest"
											:key="c.ticker"
											class="flex justify-between gap-4">
											<span class="font-bold">{{
												c.ticker
											}}</span>
											<span class="tabular-nums">
												{{ signed(c.delta) }} ȼ
											</span>
										</div>
									</div>
								</PTooltip>
							</li>
						</ul>
					</div>
				</div>
			</div>
			<div v-else-if="!calcFailed" class="py-6 text-center">
				<PSpin size="lg" />
			</div>
		</template>
	</div>
</template>
