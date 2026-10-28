<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import ChainRecipeText from "@/features/production_chain/components/ChainRecipeText.vue";
	import ChainStepDetail from "@/features/production_chain/components/ChainStepDetail.vue";
	import ChainRecipePicker from "@/features/production_chain/components/ChainRecipePicker.vue";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	const { materialsMap } = useMaterialData();

	// Util
	import {
		formatMoney,
		formatQty,
		formatShare,
		NO_OWN,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";
	import { formatMaterialName } from "@/util/text";
	import { MARKET_SHARE_AMBER } from "@/features/cx/marketCheck.util";

	// Types & Interfaces
	import type {
		ChainByproductMode,
		ChainHave,
		ChainRowSource,
		ChainSource,
		IChainBase,
		IChainExtractionOptions,
		IChainMarketShare,
		IChainRecipeEffect,
		IChainResult,
		IChainRow,
	} from "@/features/production_chain/engine/chainSolver.types";
	import type {
		IChainFilter,
		IChainOrder,
		IChainOwn,
	} from "@/features/production_chain/productionChain.types";

	// UI
	import { PButton, PInputNumber, PSegmented, PSelect, PTable } from "@/ui";

	// Engine
	import { BASE_IDS } from "@/features/production_chain/engine/chainBases";

	const {
		result,
		order,
		filter,
		byproductMode,
		extraction,
		recipeOptions,
		bases,
		own = NO_OWN,
	} = defineProps<{
		result: IChainResult;
		order: IChainOrder;
		filter: IChainFilter | null;
		byproductMode: ChainByproductMode;
		extraction: ReadonlyMap<string, IChainExtractionOptions> | undefined;
		recipeOptions: (ticker: string) => IChainRecipeEffect[];
		bases: IChainBase[];
		own?: IChainOwn;
	}>();

	const emit = defineEmits<{
		(e: "source", ticker: string, source: ChainSource): void;
		(e: "recipe", ticker: string, recipeId: string): void;
		(e: "planet", ticker: string): void;
		(e: "buyAll", tickers: string[]): void;
		(e: "clearFilter"): void;
		(e: "base", ticker: string, id: string): void;
		(e: "have", ticker: string, value: ChainHave | "off" | undefined): void;
	}>();

	const COLUMNS = 9;

	const baseOptions = computed(() => [
		...bases.map((b) => ({ label: b.id, value: b.id })),
		...(bases.length < BASE_IDS.length
			? [{ label: t("production_chains.table.new_base"), value: "new" }]
			: []),
	]);

	const open: Ref<Set<string>> = ref(new Set());
	const collapsed: Ref<Set<string>> = ref(new Set());

	const toggle = (set: Ref<Set<string>>, ticker: string) => {
		const next = new Set(set.value);
		if (next.has(ticker)) next.delete(ticker);
		else next.add(ticker);
		set.value = next;
	};
	const toggleOpen = (ticker: string) => toggle(open, ticker);
	const toggleCollapsed = (ticker: string) => toggle(collapsed, ticker);

	const name = (ticker: string) =>
		formatMaterialName(materialsMap.value[ticker]?.name ?? "", ticker);
	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });
	const hours = (ms: number) =>
		t("production_chains.hours", {
			n: formatNumber(ms / 3_600_000, ms >= 36_000_000 ? 1 : 2),
		});

	type IEntry =
		| {
				kind: "row";
				row: IChainRow;
				depth: number;
				caret: "open" | "closed" | null;
		  }
		| { kind: "group"; key: string; label: string };

	/** depth-first from each target, each material once at its first use */
	function chainEntries(): IEntry[] {
		const entries: IEntry[] = [];
		const seen = new Set<string>();
		const walk = (ticker: string, depth: number, hidden: boolean) => {
			const row = result.rows[ticker];
			if (seen.has(ticker) || !row) return;
			seen.add(ticker);
			const inputs =
				row.source === "make"
					? (row.recipe?.inputs ?? [])
							.map((i) => i.material_ticker)
							.filter((i) => result.rows[i] && !seen.has(i))
					: [];
			const isCollapsed = collapsed.value.has(ticker);
			if (!hidden)
				entries.push({
					kind: "row",
					row,
					depth,
					caret: inputs.length ? (isCollapsed ? "closed" : "open") : null,
				});
			for (const i of inputs) walk(i, depth + 1, hidden || isCollapsed);
		};
		// order keeps the targets in the order they were added
		for (const t of result.order) if (result.rows[t].target) walk(t, 0, false);
		return entries;
	}

	function sourceEntries(): IEntry[] {
		const entries: IEntry[] = [];
		const rows = [...result.order].reverse().map((t) => result.rows[t]);
		for (const source of ["make", "extract", "buy", "have"] as const) {
			const list = rows.filter((r) => r.source === source);
			if (!list.length) continue;
			entries.push({
				kind: "group",
				key: source,
				label: t(`production_chains.table.group_${source}`, {
					n: list.length,
				}),
			});
			for (const row of list)
				entries.push({ kind: "row", row, depth: 0, caret: null });
		}
		return entries;
	}

	const filtered = computed(() =>
		filter ? result.warnings[filter].map((t) => result.rows[t]) : []
	);

	const entries = computed<IEntry[]>(() => {
		if (filter)
			return filtered.value.map((row) => ({
				kind: "row",
				row,
				depth: 0,
				caret: null,
			}));
		return order === "chain" ? chainEntries() : sourceEntries();
	});

	const byproducts = computed(() =>
		filter ? [] : result.byproducts.filter((b) => b.produced > 1e-9)
	);

	function sourceOptions(row: IChainRow) {
		const options: {
			value: ChainRowSource;
			label: string;
			disabled?: boolean;
		}[] = [
			{
				value: "make",
				label: t("production_chains.table.make"),
				disabled: !row.canMake,
			},
			{
				value: "buy",
				label: t("production_chains.table.buy"),
				disabled: row.target,
			},
		];
		if (row.canExtract)
			options.push({
				value: "extract",
				label: t("production_chains.table.extract"),
			});
		options.push({
			value: "have",
			label: t("production_chains.have.option"),
			disabled: row.target,
		});
		return options;
	}

	const EPS = 1e-9;
	/** Have shows as the source while own production covers any of it */
	const sourceValue = (row: IChainRow): ChainRowSource =>
		row.have > EPS ? "have" : row.source;

	function onSource(row: IChainRow, v: ChainRowSource): void {
		if (v === sourceValue(row)) return;
		// back to the empire's surplus when it has one, else all of it
		if (v === "have")
			return emit(
				"have",
				row.ticker,
				own.surplus.has(row.ticker) ? undefined : "all"
			);
		emit("source", row.ticker, v);
		if (row.have > EPS) emit("have", row.ticker, "off");
	}

	/** what makes, buys or extracts the rest of a partly had row */
	const restOptions = (row: IChainRow) =>
		sourceOptions(row)
			.filter((o) => o.value !== "have" && !o.disabled)
			.map((o) => ({
				value: o.value,
				label: t("production_chains.have.rest_option", {
					source: o.label,
					n: formatQty(row.perDay),
				}),
			}));

	/** the amount field while typing, applied on blur or Enter */
	const drafts: Ref<Record<string, number | null>> = ref({});
	const draftOf = (row: IChainRow) =>
		row.ticker in drafts.value
			? drafts.value[row.ticker]
			: row.haveAvailable === null
				? null
				: Math.round(row.haveAvailable * 100) / 100;

	function applyHave(row: IChainRow): void {
		if (!(row.ticker in drafts.value)) return;
		const v = drafts.value[row.ticker];
		const next = { ...drafts.value };
		delete next[row.ticker];
		drafts.value = next;
		// empty is all, 0 none
		const value: ChainHave | "off" = v === null ? "all" : v > 0 ? v : "off";
		if (value !== (draftOf(row) ?? "all")) emit("have", row.ticker, value);
	}

	/** "uses 450 of 480 · Deimos Metals 200 · Montem Smelter 250" */
	function usesText(row: IChainRow): string {
		const uses =
			row.haveAvailable === null
				? t("production_chains.have.uses_all", { n: formatQty(row.have) })
				: t("production_chains.have.uses", {
						n: formatQty(row.have),
						of: formatQty(row.haveAvailable),
					});
		return [
			uses,
			...(own.suppliers[row.ticker] ?? []).map(
				(s) =>
					`${s.plan?.name ?? t("production_chains.have.your_bases")} ${formatQty(s.perDay)}`
			),
		].join(" · ");
	}

	/** a typed amount other than the empire's surplus: the way back to it */
	function empireBack(row: IChainRow): number | null {
		const o = own.overrides[row.ticker];
		const q = own.surplus.get(row.ticker);
		return own.name &&
			o?.origin === "typed" &&
			o.value !== "off" &&
			q &&
			o.value !== q
			? q
			: null;
	}

	function shareChip(market: IChainMarketShare) {
		return {
			text:
				market.sharePct === null
					? t("production_chains.table.no_trades")
					: t("production_chains.table.share", {
							pct: formatShare(market.sharePct / 100),
						}),
			cls:
				market.level === "red"
					? "text-negative border-negative"
					: market.level === "amber"
						? "text-warning border-warning"
						: "text-muted border-line",
		};
	}

	function verdict(row: IChainRow) {
		if (!row.price)
			return {
				text: t("production_chains.table.no_price"),
				cls: "text-muted border-line",
			};
		if (row.unitCost <= row.price)
			return {
				text: t("production_chains.table.make_saves", {
					pct: formatShare((row.price - row.unitCost) / row.price),
				}),
				cls: "text-positive border-positive",
			};
		return {
			text: t("production_chains.table.buy_cheaper", {
				pct: formatShare((row.unitCost - row.price) / row.unitCost),
			}),
			cls: "text-warning border-warning",
		};
	}

	function typeOf(row: IChainRow) {
		return result.buildingTypes.find(
			(b) => b.ticker === row.buildingTicker && b.base === row.base
		);
	}

	// one recipe picker, anchored at the button it opens from
	const picker = ref<{ ticker: string; anchor: HTMLElement } | null>(null);
	const showPicker = ref(false);
	const pickerOptions = computed(() =>
		picker.value && showPicker.value ? recipeOptions(picker.value.ticker) : []
	);

	function openPicker(ticker: string, e: MouseEvent): void {
		picker.value = { ticker, anchor: e.currentTarget as HTMLElement };
		showPicker.value = true;
	}
</script>

<template>
	<div>
		<div
			v-if="filter"
			class="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-b border-line bg-surface-sunken"
			role="status"
			data-testid="chain-filter-banner">
			<span>
				{{
					filter === "cheaper"
						? $t("production_chains.filter.cheaper", filtered.length)
						: $t(
								"production_chains.filter.thin",
								{ n: filtered.length, pct: `${MARKET_SHARE_AMBER} %` },
								filtered.length
							)
				}}
			</span>
			<span class="flex gap-2">
				<PButton
					v-if="filter === 'cheaper' && filtered.length"
					size="sm"
					@click="
						emit(
							'buyAll',
							filtered.map((r) => r.ticker)
						)
					">
					{{ $t("production_chains.filter.buy_all", filtered.length) }}
				</PButton>
				<PButton size="sm" type="secondary" @click="emit('clearFilter')">
					{{ $t("production_chains.filter.show_all") }}
				</PButton>
			</span>
		</div>
		<PTable class="border-0 rounded-none">
			<thead>
				<tr>
					<th>{{ $t("production_chains.table.material") }}</th>
					<th class="numeric">{{ $t("production_chains.table.per_day") }}</th>
					<th>{{ $t("production_chains.table.base") }}</th>
					<th>{{ $t("production_chains.table.source") }}</th>
					<th>{{ $t("production_chains.table.recipe") }}</th>
					<th>{{ $t("production_chains.table.buildings") }}</th>
					<th class="numeric">{{ $t("production_chains.table.unit_cost") }}</th>
					<th class="numeric">{{ $t("production_chains.table.cx_price") }}</th>
					<th>{{ $t("production_chains.table.make_or_buy") }}</th>
				</tr>
			</thead>
			<tbody>
				<template
					v-for="entry in entries"
					:key="entry.kind === 'row' ? entry.row.ticker : `g-${entry.key}`">
					<tr v-if="entry.kind === 'group'">
						<td
							:colspan="COLUMNS"
							class="text-xs uppercase tracking-wide text-muted bg-surface-sunken">
							{{ entry.label }}
						</td>
					</tr>
					<template v-else>
						<tr :data-testid="`chain-row-${entry.row.ticker}`">
							<td>
								<div class="flex items-center gap-2 min-w-48">
									<span
										v-if="entry.depth"
										class="self-stretch border-l border-line"
										:style="{ marginLeft: `${(entry.depth - 1) * 16 + 8}px` }" />
									<button
										v-if="entry.caret"
										type="button"
										class="w-5 text-muted hover:text-ink-strong cursor-pointer"
										:aria-expanded="entry.caret === 'open'"
										:aria-label="
											entry.caret === 'open'
												? t('production_chains.table.collapse', { ticker: entry.row.ticker })
												: t('production_chains.table.expand', { ticker: entry.row.ticker })
										"
										@click="toggleCollapsed(entry.row.ticker)">
										{{ entry.caret === "open" ? "▾" : "▸" }}
									</button>
									<span v-else class="w-5" />
									<MaterialTile :key="entry.row.ticker" :ticker="entry.row.ticker" />
									<button
										type="button"
										class="text-left cursor-pointer hover:underline"
										:aria-expanded="open.has(entry.row.ticker)"
										:title="t('production_chains.table.details', { ticker: entry.row.ticker })"
										@click="toggleOpen(entry.row.ticker)">
										<!-- long names wrap, so the table fits beside the aside -->
										<span class="block">
											{{ name(entry.row.ticker) }}
											<span
												v-if="entry.row.target"
												class="ml-1 px-1 rounded-control border border-prunplanner text-prunplanner text-xs uppercase">
												{{ $t("production_chains.table.target") }}
											</span>
										</span>
										<span class="block text-xs text-muted">
											{{
												entry.row.users.length
													? $t("production_chains.table.for", {
															list: entry.row.users.join(", "),
														})
													: entry.row.target
														? $t("production_chains.table.sold")
														: ""
											}}
										</span>
									</button>
								</div>
							</td>
							<!-- the lines under the amount may wrap, so the table can fit -->
							<td class="numeric tabular-nums">
								<span class="whitespace-nowrap">{{
									formatQty(entry.row.source === "have" ? entry.row.have : entry.row.perDay)
								}}</span>
								<span v-if="entry.row.source === 'have'" class="block text-xs text-have">
									{{ $t("production_chains.have.from_plans") }}
								</span>
								<span v-else-if="entry.row.have > 1e-9" class="block text-xs text-have">
									{{ $t("production_chains.have.plus_from_plans", { n: formatQty(entry.row.have) }) }}
								</span>
								<span v-if="entry.row.target" class="block text-xs text-muted">
									{{
										$t("production_chains.table.sells", {
											value: money(entry.row.targetPerDay * entry.row.sellPrice),
										})
									}}
								</span>
								<span v-if="entry.row.covered > 1e-9" class="block text-xs text-positive">
									{{
										$t("production_chains.table.from_byproducts", {
											n: formatQty(entry.row.covered),
										})
									}}
								</span>
							</td>
							<td>
								<PSelect
									v-if="entry.row.base"
									:value="entry.row.base"
									:options="baseOptions"
									size="sm"
									class="w-12"
									:aria-label="t('production_chains.table.base_of', { ticker: entry.row.ticker })"
									:data-testid="`chain-base-${entry.row.ticker}`"
									@update:value="(v) => v && v !== entry.row.base && emit('base', entry.row.ticker, String(v))" />
								<span v-else class="text-muted">–</span>
							</td>
							<td>
								<span
									class="inline-block"
									:title="entry.row.target ? t('production_chains.have.target_reason') : undefined">
									<PSegmented
										:value="sourceValue(entry.row)"
										:options="sourceOptions(entry.row)"
										size="sm"
										:label="t('production_chains.table.source_of', { ticker: entry.row.ticker })"
										@update:value="(v) => onSource(entry.row, v)" />
								</span>
								<label
									v-if="entry.row.have > 1e-9 && entry.row.source !== 'have'"
									class="flex items-center gap-2 pt-1 text-xs text-muted">
									{{ $t("production_chains.have.rest") }}
									<PSelect
										:value="entry.row.source"
										:options="restOptions(entry.row)"
										size="sm"
										class="w-32"
										:aria-label="t('production_chains.have.rest_of', { ticker: entry.row.ticker })"
										:data-testid="`chain-rest-${entry.row.ticker}`"
										@update:value="(v) => v && v !== entry.row.source && emit('source', entry.row.ticker, v as ChainSource)" />
								</label>
							</td>
							<td>
								<div v-if="entry.row.have > 1e-9" class="pb-1" :data-testid="`chain-have-${entry.row.ticker}`">
									<div class="flex items-center gap-2">
										<span class="px-1 rounded-control border border-have text-have text-xs font-bold uppercase">
											{{ $t("production_chains.have.badge") }}
										</span>
										<!-- applies on blur or Enter, not while typing -->
										<span class="contents" @focusout="applyHave(entry.row)" @keydown.enter="applyHave(entry.row)">
											<PInputNumber
												:value="draftOf(entry.row)"
												decimals
												:min="0"
												size="sm"
												class="w-24"
												:placeholder="t('production_chains.have.all')"
												:aria-label="t('production_chains.have.amount', { ticker: entry.row.ticker })"
												@update:value="(v) => (drafts = { ...drafts, [entry.row.ticker]: v ?? null })" />
										</span>
										<span class="text-muted text-xs">{{ $t("production_chains.have.per_day") }}</span>
									</div>
									<span class="block text-xs text-muted pt-1">{{ usesText(entry.row) }}</span>
									<button
										v-if="empireBack(entry.row) !== null"
										type="button"
										class="text-xs text-link hover:underline cursor-pointer"
										@click="emit('have', entry.row.ticker, undefined)">
										{{
											$t("production_chains.have.use_empire", {
												empire: own.name,
												n: formatQty(empireBack(entry.row)!),
											})
										}}
									</button>
								</div>
								<template v-if="entry.row.source === 'make' && entry.row.recipe">
									<button
										v-if="entry.row.recipeCount > 1"
										type="button"
										class="text-left whitespace-nowrap px-2 py-1 rounded-control border border-line hover:bg-hover cursor-pointer"
										:aria-label="t('production_chains.table.choose_recipe', { ticker: entry.row.ticker })"
										aria-haspopup="dialog"
										@click="(e) => openPicker(entry.row.ticker, e)">
										<ChainRecipeText class="flex-wrap" :recipe="entry.row.recipe" :ticker="entry.row.ticker" />
										<span class="block text-xs text-muted whitespace-normal">
											{{ entry.row.recipe.building_ticker }} ·
											{{ hours(entry.row.recipe.time_ms) }} ·
											<span class="text-link">
												{{ $t("production_chains.table.recipes", { n: entry.row.recipeCount }) }} ▾
											</span>
										</span>
									</button>
									<div v-else class="px-2 py-1 whitespace-nowrap">
										<ChainRecipeText class="flex-wrap" :recipe="entry.row.recipe" :ticker="entry.row.ticker" />
										<span class="block text-xs text-muted whitespace-normal">
											{{ entry.row.recipe.building_ticker }} ·
											{{ hours(entry.row.recipe.time_ms) }}
										</span>
									</div>
								</template>
								<template v-else-if="entry.row.source === 'extract'">
									<span v-if="entry.row.pending" class="text-muted">
										{{ $t("production_chains.table.pending") }}
									</span>
									<button
										v-else-if="entry.row.site"
										type="button"
										class="text-left whitespace-nowrap px-2 py-1 rounded-control border border-line hover:bg-hover cursor-pointer"
										:aria-label="t('production_chains.table.choose_planet', { ticker: entry.row.ticker })"
										aria-haspopup="dialog"
										@click="emit('planet', entry.row.ticker)">
										<span class="block">
											{{
												entry.row.typicalSite
													? $t("production_chains.table.typical_planet")
													: entry.row.site.planetName
											}}
										</span>
										<span class="block text-xs text-muted">
											{{ entry.row.site.buildingTicker }} ·
											{{
												$t("production_chains.table.per_extractor", {
													rate: formatNumber(entry.row.site.dailyExtraction, 1),
													ticker: entry.row.ticker,
												})
											}}
											·
											<span class="text-link">
												{{
													$t("production_chains.table.planets", {
														n: extraction?.get(entry.row.ticker)?.sites.length ?? 0,
													})
												}}
												▾
											</span>
										</span>
									</button>
								</template>
								<span v-else-if="entry.row.source === 'buy'" class="text-muted">
									{{ $t("production_chains.table.bought_on", { cx: entry.row.exchange }) }}
								</span>
							</td>
							<td class="whitespace-nowrap">
								<template v-if="entry.row.buildingTicker && typeOf(entry.row)">
									<span class="font-mono">{{ entry.row.buildingTicker }}</span>
									<span class="pl-2 tabular-nums">{{ formatNumber(entry.row.buildings, 2) }}</span>
									<span class="block text-xs text-muted whitespace-normal">
										{{
											$t("production_chains.table.of_built", {
												n: typeOf(entry.row)!.built,
												building: entry.row.buildingTicker,
												pct: formatShare(typeOf(entry.row)!.exact / typeOf(entry.row)!.built),
											})
										}}
									</span>
								</template>
								<span v-else class="text-muted">–</span>
							</td>
							<td class="numeric tabular-nums whitespace-nowrap">
								<template v-if="entry.row.source !== 'buy' && entry.row.source !== 'have' && !entry.row.pending">
									{{ money(entry.row.unitCost) }}
								</template>
								<span v-else class="text-muted">–</span>
							</td>
							<td class="numeric tabular-nums whitespace-nowrap">
								<template v-if="entry.row.price">
									{{ money(entry.row.price) }}
								</template>
								<span v-else class="text-muted">–</span>
							</td>
							<td>
								<div class="flex flex-col items-start gap-1">
									<span
										v-if="entry.row.noFarming"
										class="px-2 rounded-control border text-xs whitespace-nowrap text-negative border-negative"
										:data-testid="`chain-no-farming-${entry.row.ticker}`">
										{{ $t("production_chains.table.no_farming") }}
									</span>
									<span
										v-if="entry.row.notOnPlanet"
										class="px-2 rounded-control border text-xs whitespace-nowrap text-warning border-warning"
										:data-testid="`chain-not-on-planet-${entry.row.ticker}`">
										{{ $t("production_chains.table.not_on_planet") }}
									</span>
									<span
										v-if="entry.row.source !== 'buy' && entry.row.source !== 'have' && !entry.row.pending"
										class="px-2 rounded-control border text-xs whitespace-nowrap"
										:class="verdict(entry.row).cls">
										{{ verdict(entry.row).text }}
									</span>
									<span
										v-if="entry.row.market"
										class="px-2 rounded-control border text-xs whitespace-nowrap"
										:class="shareChip(entry.row.market).cls">
										{{ shareChip(entry.row.market).text }}
									</span>
								</div>
							</td>
						</tr>
						<tr v-if="open.has(entry.row.ticker)">
							<td :colspan="COLUMNS" class="p-0">
								<ChainStepDetail :row="entry.row" :result="result" :own="own" />
							</td>
						</tr>
					</template>
				</template>
				<tr v-if="filter && !entries.length">
					<td :colspan="COLUMNS" class="text-muted">
						{{ $t("production_chains.filter.nothing") }}
					</td>
				</tr>
				<template v-if="byproducts.length">
					<tr>
						<td
							:colspan="COLUMNS"
							class="text-xs uppercase tracking-wide text-muted bg-surface-sunken">
							{{
								byproductMode === "cover"
									? $t("production_chains.table.byproducts_cover")
									: $t("production_chains.table.byproducts_sell")
							}}
						</td>
					</tr>
					<tr
						v-for="b in byproducts"
						:key="`b-${b.ticker}`"
						:data-testid="`chain-byproduct-${b.ticker}`">
						<td>
							<div class="flex items-center gap-2">
								<span class="w-5" />
								<MaterialTile :key="b.ticker" :ticker="b.ticker" />
								<span>{{ name(b.ticker) }}</span>
							</div>
						</td>
						<td class="numeric tabular-nums">{{ formatQty(b.produced) }}</td>
						<td colspan="5" class="text-muted">
							{{ $t("production_chains.table.byproduct_from", { list: b.from.join(", ") }) }}
							<template v-if="b.used > 1e-9">
								· {{ $t("production_chains.table.byproduct_used", { n: formatQty(b.used) }) }}
							</template>
							· {{ $t("production_chains.table.byproduct_sold", { n: formatQty(b.sold) }) }}
						</td>
						<td class="numeric tabular-nums">
							{{ b.sellPrice ? money(b.sellPrice) : "–" }}
						</td>
						<td>
							<span
								v-if="b.market"
								class="px-2 rounded-control border text-xs whitespace-nowrap"
								:class="shareChip(b.market).cls">
								{{ shareChip(b.market).text }}
							</span>
							<span
								v-else
								class="px-2 rounded-control border text-xs text-positive border-positive">
								{{ $t("production_chains.table.all_used") }}
							</span>
						</td>
					</tr>
				</template>
			</tbody>
		</PTable>
		<ChainRecipePicker
			v-if="picker"
			v-model:show="showPicker"
			:ticker="picker.ticker"
			:anchor="picker.anchor"
			:options="pickerOptions"
			:price="result.rows[picker.ticker]?.price ?? 0"
			@pick="(id) => emit('recipe', picker!.ticker, id)" />
	</div>
</template>
