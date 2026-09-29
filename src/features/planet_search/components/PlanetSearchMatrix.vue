<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useIncrementalRows } from "@/features/planet_search/useIncrementalRows";
	import { useMaterialData } from "@/database/services/useMaterialData";

	// Engine
	import {
		activeProgram,
		fertilityPercent,
		filteredMaterials,
		foundMaterials,
		planetInfrastructure,
		planetJumps,
		SEARCH_CX,
	} from "@/features/planet_search/planetSearch.engine";
	import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
	import { formatNumber } from "@/util/numbers";

	// Components
	import PlanetSearchRowActions from "@/features/planet_search/components/PlanetSearchRowActions.vue";
	import PlanetSearchSortHeader from "@/features/planet_search/components/PlanetSearchSortHeader.vue";

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import type {
		PlanetSearchColumn,
		PlanetSearchFilter,
		PlanetSearchReference,
	} from "@/features/planet_search/planetSearch.schemas";
	import type {
		IPlanetSearchContext,
		IPlanetSearchSort,
	} from "@/features/planet_search/planetSearch.types";

	const props = defineProps<{
		planets: PlanetSearchIndexEntry[];
		filter: PlanetSearchFilter;
		ctx: IPlanetSearchContext;
		maxDaily: Record<string, number>;
		sorts: IPlanetSearchSort[];
		pins: string[];
		showPins: boolean;
		hiddenColumns: PlanetSearchColumn[];
		hiddenMaterials: string[];
		refName: (ref: PlanetSearchReference) => string;
	}>();

	const emit = defineEmits<{
		(e: "sort", value: IPlanetSearchSort[]): void;
		(e: "pin", planetNaturalId: string): void;
	}>();

	const { getMaterialClass } = useMaterialData();
	const { visible, sentinel } = useIncrementalRows(() => props.planets);

	const show = (c: PlanetSearchColumn) => !props.hiddenColumns.includes(c);
	const found = computed(() => foundMaterials(props.planets));
	const filtered = computed(() => [...filteredMaterials(props.filter)].sort());

	// filtered materials first, then the other found ones; both alphabetical
	const columns = computed(() => {
		const isFiltered = new Set(filtered.value);
		const others = Object.keys(found.value)
			.filter((m) => !isFiltered.has(m) && !props.hiddenMaterials.includes(m))
			.sort();
		return [
			...filtered.value.map((m) => ({ ticker: m, filtered: true, divider: false })),
			...others.map((m) => ({ ticker: m, filtered: false, divider: false })),
		].map((c, i, all) => ({
			...c,
			// 2 px divider after the last filtered material, if others follow
			divider:
				c.filtered && i === filtered.value.length - 1 && i < all.length - 1,
		}));
	});

	const planRefs = computed(() =>
		props.filter.references.filter((r) => r.kind === "plan")
	);
	const pickedCX = computed(
		() =>
			new Set(
				props.filter.references.flatMap((r) =>
					r.kind === "cx" ? [r.code] : []
				)
			)
	);

	const rows = computed(() =>
		visible.value.map((p) => {
			const res = new Map(
				p.resources.map((r) => [r.material_ticker, r.daily_extraction])
			);
			return {
				planet: p,
				fertility: fertilityPercent(p),
				cells: columns.value.map((c) => {
					const daily = res.get(c.ticker);
					const max = props.maxDaily[c.ticker] || 1;
					return { ...c, daily, share: daily === undefined ? 0 : Math.min(1, daily / max) };
				}),
				extras: environmentExtras(p).map((e) => e.ticker).join(" "),
				cogc: activeProgram(p, props.ctx.now),
				infrastructure: planetInfrastructure(p),
				planJumps: planRefs.value.map((r) => planetJumps(p, r, props.ctx)),
				cxJumps: SEARCH_CX.map((code) =>
					planetJumps(p, { kind: "cx", code }, props.ctx)
				),
			};
		})
	);

	const sortProps = computed(() => ({
		sorts: props.sorts,
		onSort: (s: IPlanetSearchSort[]) => emit("sort", s),
	}));

	const actionWidth = computed(() =>
		props.showPins ? "w-[76px] min-w-[76px]" : "w-[44px] min-w-[44px]"
	);
	const planetLeft = computed(() =>
		props.showPins ? "left-[76px]" : "left-[44px]"
	);
	const divider = "border-r-2! border-r-blue-300/60!";

	function heat(share: number): string {
		return `background: color-mix(in srgb, var(--color-positive) ${Math.round(10 + 80 * share)}%, transparent)`;
	}
</script>

<template>
	<table class="text-sm border-separate border-spacing-0">
		<thead class="sticky top-0 z-20">
			<tr class="child:bg-black child:border-b child:border-white/10 child:px-2 child:py-1 child:text-left child:align-bottom child:whitespace-nowrap">
				<th class="sticky left-0 z-30" :class="actionWidth">
					<span class="sr-only">{{ t("planet_search.results.actions") }}</span>
				</th>
				<th class="sticky z-30" :class="planetLeft">
					<PlanetSearchSortHeader
						v-bind="sortProps"
						sort-key="name"
						first-dir="asc"
						:label="t('planet_search.results.planet')" />
				</th>
				<th v-if="show('fert')" class="text-right!">
					<PlanetSearchSortHeader
						v-bind="sortProps"
						sort-key="fert"
						first-dir="desc"
						:label="t('planet_search.results.fert')" />
				</th>
				<th
					v-for="c in columns"
					:key="c.ticker"
					class="p-0! text-center!"
					:class="[c.filtered ? 'bg-blue-950!' : '', c.divider ? divider : '']"
					:title="t('planet_search.results.material_count', { material: c.ticker, n: found[c.ticker] ?? 0, total: planets.length })">
					<div class="h-1" :class="getMaterialClass(c.ticker)" />
					<div class="px-2 py-1">
						<PlanetSearchSortHeader
							v-bind="sortProps"
							:sort-key="`mat:${c.ticker}`"
							first-dir="desc"
							:class="c.filtered ? 'text-white' : 'text-white/75'"
							:label="c.ticker"
							:sub="`${found[c.ticker] ?? 0}/${planets.length}`" />
					</div>
				</th>
				<th v-for="r in planRefs" :key="r.kind === 'plan' ? r.planUuid : ''" class="text-right!">
					<PlanetSearchSortHeader
						v-bind="sortProps"
						:sort-key="`ref:plan:${r.kind === 'plan' ? r.planUuid : ''}`"
						first-dir="asc"
						class="text-positive"
						:label="refName(r)" />
				</th>
				<template v-for="code in SEARCH_CX" :key="code">
					<th v-if="show(code)" class="text-right!">
						<PlanetSearchSortHeader
							v-bind="sortProps"
							:sort-key="`ref:cx:${code}`"
							first-dir="asc"
							:class="{ 'text-positive': pickedCX.has(code) }"
							:label="code" />
					</th>
				</template>
				<th v-if="show('extras')">{{ t("planet_search.results.extras") }}</th>
				<th v-if="show('cogc')">{{ t("planet_search.results.cogc_infra") }}</th>
			</tr>
		</thead>
		<tbody>
			<tr
				v-for="(row, i) in rows"
				:key="row.planet.planet_natural_id"
				class="child:border-b child:border-white/5 child:px-2 child:py-1 child:align-middle"
				:class="i % 2 ? 'child:bg-row-alternate' : 'child:bg-row'">
				<td class="sticky left-0 z-10" :class="actionWidth">
					<PlanetSearchRowActions
						:planet="row.planet"
						:pinned="pins.includes(row.planet.planet_natural_id)"
						:show-pin="showPins"
						@pin="emit('pin', row.planet.planet_natural_id)" />
				</td>
				<td class="sticky z-10 whitespace-nowrap font-bold" :class="planetLeft">
					{{ row.planet.planet_name || row.planet.planet_natural_id }}
					<span
						v-if="row.planet.planet_name && row.planet.planet_name !== row.planet.planet_natural_id"
						class="text-xs text-muted font-normal font-mono">
						{{ row.planet.planet_natural_id }}
					</span>
				</td>
				<td v-if="show('fert')" class="text-right tabular-nums" :class="row.fertility === null ? 'text-muted' : 'text-positive'">
					{{ row.fertility === null ? "—" : formatNumber(row.fertility, 0) }}
				</td>
				<td
					v-for="c in row.cells"
					:key="c.ticker"
					class="text-right tabular-nums px-0.5! py-0.5!"
					:class="[c.divider ? divider : '', c.filtered ? 'font-bold' : '']">
					<span
						v-if="c.daily === undefined"
						class="block text-center text-white/20"
						:title="t('planet_search.results.not_present', { material: c.ticker })">
						·
					</span>
					<span
						v-else
						class="block rounded-sm px-1.5 py-0.5"
						:class="c.share > 0.6 ? 'text-black' : 'text-white'"
						:style="heat(c.share)"
						:title="t('planet_search.results.cell', { material: c.ticker, value: formatNumber(c.daily, 2), pct: Math.round(c.share * 100) })">
						{{ formatNumber(c.daily, 1) }}
					</span>
				</td>
				<td v-for="(j, ji) in row.planJumps" :key="ji" class="text-right tabular-nums font-bold text-positive">
					<span v-if="j === -1" :title="t('planet_search.results.unreachable')">—</span>
					<template v-else>{{ j }}</template>
				</td>
				<template v-for="(j, ci) in row.cxJumps" :key="ci">
					<td v-if="show(SEARCH_CX[ci])" class="text-right tabular-nums" :class="{ 'text-positive font-bold': pickedCX.has(SEARCH_CX[ci]) }">
						<span v-if="j === -1" :title="t('planet_search.results.unreachable')">—</span>
						<template v-else>{{ j }}</template>
					</td>
				</template>
				<td v-if="show('extras')" class="whitespace-nowrap font-mono text-xs">
					{{ row.extras }}
				</td>
				<td v-if="show('cogc')" class="whitespace-nowrap text-xs">
					{{ row.cogc ? t(`game.cogc_program.${row.cogc}`) : t("planet_search.results.no_cogc") }}
					<span class="text-muted">
						· {{ row.infrastructure.join(" · ") || t("planet_search.results.no_infrastructure") }}
					</span>
				</td>
			</tr>
		</tbody>
	</table>
	<div
		v-if="visible.length < planets.length"
		ref="sentinel"
		class="p-3 text-center text-muted">
		{{ t("planet_search.results.loading_more") }}
	</div>
</template>
