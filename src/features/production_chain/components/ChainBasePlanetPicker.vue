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
		cogcFits,
		rankPlanets,
	} from "@/features/production_chain/engine/chainBases";
	import { runningCOGC } from "@/features/production_chain/engine/chainSolver";
	import {
		planetJumps,
		SEARCH_CX,
	} from "@/features/planet_search/planetSearch.engine";
	import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
	import { createSearchContext } from "@/features/planet_search/planetSearchContext.util";

	// Util
	import {
		cogcKey,
		formatShare,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import type { PlanetSearchCX } from "@/features/planet_search/planetSearch.schemas";
	import type {
		IChainContext,
		IChainInput,
		IChainResult,
	} from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import {
		PButton,
		PCheckbox,
		PInput,
		PInputNumber,
		PModal,
		PSelect,
		PTable,
	} from "@/ui";

	const {
		baseId,
		result,
		input,
		ctx,
		index,
		loading,
		error,
		defaultCX,
		myPlanets,
	} = defineProps<{
		baseId: string;
		result: IChainResult;
		input: IChainInput;
		ctx: IChainContext;
		index: PlanetSearchIndexEntry[] | null;
		loading: boolean;
		error: boolean;
		/** the CX jumps are counted from at first */
		defaultCX: PlanetSearchCX;
		/** planets with one of the user's plans */
		myPlanets: ReadonlySet<string>;
	}>();

	const show = defineModel<boolean>("show", { required: true });

	const emit = defineEmits<{
		(e: "use", planetId: string | null): void;
	}>();

	// always needed, so not listed
	const SURFACE_EXTRAS = ["MCG", "AEF"];
	const FARMS = ["FRM", "ORC"];
	// a long list is cut, the filters narrow it down
	const MAX_ROWS = 100;

	type ISortKey =
		"name" | "built" | "area" | "cogc" | "fert" | "extras" | "jumps";

	const base = computed(
		() => result.bases.find((b) => b.id === baseId) ?? result.bases[0]
	);
	const name = computed(
		() =>
			base.value.name ||
			t("production_chains.bases.unnamed", { id: base.value.id })
	);
	const steps = computed(() =>
		base.value.materials.map((m) => result.rows[m])
	);
	const extracts = computed(() =>
		steps.value.filter((r) => r.source === "extract")
	);
	const farms = computed(() =>
		steps.value.some((r) => FARMS.includes(r.buildingTicker ?? ""))
	);
	const tickers = computed(() => [
		...new Set(steps.value.map((r) => r.buildingTicker ?? "")),
	]);

	const needs = ref(true);
	const cogcOnly = ref(false);
	const fertileOnly = ref(false);
	const noExtras = ref(false);
	const lmOnly = ref(false);
	const mineOnly = ref(false);
	const nearCX: Ref<PlanetSearchCX> = ref(defaultCX);
	const maxJumps: Ref<number | null> = ref(null);
	const text = ref("");
	const { sortKey, sortDir, sortBy, ariaSort } = useSortState<ISortKey>(
		"built",
		(key) => key === "fert"
	);

	const searchCtx = computed(() =>
		createSearchContext(index ?? [], {}, ctx.now)
	);

	const rows = computed(() => {
		if (!show.value || !index || !ctx.extraction) return [];
		return rankPlanets(result, input, ctx, base.value.id, index).map(
			(fit) => {
				const p = fit.planet;
				const running = runningCOGC(p, ctx.now);
				return {
					...fit,
					id: p.planet_natural_id,
					name: planetDisplayName(p.planet_natural_id, p.planet_name),
					lm: p.has_localmarket,
					mine: myPlanets.has(p.planet_natural_id),
					running,
					fits: cogcFits(ctx, running, tickers.value),
					fertility: p.fertility,
					extras: environmentExtras(p)
						.map((e) => e.ticker)
						.filter((x) => !SURFACE_EXTRAS.includes(x)),
				};
			}
		);
	});

	// apart from the ranking, so another CX doesn't re-solve every planet
	const jumps = computed(
		() =>
			new Map(
				(index ?? []).map((p) => [
					p.planet_natural_id,
					planetJumps(
						p,
						{ kind: "cx", code: nearCX.value },
						searchCtx.value
					),
				])
			)
	);
	const jumpsOf = (id: string) => jumps.value.get(id) ?? -1;

	type IRow = (typeof rows.value)[number];

	const matched = computed(() => {
		const q = text.value.trim().toLowerCase();
		const list = rows.value.filter(
			(r) =>
				(!needs.value || (!r.missing.length && !r.noFarming)) &&
				(!cogcOnly.value || r.fits) &&
				(!fertileOnly.value || !farms.value || r.fertility > 0) &&
				(!noExtras.value || !r.extras.length) &&
				(!lmOnly.value || r.lm) &&
				(!mineOnly.value || r.mine) &&
				(maxJumps.value === null ||
					(jumpsOf(r.id) >= 0 && jumpsOf(r.id) <= maxJumps.value)) &&
				(!q ||
					r.name.toLowerCase().includes(q) ||
					r.id.toLowerCase().includes(q))
		);
		const value = (r: IRow): number | string => {
			switch (sortKey.value) {
				case "name":
					return r.name;
				case "built":
					return r.built;
				case "area":
					return r.area;
				case "cogc":
					return r.running === "---" ? "" : t(cogcKey(r.running));
				case "fert":
					return r.fertility;
				case "extras":
					return r.extras.length;
				default:
					// unreachable last
					return jumpsOf(r.id) < 0 ? Infinity : jumpsOf(r.id);
			}
		};
		return [...list].sort((a, b) => {
			const va = value(a);
			const vb = value(b);
			const c =
				typeof va === "number" && typeof vb === "number"
					? va - vb
					: String(va).localeCompare(String(vb));
			// buildings, then area
			return c * sortDir.value || a.built - b.built || a.area - b.area;
		});
	});
	const shown = computed(() => matched.value.slice(0, MAX_ROWS));

	const columns = computed(() => {
		const list: { key: ISortKey; numeric?: boolean }[] = [
			{ key: "name" },
			{ key: "built", numeric: true },
			{ key: "area", numeric: true },
			{ key: "cogc" },
		];
		if (farms.value) list.push({ key: "fert", numeric: true });
		list.push({ key: "extras" }, { key: "jumps", numeric: true });
		return list;
	});
	const columnLabel = (key: ISortKey) =>
		key === "jumps"
			? t("production_chains.base_picker.col_jumps", { cx: nearCX.value })
			: t(`production_chains.base_picker.col_${key}`);

	const cxOptions = SEARCH_CX.map((c) => ({ label: c, value: c }));

	function use(id: string | null): void {
		emit("use", id);
		show.value = false;
	}
</script>

<template>
	<PModal
		v-model:show="show"
		:title="t('production_chains.base_picker.title', { name })"
		width="min(72rem, 100%)">
		<div class="flex flex-col gap-3" data-testid="chain-base-planet-picker">
			<p class="text-muted">
				{{
					$t("production_chains.base_picker.count", {
						n: matched.length,
						total: rows.length,
						built: base.built,
						area: formatNumber(base.area, 0),
					})
				}}
			</p>
			<p v-if="loading" class="text-muted">
				{{ $t("production_chains.planet_picker.loading") }}
			</p>
			<p v-else-if="error" class="text-negative">
				{{ $t("production_chains.planet_picker.error") }}
			</p>
			<template v-else>
				<div>
					<div class="text-xs uppercase text-muted pb-1">
						{{ $t("production_chains.base_picker.only") }}
					</div>
					<div class="flex flex-wrap gap-x-4 gap-y-2">
						<PCheckbox
							v-if="extracts.length || farms"
							v-model:checked="needs"
							data-testid="chain-base-picker-needs">
							{{ $t("production_chains.base_picker.needs") }}
						</PCheckbox>
						<PCheckbox v-model:checked="cogcOnly">
{{
							$t("production_chains.base_picker.cogc")
						}}
</PCheckbox>
						<PCheckbox v-if="farms" v-model:checked="fertileOnly">
{{
							$t("production_chains.base_picker.fertile")
						}}
</PCheckbox>
						<PCheckbox v-model:checked="noExtras">
{{
							$t("production_chains.planet_picker.no_extras")
						}}
</PCheckbox>
						<PCheckbox v-model:checked="lmOnly">
{{
							$t("production_chains.planet_picker.local_market")
						}}
</PCheckbox>
						<PCheckbox
							v-model:checked="mineOnly"
							data-testid="chain-base-picker-mine">
							{{ $t("production_chains.base_picker.mine") }}
						</PCheckbox>
					</div>
				</div>
				<div class="flex flex-wrap items-end gap-x-6 gap-y-3">
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
				<div class="overflow-x-auto">
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
										class="min-h-6 cursor-pointer hover:underline whitespace-nowrap"
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
										$t(
											"production_chains.planet_picker.use"
										)
									}}</span>
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="r in shown"
								:key="r.id"
								data-testid="chain-base-picker-row">
								<td class="whitespace-nowrap">
									{{ r.name }}
									<span
										v-if="r.mine"
										class="ml-1 px-1 rounded-control border border-link text-link text-xs uppercase"
										data-testid="chain-your-plan">
										{{
											$t(
												"production_chains.base_picker.your_plan"
											)
										}}
									</span>
									<PlanetPlots
										:planet="r.planet"
										class="ml-1" />
									<span
										v-if="r.lm"
										class="ml-1 px-1 rounded-control border border-line text-xs"
										:title="
											t(
												'production_chains.planet_picker.lm_title'
											)
										">
										{{
											$t(
												"production_chains.planet_picker.lm"
											)
										}}
									</span>
									<span
										v-for="m in r.missing"
										:key="m"
										class="ml-1 px-1 rounded-control border border-warning text-warning text-xs">
										{{
											$t(
												"production_chains.base_picker.no_resource",
												{ ticker: m }
											)
										}}
									</span>
									<span
										v-if="r.noFarming"
										class="ml-1 px-1 rounded-control border border-negative text-negative text-xs">
										{{
											$t(
												"production_chains.table.no_farming"
											)
										}}
									</span>
								</td>
								<td
									class="numeric tabular-nums whitespace-nowrap">
									{{ r.built }}
									<span
										v-if="
											r.built !== base.built &&
											base.materials.length
										"
										class="text-xs"
										:class="
											r.built < base.built
												? 'text-positive'
												: 'text-negative'
										">
										{{ r.built < base.built ? "−" : "+"
										}}{{ Math.abs(r.built - base.built) }}
									</span>
								</td>
								<td class="numeric tabular-nums">
									{{ formatNumber(r.area, 0) }}
								</td>
								<td class="text-xs">
									<span
										v-if="r.running !== '---'"
										class="px-1 rounded-control border"
										:class="
											r.fits
												? 'border-positive text-positive'
												: 'border-line'
										">
										{{ $t(cogcKey(r.running)) }}
									</span>
									<span v-else class="text-muted">–</span>
								</td>
								<td v-if="farms" class="numeric tabular-nums">
									{{
										r.fertility > -1
											? formatShare(
													(r.fertility * 10) / 33
												)
											: "–"
									}}
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
								<td class="numeric tabular-nums">
									{{
										jumpsOf(r.id) >= 0 ? jumpsOf(r.id) : "–"
									}}
								</td>
								<td>
									<PButton
										size="sm"
										:type="
											base.planet?.planet_natural_id ===
											r.id
												? 'primary'
												: 'secondary'
										"
										:aria-current="
											base.planet?.planet_natural_id ===
											r.id
												? 'true'
												: undefined
										"
										@click="use(r.id)">
										{{
											base.planet?.planet_natural_id ===
											r.id
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
								<td
									:colspan="columns.length + 1"
									class="text-muted">
									{{
										$t(
											"production_chains.planet_picker.none"
										)
									}}
								</td>
							</tr>
						</tbody>
					</PTable>
				</div>
				<div
					class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
					<span>
						<template v-if="matched.length > shown.length">
							{{
								$t("production_chains.base_picker.cut", {
									n: shown.length,
								})
							}}
						</template>
						{{ $t("production_chains.base_picker.footer") }}
					</span>
					<PButton
						size="sm"
						type="secondary"
						data-testid="chain-base-no-planet"
						@click="use(null)">
						{{ $t("production_chains.base_picker.no_planet") }}
					</PButton>
				</div>
			</template>
		</div>
	</PModal>
</template>
