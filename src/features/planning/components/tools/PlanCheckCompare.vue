<script lang="ts">
	// module scope: the last compared plan per open plan, for this tab
	const picks = new Map<string, string>();
</script>

<script setup lang="ts">
	import { computed, ref, shallowRef, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	import { useUserStore } from "@/stores/userStore";

	// Composables
	import { useExchangeData } from "@/database/services/useExchangeData";
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { useCXData } from "@/features/cx/useCXData";
	import {
		getActiveEmpire,
		usePlanContext,
	} from "@/features/planning/usePlanContext";
	import { trackEvent, reportError } from "@/lib/analytics/useAnalytics";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { planEmpireUuid } from "@/layout/components/navigation/navigation.util";

	// Engine
	import { calculatePlan } from "@/features/planning/engine/calculatePlan";

	// Util
	import {
		compareRows,
		compareVerdict,
		materialChanges,
		paybackOfDifference,
	} from "@/features/planning/util/whatIf.util";
	import { formatShare, marketCheck } from "@/features/cx/marketCheck.util";
	import { paybackDays } from "@/features/sharing/sharedPlan.util";
	import { compactNumber } from "@/ui/charts/charts.util";
	import { formatNumber, formatPayback } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

	// Components
	import PDivergingBar from "@/ui/charts/PDivergingBar.vue";
	import MarketFlagIcon from "@/features/cx/components/MarketFlagIcon.vue";

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
	import type {
		IFlaggedCheck,
		IMarketCheck,
		MarketFlagLevel,
	} from "@/features/cx/marketCheck.types";
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
	const userStore = useUserStore();
	const { getGameData, createPrices, loadGameData } = usePlanContext();
	const { findEmpireCXUuid } = useCXData();
	const { getExchangeTickerLoaded } = useExchangeData();
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
							label: `${t("plan.tools.plan_check.compare.same_planet")} · ${planetDisplayName(props.planet.planet_natural_id, props.planet.planet_name)}`,
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
							label: t(
								"plan.tools.plan_check.compare.other_planets"
							),
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

	// the other plan as its own plan view calculates it: the empire its
	// breadcrumb links, else its first (else the user's first), and that
	// empire's CX preference
	async function calculateOther(plan: Plan): Promise<IOther> {
		const empires = Object.values(planningStore.empires);
		const empireUuid =
			planEmpireUuid(
				plan.uuid,
				plan.empires ?? [],
				empires,
				userStore.preferences.defaultEmpireUuid
			) ?? empires[0]?.uuid;
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
				trackEvent("plan:plancheck_compare", {
					same_planet: samePlanet(plan),
				});
			} catch (err) {
				reportError(err);
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
	const payback = computed(() =>
		other.value
			? paybackOfDifference(mine.value, other.value.calculation)
			: undefined
	);
	const verdict = computed(() => {
		const text = compareVerdict(
			rows.value,
			changes.value,
			otherName.value,
			t
		);
		const p = payback.value;
		if (!p || p.days === null) return text;
		const key = "plan.tools.plan_check.compare.verdict";
		const cost = compactNumber(p.cost);
		return `${text} ${
			p.days === "never"
				? t(`${key}.payback_never`, { cost })
				: t(`${key}.payback`, { cost, days: formatNumber(p.days, 1) })
		}`;
	});
	const priceSource = computed(() =>
		other.value?.cxUuid
			? t("plan.tools.plan_check.compare.source_cx", {
					name: otherName.value,
					cx: planningStore.getCX(other.value.cxUuid).cx_name,
				})
			: t("plan.tools.plan_check.compare.source_universe", {
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

	const columns = computed<PDataTableColumn<Row>[]>(() => [
		{
			key: "figure",
			title: t("plan.tools.plan_check.compare.columns.figure"),
		},
		{ key: "a", align: "right", titleAlign: "right" },
		{ key: "b", align: "right", titleAlign: "right" },
		{
			key: "delta",
			title: t("plan.tools.plan_check.compare.columns.difference"),
			align: "right",
			titleAlign: "right",
		},
		{
			key: "bars",
			title: t("plan.tools.plan_check.compare.columns.side_by_side"),
			minWidth: 120,
		},
	]);
	const rowKey = (row: Row) => row.key;
	// daily profit and ROI decide most comparisons
	const strong = (row: ICompareRow) =>
		row.key === "profit" || row.key === "roi";

	// the key figures with the payback of the difference after ROI
	type Row = ICompareRow | { key: "payback" };
	const rowClass = (row: Row) => (row.key === "payback" ? "bg-white/5" : "");
	const tableRows = computed<Row[]>(() => {
		const i = rows.value.findIndex((r) => r.key === "roi") + 1;
		return [
			...rows.value.slice(0, i),
			{ key: "payback" },
			...rows.value.slice(i),
		];
	});
	function paybackValue(): string {
		const days = payback.value?.days;
		if (days === undefined || days === null) return "–";
		if (days === "never")
			return t("plan.tools.plan_check.compare.payback.never");
		return `${formatNumber(days, 1)} d`;
	}
	function paybackFormula(): string {
		const p = payback.value;
		if (!p || p.days === null) return "";
		if (p.days === "never")
			return t("plan.tools.plan_check.compare.payback.never_formula", {
				name: otherName.value,
			});
		return t("plan.tools.plan_check.compare.payback.formula", {
			cost: formatNumber(p.cost, 0),
			profit: formatNumber(p.profit, 0),
		});
	}

	/*
	 * Materials the other plan pushes into a worse market flag
	 */

	const RANK: Record<MarketFlagLevel, number> = {
		red: 2,
		amber: 1,
		muted: 0,
	};
	const rank = (c?: IMarketCheck) => (c?.level ? RANK[c.level] : 0);
	const checksOf = (
		c: IPlanCalculation,
		planetNaturalId: string,
		cxUuid: string | undefined
	) =>
		new Map(
			marketCheck(
				c.result.materialio,
				createPrices(planetNaturalId, cxUuid),
				getExchangeTickerLoaded
			).map((m) => [m.ticker, m])
		);
	const pushed = computed(() => {
		const result = new Map<string, IFlaggedCheck>();
		if (!other.value) return result;
		const a = checksOf(
			mine.value,
			props.planet.planet_natural_id,
			props.cxUuid
		);
		const b = checksOf(
			other.value.calculation,
			other.value.plan.planet_natural_id,
			other.value.cxUuid
		);
		for (const [ticker, check] of b)
			if (rank(check) > rank(a.get(ticker)) && check.level !== "muted")
				result.set(ticker, check as IFlaggedCheck);
		return result;
	});
	function pushedNote(c: IMarketCheck): string {
		return t("plan.tools.plan_check.compare.changes.flag", {
			ticker: c.ticker,
			name: otherName.value,
			side: t(
				`plan.tools.plan_check.side.${c.delta > 0 ? "sell" : "buy"}`
			),
			value: formatNumber(Math.abs(c.delta)),
			share: formatShare(c.sharePct),
			exchange:
				c.exchange === "UNIVERSE"
					? t("cx.market_flags.all_exchanges")
					: c.exchange,
		});
	}

	/*
	 * What changes
	 */

	const TOP = 6;
	const showAll = ref(false);
	const shown = computed(() =>
		showAll.value ? changes.value : changes.value.slice(0, TOP)
	);
	const rest = computed(() =>
		showAll.value ? [] : changes.value.slice(TOP)
	);
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
			{{ t("plan.tools.plan_check.compare.error") }}
		</p>
		<div v-else-if="!plans" class="py-6 text-center text-muted">
			<PSpin size="lg" />
			<br />
			{{ t("plan.tools.plan_check.compare.loading") }}
		</div>
		<p v-else-if="!others.length" class="text-muted py-6">
			{{ t("plan.tools.plan_check.compare.no_plans") }}
		</p>
		<template v-else>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
				<span v-if="other" class="text-xs text-muted">
					{{ priceSource }}
				</span>
				<div
					class="flex flex-wrap items-center gap-x-3 gap-y-1 w-full sm:w-auto sm:ml-auto">
					<span class="text-sm text-muted">
						{{ t("plan.tools.plan_check.compare.picker") }}
					</span>
					<PSelect
						v-model:value="picked"
						class="w-full sm:w-72"
						searchable
						:options="options"
						:aria-label="
							t('plan.tools.plan_check.compare.picker')
						" />
				</div>
			</div>

			<p v-if="calcFailed" class="text-negative py-6">
				{{ t("plan.tools.plan_check.compare.calc_error") }}
			</p>

			<div
				v-if="other"
				class="grid grid-cols-[minmax(0,1fr)] @[1000px]:grid-cols-[minmax(0,1fr)_340px] gap-3 items-start">
				<div class="flex flex-col gap-2 min-w-0">
					<!-- below 640 px both plans share a column, Difference beside
						them; the side-by-side bars drop -->
					<PDataTable
						class="@max-[640px]:[&_[data-col-key=b]]:hidden @max-[640px]:[&_[data-col-key=bars]]:hidden"
						:columns="columns"
						:data="tableRows"
						:row-key="rowKey"
						:row-class="rowClass">
						<template #header-a>
							<span
								class="inline-flex flex-col items-end gap-0.5">
								<span class="inline-flex items-center gap-1.5">
									<span
										aria-hidden="true"
										class="size-2.5 rounded-xs bg-(--chart-ink)/72" />
									{{
										t(
											"plan.tools.plan_check.compare.this_plan"
										)
									}}
								</span>
								<span
									class="inline-flex @[640px]:hidden items-center gap-1.5 max-w-28">
									<span
										aria-hidden="true"
										class="shrink-0 size-2.5 rounded-xs bg-(--color-cx-ai1)" />
									<span class="truncate" :title="otherName">
										{{ otherName }}
									</span>
								</span>
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
								class="@[640px]:whitespace-nowrap"
								:class="{
									'font-bold text-white':
										row.key === 'payback' || strong(row),
								}">
								{{
									t(
										`plan.tools.plan_check.compare.figures.${row.key}`
									)
								}}
							</span>
							<span
								v-if="row.key === 'payback'"
								class="block @[640px]:hidden text-xs text-muted-strong">
								{{ paybackFormula() }}
							</span>
						</template>
						<template #cell-a="{ row }">
							<span
								v-if="row.key === 'payback'"
								class="text-muted">
								–
							</span>
							<span
								v-else
								class="inline-flex flex-col items-end tabular-nums whitespace-nowrap">
								<span class="inline-flex items-center gap-1.5">
									<span
										aria-hidden="true"
										class="@[640px]:hidden size-2 rounded-xs bg-(--chart-ink)/72" />
									{{ value(row.key, row.a) }}
								</span>
								<span
									class="inline-flex @[640px]:hidden items-center gap-1.5">
									<span
										aria-hidden="true"
										class="size-2 rounded-xs bg-(--color-cx-ai1)" />
									{{ value(row.key, row.b) }}
								</span>
							</span>
						</template>
						<template #cell-b="{ row }">
							<span
								v-if="row.key === 'payback'"
								class="text-muted">
								–
							</span>
							<span v-else class="tabular-nums whitespace-nowrap">
								{{ value(row.key, row.b) }}
							</span>
						</template>
						<template #cell-delta="{ row }">
							<span
								v-if="row.key === 'payback'"
								class="tabular-nums whitespace-nowrap font-bold"
								:class="
									payback?.days === 'never'
										? 'text-negative'
										: typeof payback?.days === 'number'
											? 'text-positive'
											: 'text-muted'
								"
								data-payback>
								{{ paybackValue() }}
							</span>
							<span
								v-else
								class="tabular-nums whitespace-nowrap font-bold"
								:class="differenceClass(row)">
								{{ difference(row) }}
							</span>
						</template>
						<template #cell-bars="{ row }">
							<span
								v-if="row.key === 'payback'"
								class="text-xs text-muted-strong">
								{{ paybackFormula() }}
							</span>
							<div
								v-else
								role="img"
								class="flex flex-col gap-1"
								:aria-label="
									t(
										'plan.tools.plan_check.compare.bars_label',
										{
											a: value(row.key, row.a),
											b: value(row.key, row.b),
											name: otherName,
										}
									)
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
						{{ t("plan.tools.plan_check.compare.footnote") }}
					</p>
				</div>

				<div class="flex flex-col gap-3">
					<div
						class="flex flex-col gap-2 border border-white/10 rounded p-3 text-sm">
						<h3 class="font-bold text-white">
							{{
								t("plan.tools.plan_check.compare.verdict.title")
							}}
						</h3>
						<p data-verdict>{{ verdict }}</p>
					</div>

					<div
						class="flex flex-col gap-2 border border-white/10 rounded p-3 text-sm">
						<div
							class="flex flex-wrap items-baseline justify-between gap-x-3">
							<h3 class="font-bold text-white">
								{{
									t(
										"plan.tools.plan_check.compare.changes.title"
									)
								}}
							</h3>
							<span class="text-xs text-muted">
								{{
									t(
										"plan.tools.plan_check.compare.changes.subtitle",
										{
											name: otherName,
										}
									)
								}}
							</span>
						</div>
						<p v-if="!changes.length" class="text-muted">
							{{
								t("plan.tools.plan_check.compare.changes.none")
							}}
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
														'plan.tools.plan_check.compare.changes.bar_label',
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
											<span class="shrink-0 w-4">
												<MarketFlagIcon
													v-if="pushed.get(c.ticker)"
													:level="
														pushed.get(c.ticker)!
															.level
													" />
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
														"plan.tools.plan_check.compare.this_plan"
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
														'plan.tools.plan_check.compare.changes.more_label',
														{ n: rest.length },
														rest.length
													)
												">
												{{
													t(
														"plan.tools.plan_check.compare.changes.more",
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
														'plan.tools.plan_check.compare.changes.bar_label',
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
											<span class="shrink-0 w-4" />
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
						<button
							v-if="changes.length > TOP"
							type="button"
							class="self-start min-h-7 pointer-coarse:min-h-11 text-xs text-link hover:underline cursor-pointer"
							:aria-expanded="showAll"
							@click="showAll = !showAll">
							{{
								showAll
									? t("common.buttons.show_fewer")
									: t("common.buttons.show_all", {
											n: changes.length,
										})
							}}
						</button>
						<p
							v-for="c in shown.filter((s) =>
								pushed.has(s.ticker)
							)"
							:key="`flag-${c.ticker}`"
							class="flex gap-1.5 text-xs text-muted-strong"
							data-pushed-flag>
							<MarketFlagIcon
								:level="pushed.get(c.ticker)!.level" />
							{{ pushedNote(pushed.get(c.ticker)!) }}
						</p>
					</div>
				</div>
			</div>
			<div v-else-if="!calcFailed" class="py-6 text-center">
				<PSpin size="lg" />
			</div>
		</template>
	</div>
</template>
