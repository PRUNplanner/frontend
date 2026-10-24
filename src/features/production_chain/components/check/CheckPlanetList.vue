<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Engine
	import {
		planetJumps,
		SEARCH_CX,
	} from "@/features/planet_search/planetSearch.engine";
	import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
	import { createSearchContext } from "@/features/planet_search/planetSearchContext.util";

	// Util
	import {
		money,
		moveCount,
		optionChips,
		optionDimmed,
		optionWhy,
		signedMoney,
	} from "@/features/production_chain/chainCheck.util";
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
		ICheckBase,
		ICheckLocationFinding,
		ICheckOption,
	} from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import {
		PButton,
		PCheckbox,
		PInput,
		PModal,
		PSelect,
		PTable,
		PTag,
	} from "@/ui";

	const {
		finding: f,
		base,
		nameOf,
		payback,
		index,
		now,
		defaultCX,
	} = defineProps<{
		finding: ICheckLocationFinding;
		base: ICheckBase;
		nameOf: (id: string) => string;
		/** moves pay back within, days */
		payback: number;
		index: PlanetSearchIndexEntry[];
		/** epoch ms for the jump context */
		now: number;
		defaultCX: PlanetSearchCX;
	}>();

	const show = defineModel<boolean>("show", { required: true });

	const emit = defineEmits<{
		(e: "use", planetId: string): void;
	}>();

	// always needed, so not listed
	const SURFACE_EXTRAS = ["MCG", "AEF"];
	const FARMS = ["FRM", "ORC"];
	const MAX_ROWS = 200;

	type ISortKey = "gain" | "payback" | "jumps" | "plots" | "name";

	const text = ref("");
	const settle = ref(false);
	const payOnly = ref(false);
	const programOnly = ref(false);
	const noExtras = ref(false);
	const mine = ref(false);
	const nearCX: Ref<PlanetSearchCX> = ref(defaultCX);
	const maxJumps: Ref<number | null> = ref(null);
	const sortKey = ref<ISortKey>("gain");
	const sortDir = ref<1 | -1>(-1);

	const searchCtx = computed(() => createSearchContext(index, {}, now));
	const jumpsOf = (p: PlanetSearchIndexEntry) =>
		planetJumps(p, { kind: "cx", code: nearCX.value }, searchCtx.value);

	const rows = computed(() =>
		f.options.map((o, i) => ({
			o,
			rank: i + 1,
			name: planetDisplayName(o.planet.planet_natural_id, o.planet.planet_name),
			extras: environmentExtras(o.planet)
				.map((e) => e.ticker)
				.filter((x) => !SURFACE_EXTRAS.includes(x)),
			jumps: jumpsOf(o.planet),
		}))
	);
	type IRow = (typeof rows.value)[number];

	const matched = computed(() => {
		const q = text.value.trim().toLowerCase();
		const list = rows.value.filter(
			(r) =>
				(!q ||
					r.name.toLowerCase().includes(q) ||
					r.o.planet.planet_natural_id.toLowerCase().includes(q)) &&
				(!settle.value || (r.o.fits && !r.o.full)) &&
				(!payOnly.value || !r.o.slow) &&
				(!programOnly.value || r.o.runsProgram) &&
				(!noExtras.value || !r.extras.length) &&
				(!mine.value || r.o.own !== null) &&
				(maxJumps.value === null ||
					(r.jumps >= 0 && r.jumps <= maxJumps.value))
		);
		const value = (r: IRow): number | string => {
			switch (sortKey.value) {
				case "name":
					return r.name;
				case "payback":
					return r.o.payback ?? Infinity;
				case "jumps":
					return r.jumps < 0 ? Infinity : r.jumps;
				case "plots":
					return r.o.own ? 1e9 : (r.o.plots?.free ?? -1);
				default:
					return r.o.gain;
			}
		};
		return [...list].sort((a, b) => {
			const va = value(a);
			const vb = value(b);
			const c =
				typeof va === "number" && typeof vb === "number"
					? va === vb
						? 0
						: va - vb
					: String(va).localeCompare(String(vb));
			return c * sortDir.value || a.rank - b.rank;
		});
	});
	const shown = computed(() => matched.value.slice(0, MAX_ROWS));

	function sortBy(key: ISortKey): void {
		if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1;
		else {
			sortKey.value = key;
			sortDir.value = key === "gain" || key === "plots" ? -1 : 1;
		}
	}
	const ariaSort = (key: ISortKey) =>
		sortKey.value === key
			? sortDir.value === 1
				? "ascending"
				: "descending"
			: undefined;

	const COLUMNS: { key: ISortKey | "rank" | "factor" | "cost" | "extras"; sort?: ISortKey; numeric?: boolean }[] = [
		{ key: "rank", numeric: true },
		{ key: "name", sort: "name" },
		{ key: "factor", numeric: true },
		{ key: "gain", sort: "gain", numeric: true },
		{ key: "cost", sort: "payback", numeric: true },
		{ key: "extras" },
		{ key: "jumps", sort: "jumps", numeric: true },
		{ key: "plots", sort: "plots" },
	];
	const columnLabel = (key: string) =>
		key === "name"
			? t("production_chains.check.planets.col_planet")
			: t(`production_chains.check.planets.col_${key}`);

	const programName = computed(() =>
		f.expertise ? t(`game.expertise.${f.expertise}`) : ""
	);

	function factorText(o: ICheckOption): string {
		if (o.rate !== null)
			return `${formatNumber(o.rate, 1)} / ${f.step.building}`;
		if (FARMS.includes(f.step.building))
			return t("production_chains.bases.fertility", {
				pct: formatShare(o.planet.fertility),
			});
		return o.running === "---" ? "—" : t(cogcKey(o.running));
	}

	const cxOptions = SEARCH_CX.map((c) => ({ label: c, value: c }));
	const jumpOptions = computed(() => [
		{ label: t("production_chains.check.planets.jumps_any"), value: -1 },
		...[2, 5, 10, 15, 20].map((n) => ({
			label: t("production_chains.check.planets.jumps_max", { n }),
			value: n,
		})),
	]);

	function use(o: ICheckOption): void {
		emit("use", o.planet.planet_natural_id);
		show.value = false;
	}
</script>

<template>
	<PModal
		v-model:show="show"
		:title="
			t('production_chains.check.planets.title', {
				count: moveCount(f.step),
				building: f.step.building,
				ticker: f.step.ticker,
			})
		"
		width="min(80rem, 100%)">
		<div class="flex flex-col gap-3" data-testid="check-planet-list">
			<p class="text-muted text-sm">
				{{ $t("production_chains.check.planets.intro") }}
			</p>
			<div class="flex flex-wrap items-end gap-x-6 gap-y-3">
				<div>
					<div class="text-xs uppercase text-muted pb-1">
						{{ $t("production_chains.check.planets.search") }}
					</div>
					<PInput
						v-model:value="text"
						size="sm"
						class="w-48"
						:placeholder="t('production_chains.check.planets.search_placeholder')"
						:aria-label="t('production_chains.check.planets.search')"
						data-testid="check-planets-search" />
				</div>
				<div>
					<div class="text-xs uppercase text-muted pb-1">
						{{ $t("production_chains.check.planets.jumps", { cx: nearCX }) }}
					</div>
					<div class="flex items-center gap-2">
						<PSelect
							v-model:value="nearCX"
							:options="cxOptions"
							size="sm"
							class="w-24"
							:aria-label="t('production_chains.planet_picker.near')" />
						<PSelect
							:value="maxJumps ?? -1"
							:options="jumpOptions"
							size="sm"
							class="w-28"
							:aria-label="t('production_chains.check.planets.jumps', { cx: nearCX })"
							data-testid="check-planets-jumps"
							@update:value="(v) => (maxJumps = v === -1 || v === null ? null : Number(v))" />
					</div>
				</div>
				<div>
					<div class="text-xs uppercase text-muted pb-1">
						{{ $t("production_chains.check.planets.only") }}
					</div>
					<div class="flex flex-wrap gap-x-4 gap-y-2">
						<PCheckbox v-model:checked="settle" data-testid="check-planets-settle">
							{{ $t("production_chains.check.planets.settle") }}
						</PCheckbox>
						<PCheckbox v-model:checked="payOnly" data-testid="check-planets-pay">
							{{ $t("production_chains.check.planets.pay", { n: payback }) }}
						</PCheckbox>
						<PCheckbox
							v-if="f.expertise"
							v-model:checked="programOnly"
							data-testid="check-planets-program">
							{{ $t("production_chains.check.planets.program", { program: programName }) }}
						</PCheckbox>
						<PCheckbox v-model:checked="noExtras" data-testid="check-planets-extras">
							{{ $t("production_chains.check.planets.no_extras") }}
						</PCheckbox>
						<PCheckbox v-model:checked="mine" data-testid="check-planets-mine">
							{{ $t("production_chains.check.planets.mine") }}
						</PCheckbox>
					</div>
				</div>
			</div>

			<div class="overflow-x-auto">
				<PTable>
					<thead>
						<tr>
							<th
								v-for="c in COLUMNS"
								:key="c.key"
								:class="{ numeric: c.numeric }"
								:aria-sort="c.sort ? ariaSort(c.sort) : undefined">
								<button
									v-if="c.sort"
									type="button"
									class="min-h-6 cursor-pointer hover:underline whitespace-nowrap"
									:title="t('production_chains.check.planets.sort_by', { col: columnLabel(c.key) })"
									:data-testid="`check-planets-sort-${c.sort}`"
									@click="sortBy(c.sort)">
									{{ columnLabel(c.key) }}
									<span v-if="sortKey === c.sort" aria-hidden="true">
										{{ sortDir === 1 ? "↑" : "↓" }}
									</span>
								</button>
								<template v-else>{{ columnLabel(c.key) }}</template>
							</th>
							<th>
								<span class="sr-only">{{ $t("production_chains.check.planets.use") }}</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="r in shown"
							:key="r.o.planet.planet_natural_id"
							:class="{
								'opacity-60': optionDimmed(r.o),
								'bg-hover': r.o === f.option,
							}"
							data-testid="check-planets-row">
							<td class="numeric text-muted">{{ r.rank }}</td>
							<td>
								<span class="block">
									<span
										v-if="r.o.own"
										class="px-1 rounded-control border border-line font-mono font-bold text-xs">
										{{ r.o.own }}
									</span>
									<span data-testid="check-planets-name">{{ r.name }}</span>
								</span>
								<span class="block text-xs text-muted">
									{{
										[
											r.o.own
												? nameOf(r.o.own)
												: t("production_chains.check.planets.new_base"),
											optionWhy(t, f, r.o, base.planet, base.running),
										]
											.filter(Boolean)
											.join(" · ")
									}}
								</span>
							</td>
							<td class="numeric whitespace-nowrap">{{ factorText(r.o) }}</td>
							<td class="numeric whitespace-nowrap">
								<span class="block text-positive">+{{ formatShare(r.o.ratio - 1) }}</span>
								<span class="block text-xs text-muted">{{ signedMoney(t, r.o.gain) }}</span>
							</td>
							<td class="numeric whitespace-nowrap">
								<span class="block">{{ money(t, r.o.construction) }}</span>
								<span class="block text-xs text-muted">{{
									r.o.payback === null
										? "—"
										: t("production_chains.check.planets.payback", {
												n: formatNumber(r.o.payback, 0),
											})
								}}</span>
							</td>
							<td>
								<span v-if="r.extras.length" class="flex flex-wrap gap-1">
									<MaterialTile v-for="x in r.extras" :key="x" :ticker="x" />
								</span>
								<span v-else class="text-muted">—</span>
							</td>
							<td class="numeric">{{ r.jumps >= 0 ? r.jumps : "—" }}</td>
							<td>
								<span class="flex flex-wrap gap-1">
									<PTag
										v-for="c in optionChips(t, f, r.o, payback)"
										:key="c.label"
										size="sm"
										:type="c.type"
										:title="c.title">
										{{ c.label }}
									</PTag>
								</span>
							</td>
							<td class="text-right">
								<span v-if="r.o === f.option && f.picked" class="text-muted text-xs">
									{{ $t("production_chains.check.planets.in_use") }}
								</span>
								<PButton
									v-else
									size="sm"
									type="secondary"
									:aria-label="`${t('production_chains.check.planets.use')} ${r.name}`"
									data-testid="check-planets-use"
									@click="use(r.o)">
									{{ $t("production_chains.check.planets.use") }}
								</PButton>
							</td>
						</tr>
					</tbody>
				</PTable>
			</div>
			<div class="flex flex-wrap justify-between gap-2 text-sm text-muted">
				<span data-testid="check-planets-count">
					{{
						$t("production_chains.check.planets.count", {
							n: formatNumber(matched.length, 0),
							total: formatNumber(rows.length, 0),
						})
					}}
					<template v-if="matched.length > MAX_ROWS">
						· {{ $t("production_chains.check.planets.cut", { n: MAX_ROWS }) }}
					</template>
				</span>
				<span>{{ $t("production_chains.check.planets.footer") }}</span>
			</div>
		</div>
	</PModal>
</template>
