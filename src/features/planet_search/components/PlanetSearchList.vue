<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useIncrementalRows } from "@/features/planet_search/useIncrementalRows";

	// Engine
	import {
		activeProgram,
		fertilityPercent,
		filteredMaterials,
		planetInfrastructure,
		planetJumps,
		SEARCH_CX,
	} from "@/features/planet_search/planetSearch.engine";
	import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
	import { formatNumber } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
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

	// UI
	import { ConstructionSharp } from "@vicons/material";

	const props = defineProps<{
		planets: PlanetSearchIndexEntry[];
		filter: PlanetSearchFilter;
		ctx: IPlanetSearchContext;
		maxDaily: Record<string, number>;
		sorts: IPlanetSearchSort[];
		pins: string[];
		showPins: boolean;
		hiddenColumns: PlanetSearchColumn[];
		refName: (ref: PlanetSearchReference) => string;
	}>();

	const emit = defineEmits<{
		(e: "sort", value: IPlanetSearchSort[]): void;
		(e: "pin", planetNaturalId: string): void;
	}>();

	const { visible, sentinel } = useIncrementalRows(() => props.planets);

	const show = (c: PlanetSearchColumn) => !props.hiddenColumns.includes(c);
	const materials = computed(() => filteredMaterials(props.filter));
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
			const res = new Map(p.resources.map((r) => [r.material_ticker, r]));
			return {
				planet: p,
				fertility: fertilityPercent(p),
				materials: materials.value.map((m) => ({
					ticker: m,
					resource: res.get(m),
				})),
				others: p.resources
					.filter((r) => !materials.value.includes(r.material_ticker))
					.sort((a, b) => a.material_ticker.localeCompare(b.material_ticker)),
				extras: environmentExtras(p),
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

	// sticky planet column sits right of the action buttons
	const actionWidth = computed(() =>
		props.showPins ? "w-[76px] min-w-[76px]" : "w-[44px] min-w-[44px]"
	);
	const planetLeft = computed(() =>
		props.showPins ? "left-[76px]" : "left-[44px]"
	);
</script>

<template>
	<table class="w-full text-sm border-separate border-spacing-0">
		<thead class="sticky top-0 z-20">
			<tr class="child:bg-black child:border-b child:border-white/10 child:px-2 child:py-2 child:text-left child:align-bottom child:whitespace-nowrap">
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
				<th v-for="m in materials" :key="m">
					<PlanetSearchSortHeader
						v-bind="sortProps"
						:sort-key="`mat:${m}`"
						first-dir="desc"
						:label="m" />
				</th>
				<th v-if="show('other')">{{ t("planet_search.results.other") }}</th>
				<th v-if="show('extras')">
					<ConstructionSharp
						class="w-4 h-4"
						aria-hidden="true"
						:title="t('planet_search.results.extras')" />
					<span class="sr-only">{{ t("planet_search.results.extras") }}</span>
				</th>
				<th v-if="show('cogc')">{{ t("planet_search.results.cogc_infra") }}</th>
				<th v-for="r in planRefs" :key="r.kind === 'plan' ? r.planUuid : ''" class="text-right!">
					<PlanetSearchSortHeader
						v-bind="sortProps"
						:sort-key="`ref:plan:${r.kind === 'plan' ? r.planUuid : ''}`"
						first-dir="asc"
						class="text-positive"
						:label="refName(r)"
						:sub="t('planet_search.results.jumps')" />
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
			</tr>
		</thead>
		<tbody>
			<tr
				v-for="(row, i) in rows"
				:key="row.planet.planet_natural_id"
				class="child:border-b child:border-white/5 child:px-2 child:py-1.5 child:align-middle"
				:class="i % 2 ? 'child:bg-row-alternate' : 'child:bg-row'">
				<td class="sticky left-0 z-10" :class="actionWidth">
					<PlanetSearchRowActions
						:planet="row.planet"
						:pinned="pins.includes(row.planet.planet_natural_id)"
						:show-pin="showPins"
						@pin="emit('pin', row.planet.planet_natural_id)" />
				</td>
				<td class="sticky z-10 whitespace-nowrap" :class="planetLeft">
					<div class="font-bold">
						{{ row.planet.planet_name || row.planet.planet_natural_id }}
					</div>
					<div
						v-if="row.planet.planet_name && row.planet.planet_name !== row.planet.planet_natural_id"
						class="text-xs text-muted font-mono">
						{{ row.planet.planet_natural_id }}
					</div>
				</td>
				<td v-if="show('fert')" class="text-right tabular-nums" :class="row.fertility === null ? 'text-muted' : 'text-positive'">
					{{ row.fertility === null ? "—" : formatNumber(row.fertility, 0) }}
				</td>
				<td v-for="m in row.materials" :key="m.ticker" class="whitespace-nowrap">
					<MaterialTile
						v-if="m.resource"
						:ticker="m.ticker"
						:amount="m.resource.daily_extraction"
						:max="m.resource.max_daily_extraction"
						popover-placement="right" />
					<span
						v-else
						class="opacity-35"
						:title="t('planet_search.results.not_present', { material: m.ticker })">
						<MaterialTile
							:ticker="m.ticker"
							:amount="0"
							:max="maxDaily[m.ticker]"
							:enable-popover="false" />
					</span>
				</td>
				<td v-if="show('other')">
					<div class="flex flex-row flex-wrap gap-1 max-w-[170px] child:whitespace-nowrap">
						<MaterialTile
							v-for="r in row.others"
							:key="r.material_ticker"
							:ticker="r.material_ticker"
							:amount="r.daily_extraction"
							:max="r.max_daily_extraction"
							popover-placement="right" />
					</div>
				</td>
				<td v-if="show('extras')">
					<div class="flex flex-row flex-wrap gap-1">
						<span
							v-for="e in row.extras"
							:key="e.ticker"
							:title="t(`planet_search.reasons.${e.reason}`)">
							<MaterialTile :ticker="e.ticker" :enable-popover="false" />
						</span>
					</div>
				</td>
				<td v-if="show('cogc')" class="whitespace-nowrap">
					<div>
						{{ row.cogc ? t(`game.cogc_program.${row.cogc}`) : t("planet_search.results.no_cogc") }}
					</div>
					<div class="text-xs text-muted">
						{{ row.infrastructure.join(" · ") || t("planet_search.results.no_infrastructure") }}
					</div>
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
