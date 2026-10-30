<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useSortState } from "@/features/production_chain/useSortState";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanetPlots from "@/features/planet_search/components/PlanetPlots.vue";

	// Engine
	import {
		activeProgram,
		addMaterial,
		defaultFilter,
		planetJumps,
		SEARCH_CX,
	} from "@/features/planet_search/planetSearch.engine";
	import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
	import { createSearchContext } from "@/features/planet_search/planetSearchContext.util";
	import { encodeSearch } from "@/features/planet_search/planetSearchUrl.util";

	// Util
	import { formatMoney } from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		PlanetCOGCProgramType,
		PlanetSearchIndexEntry,
	} from "@/features/api/schemas/gameData.schemas";
	import type { PlanetSearchCX } from "@/features/planet_search/planetSearch.schemas";
	import type {
		IChainExtractionOptions,
		IChainExtractionSite,
	} from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import {
		PButton,
		PCheckbox,
		PInput,
		PInputNumber,
		PModal,
		PSegmented,
		PSelect,
		PTable,
	} from "@/ui";

	const {
		ticker,
		index,
		options,
		planetId,
		loading,
		error,
		unitCost,
		defaultCX,
	} = defineProps<{
		ticker: string;
		index: PlanetSearchIndexEntry[] | null;
		options: IChainExtractionOptions | undefined;
		/** the planet in use, undefined for the typical planet */
		planetId: string | undefined;
		loading: boolean;
		error: boolean;
		unitCost: (site: IChainExtractionSite) => number;
		/** the CX jumps are counted from at first */
		defaultCX: PlanetSearchCX;
	}>();

	const show = defineModel<boolean>("show", { required: true });

	const emit = defineEmits<{
		(e: "use", planetId: string | undefined): void;
	}>();

	const RE_COGC: PlanetCOGCProgramType = "ADVERTISING_RESOURCE_EXTRACTION";
	// always needed, so not listed
	const SURFACE_EXTRAS = ["MCG", "AEF"];

	type ISortKey =
		"name" | "rate" | "extractor" | "cost" | "extras" | "cogc" | "jumps";

	const extractor = ref<string>("all");
	const surface = ref<"any" | "rocky" | "gaseous">("any");
	const nearCX: Ref<PlanetSearchCX> = ref(defaultCX);
	const maxJumps: Ref<number | null> = ref(null);
	const noExtras = ref(false);
	const cogcOnly = ref(false);
	const lmOnly = ref(false);
	const text = ref("");
	const { sortKey, sortDir, sortBy, ariaSort } = useSortState<ISortKey>(
		"rate",
		(key) => key === "rate"
	);

	const now = Date.now();
	const entries = computed(
		() => new Map((index ?? []).map((p) => [p.planet_natural_id, p]))
	);
	const searchCtx = computed(() => createSearchContext(index ?? [], {}, now));

	const rows = computed(() =>
		(options?.sites ?? []).map((site) => {
			const entry = entries.value.get(site.planetId);
			const extras = entry
				? environmentExtras(entry)
						.map((e) => e.ticker)
						.filter((x) => !SURFACE_EXTRAS.includes(x))
				: [];
			const cogc = entry ? activeProgram(entry, now) : null;
			const jumps = entry
				? planetJumps(
						entry,
						{ kind: "cx", code: nearCX.value },
						searchCtx.value
					)
				: -1;
			return {
				site,
				entry,
				rocky: entry?.surface ?? false,
				lm: entry?.has_localmarket ?? false,
				extras,
				cogc,
				jumps,
				cost: unitCost(site),
			};
		})
	);

	const extractorCounts = computed(() => {
		const counts = new Map<string, number>();
		for (const r of rows.value)
			counts.set(
				r.site.buildingTicker,
				(counts.get(r.site.buildingTicker) ?? 0) + 1
			);
		return counts;
	});

	const extractorOptions = computed(() => [
		{ value: "all", label: t("production_chains.planet_picker.all") },
		...[...extractorCounts.value]
			.sort()
			.map(([b, n]) => ({ value: b, label: `${b} ${n}` })),
	]);
	const surfaceOptions = computed(() => [
		{
			value: "any" as const,
			label: t("production_chains.planet_picker.any"),
		},
		{
			value: "rocky" as const,
			label: t("production_chains.planet_picker.rocky"),
		},
		{
			value: "gaseous" as const,
			label: t("production_chains.planet_picker.gaseous"),
		},
	]);
	const cxOptions = SEARCH_CX.map((c) => ({ label: c, value: c }));

	const matched = computed(() => {
		const q = text.value.trim().toLowerCase();
		const list = rows.value.filter(
			(r) =>
				(extractor.value === "all" ||
					r.site.buildingTicker === extractor.value) &&
				(surface.value === "any" ||
					r.rocky === (surface.value === "rocky")) &&
				(maxJumps.value === null ||
					(r.jumps >= 0 && r.jumps <= maxJumps.value)) &&
				(!noExtras.value || !r.extras.length) &&
				(!cogcOnly.value || r.cogc === RE_COGC) &&
				(!lmOnly.value || r.lm) &&
				(!q ||
					r.site.planetName.toLowerCase().includes(q) ||
					r.site.planetId.toLowerCase().includes(q))
		);
		const value = (r: (typeof list)[number]): number | string => {
			switch (sortKey.value) {
				case "name":
					return r.site.planetName;
				case "rate":
					return r.site.dailyExtraction;
				case "extractor":
					return r.site.buildingTicker;
				case "cost":
					return r.cost;
				case "extras":
					return r.extras.length;
				case "cogc":
					return r.cogc ?? "";
				default:
					// unreachable last
					return r.jumps < 0 ? Infinity : r.jumps;
			}
		};
		return [...list].sort((a, b) => {
			const va = value(a);
			const vb = value(b);
			const c =
				typeof va === "number" && typeof vb === "number"
					? va - vb
					: String(va).localeCompare(String(vb));
			return c * sortDir.value;
		});
	});

	const maxRate = computed(() =>
		Math.max(1e-9, ...rows.value.map((r) => r.site.dailyExtraction))
	);

	const columns: { key: ISortKey; numeric?: boolean }[] = [
		{ key: "name" },
		{ key: "rate", numeric: true },
		{ key: "extractor" },
		{ key: "cost", numeric: true },
		{ key: "extras" },
		{ key: "cogc" },
		{ key: "jumps", numeric: true },
	];
	const columnLabel = (key: ISortKey) =>
		({
			name: t("production_chains.planet_picker.col_planet"),
			rate: t("production_chains.planet_picker.col_rate"),
			extractor: t("production_chains.planet_picker.col_extractor"),
			cost: t("production_chains.planet_picker.col_cost"),
			extras: t("production_chains.planet_picker.col_extras"),
			cogc: t("production_chains.planet_picker.col_cogc"),
			jumps: t("production_chains.planet_picker.col_jumps", {
				cx: nearCX.value,
			}),
		})[key];

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });

	const searchLink = computed(() => ({
		name: "search",
		query: encodeSearch({
			filter: {
				...addMaterial(defaultFilter(), 0, ticker),
				surface: ["rocky", "gaseous"],
			},
			sort: [],
			view: "list",
			pins: [],
		}),
	}));

	function use(id: string | undefined): void {
		emit("use", id);
		show.value = false;
	}
</script>

<template>
	<PModal
		v-model:show="show"
		:title="t('production_chains.planet_picker.title')"
		width="min(72rem, 100%)">
		<div class="flex flex-col gap-3" data-testid="chain-planet-picker">
			<div class="flex items-center gap-2">
				<MaterialTile :key="ticker" :ticker="ticker" />
				<span class="text-muted">
					{{
						$t("production_chains.planet_picker.count", {
							total: rows.length,
							ticker,
							n: matched.length,
						})
					}}
				</span>
			</div>
			<p v-if="loading" class="text-muted">
				{{ $t("production_chains.planet_picker.loading") }}
			</p>
			<p v-else-if="error" class="text-negative">
				{{ $t("production_chains.planet_picker.error") }}
			</p>
			<template v-else>
				<div class="flex flex-wrap items-end gap-x-6 gap-y-3">
					<div>
						<div class="text-xs uppercase text-muted pb-1">
							{{
								$t("production_chains.planet_picker.extractor")
							}}
						</div>
						<PSegmented
							v-model:value="extractor"
							:options="extractorOptions"
							size="sm"
							:label="
								t('production_chains.planet_picker.extractor')
							" />
					</div>
					<div>
						<div class="text-xs uppercase text-muted pb-1">
							{{ $t("production_chains.planet_picker.surface") }}
						</div>
						<PSegmented
							v-model:value="surface"
							:options="surfaceOptions"
							size="sm"
							:label="
								t('production_chains.planet_picker.surface')
							" />
					</div>
					<div>
						<div class="text-xs uppercase text-muted pb-1">
							{{ $t("production_chains.planet_picker.near") }}
						</div>
						<div class="flex items-center gap-2">
							<PSelect
								v-model:value="nearCX"
								:options="cxOptions"
								size="sm"
								class="w-24"
								:aria-label="
									t('production_chains.planet_picker.near')
								" />
							<span class="text-muted">{{
								$t("production_chains.planet_picker.within")
							}}</span>
							<PInputNumber
								v-model:value="maxJumps"
								:min="0"
								size="sm"
								class="w-16"
								:aria-label="
									t('production_chains.planet_picker.jumps')
								" />
							<span class="text-muted">{{
								$t("production_chains.planet_picker.jumps")
							}}</span>
						</div>
					</div>
					<div>
						<div class="text-xs uppercase text-muted pb-1">
							{{ $t("production_chains.planet_picker.only") }}
						</div>
						<div class="flex flex-wrap gap-3">
							<PCheckbox v-model:checked="noExtras">{{
								$t("production_chains.planet_picker.no_extras")
							}}</PCheckbox>
							<PCheckbox v-model:checked="cogcOnly">{{
								$t("production_chains.planet_picker.cogc")
							}}</PCheckbox>
							<PCheckbox v-model:checked="lmOnly">{{
								$t(
									"production_chains.planet_picker.local_market"
								)
							}}</PCheckbox>
						</div>
					</div>
					<div>
						<div class="text-xs uppercase text-muted pb-1">
							{{ $t("production_chains.planet_picker.planet") }}
						</div>
						<PInput
							v-model:value="text"
							size="sm"
							class="w-48"
							:placeholder="
								t(
									'production_chains.planet_picker.name_placeholder'
								)
							"
							:aria-label="
								t('production_chains.planet_picker.planet')
							" />
					</div>
				</div>
				<PTable>
					<thead>
						<tr>
							<th
								v-for="c in columns"
								:key="c.key"
								:class="{ numeric: c.numeric }"
								:aria-sort="ariaSort(c.key)">
								<button
									type="button"
									class="cursor-pointer hover:underline whitespace-nowrap"
									:title="
										t(
											'production_chains.planet_picker.sort_by',
											{ column: columnLabel(c.key) }
										)
									"
									@click="sortBy(c.key)">
									{{ columnLabel(c.key) }}
									<span
										v-if="sortKey === c.key"
										aria-hidden="true">
										{{ sortDir === 1 ? "↑" : "↓" }}
									</span>
								</button>
							</th>
							<th>
								<span class="sr-only">{{
									$t("production_chains.planet_picker.use")
								}}</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-if="options"
							class="bg-surface-sunken"
							data-testid="chain-planet-typical">
							<td>
								<span class="font-bold">{{
									$t(
										"production_chains.planet_picker.typical"
									)
								}}</span>
								<span class="text-xs text-muted pl-1">
									{{
										$t(
											"production_chains.planet_picker.typical_note",
											{
												planet: options.typical
													.planetName,
											}
										)
									}}
								</span>
							</td>
							<td class="numeric tabular-nums">
								{{
									formatNumber(
										options.typical.dailyExtraction,
										1
									)
								}}
							</td>
							<td class="font-mono">
								{{ options.typical.buildingTicker }}
							</td>
							<td class="numeric tabular-nums">
								{{ money(unitCost(options.typical)) }}
							</td>
							<td colspan="3" class="text-xs text-muted">
								{{
									$t(
										"production_chains.planet_picker.typical_hint"
									)
								}}
							</td>
							<td>
								<PButton
									size="sm"
									:type="
										planetId === undefined
											? 'primary'
											: 'secondary'
									"
									:aria-current="
										planetId === undefined
											? 'true'
											: undefined
									"
									@click="use(undefined)">
									{{
										planetId === undefined
											? $t(
													"production_chains.planet_picker.in_use"
												)
											: $t(
													"production_chains.planet_picker.use"
												)
									}}
								</PButton>
							</td>
						</tr>
						<tr
							v-for="r in matched"
							:key="r.site.planetId"
							data-testid="chain-planet-row">
							<td class="whitespace-nowrap">
								{{ r.site.planetName }}
								<span class="text-xs text-muted"
									>({{ r.site.planetId }})</span
								>
								<span
									v-if="r.lm"
									class="ml-1 px-1 rounded-control border border-line text-xs"
									:title="
										t(
											'production_chains.planet_picker.lm_title'
										)
									">
									{{
										$t("production_chains.planet_picker.lm")
									}}
								</span>
								<PlanetPlots :planet="r.entry" class="ml-1" />
							</td>
							<td class="numeric tabular-nums">
								<span class="inline-flex items-center gap-2">
									<span
										class="w-16 h-1.5 rounded-control bg-surface-sunken overflow-hidden">
										<span
											class="block h-full bg-prunplanner"
											:style="{
												width: `${(r.site.dailyExtraction / maxRate) * 100}%`,
											}" />
									</span>
									{{
										formatNumber(r.site.dailyExtraction, 1)
									}}
								</span>
							</td>
							<td class="font-mono">
								{{ r.site.buildingTicker }}
							</td>
							<td class="numeric tabular-nums">
								{{ money(r.cost) }}
							</td>
							<td>
								<span class="flex gap-1">
									<MaterialTile
										v-for="x in r.extras"
										:key="x"
										:ticker="x" />
									<span
										v-if="!r.extras.length"
										class="text-muted"
										>–</span
									>
								</span>
							</td>
							<td class="text-xs">
								<template v-if="r.cogc">{{
									$t(`game.cogc_program.${r.cogc}`)
								}}</template>
								<span v-else class="text-muted">–</span>
							</td>
							<td class="numeric tabular-nums">
								{{ r.jumps >= 0 ? r.jumps : "–" }}
							</td>
							<td>
								<PButton
									size="sm"
									:type="
										planetId === r.site.planetId
											? 'primary'
											: 'secondary'
									"
									:aria-current="
										planetId === r.site.planetId
											? 'true'
											: undefined
									"
									@click="use(r.site.planetId)">
									{{
										planetId === r.site.planetId
											? $t(
													"production_chains.planet_picker.in_use"
												)
											: $t(
													"production_chains.planet_picker.use"
												)
									}}
								</PButton>
							</td>
						</tr>
						<tr v-if="!matched.length">
							<td colspan="8" class="text-muted">
								{{ $t("production_chains.planet_picker.none") }}
							</td>
						</tr>
					</tbody>
				</PTable>
				<div
					class="flex flex-wrap justify-between gap-3 text-xs text-muted">
					<span>{{
						$t("production_chains.planet_picker.footer")
					}}</span>
					<RouterLink
						:to="searchLink"
						class="text-link hover:underline">
						{{ $t("production_chains.planet_picker.open_search") }}
					</RouterLink>
				</div>
			</template>
		</div>
	</PModal>
</template>
