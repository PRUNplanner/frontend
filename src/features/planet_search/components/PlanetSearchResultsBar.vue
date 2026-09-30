<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { chipLabel } from "@/features/planet_search/planetSearchLabels.util";

	// Components
	import PlanetSearchColumnsMenu from "@/features/planet_search/components/PlanetSearchColumnsMenu.vue";
	import PlanetSearchSortMenu from "@/features/planet_search/components/PlanetSearchSortMenu.vue";

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import type {
		PlanetSearchColumn,
		PlanetSearchFilter,
		PlanetSearchReference,
		PlanetSearchView,
	} from "@/features/planet_search/planetSearch.schemas";
	import type {
		IPlanetSearchChip,
		IPlanetSearchSort,
	} from "@/features/planet_search/planetSearch.types";

	// UI
	import { PButton, PButtonGroup } from "@/ui";

	const view = defineModel<PlanetSearchView>("view", { required: true });
	const hiddenColumns = defineModel<PlanetSearchColumn[]>("hiddenColumns", {
		required: true,
	});
	const hiddenMaterials = defineModel<string[]>("hiddenMaterials", {
		required: true,
	});

	const props = defineProps<{
		count: number;
		total: number;
		results: PlanetSearchIndexEntry[];
		filter: PlanetSearchFilter;
		chips: IPlanetSearchChip[];
		hints: { label: string; filter: PlanetSearchFilter }[];
		/** name matches hidden by the other filters, null when there are none */
		nameNote: {
			text: string;
			hints: { label: string; filter: PlanetSearchFilter }[];
			showAll: { label: string; filter: PlanetSearchFilter };
		} | null;
		isDesktop: boolean;
		refName: (ref: PlanetSearchReference) => string;
		sorts: IPlanetSearchSort[];
		defaultSort: IPlanetSearchSort;
	}>();

	const emit = defineEmits<{
		(e: "update:filter", value: PlanetSearchFilter): void;
		(e: "open-filters"): void;
		(e: "sort", value: IPlanetSearchSort[]): void;
	}>();

	const labelledChips = computed(() =>
		props.chips.map((c) => ({
			chip: c,
			label: chipLabel(c, props.filter.minDaily, t, props.refName),
		}))
	);
</script>

<template>
	<div class="px-3 lg:px-6 py-3 flex flex-col gap-3">
		<div class="flex flex-row flex-wrap items-center gap-3">
			<h2 class="text-lg font-bold whitespace-nowrap" aria-live="polite">
				{{ t("planet_search.results.count", { n: count, total }) }}
			</h2>
			<PButton v-if="!isDesktop" @click="emit('open-filters')">
				{{ t("planet_search.filters.open", { n: chips.length }) }}
			</PButton>

			<!-- one row, one height: view switch, then sort and columns -->
			<div class="ml-auto flex flex-row items-center gap-6">
				<PButtonGroup
					role="group"
					:aria-label="t('planet_search.results.view_label')">
					<PButton
						v-for="v in ['list', 'matrix'] as const"
						:key="v"
						:type="view === v ? 'primary' : 'secondary'"
						:aria-pressed="view === v"
						@click="view = v">
						{{ t(`planet_search.results.${v}`) }}
					</PButton>
				</PButtonGroup>
				<div class="flex flex-row items-center gap-2">
					<PlanetSearchSortMenu
						:sorts="sorts"
						:default-sort="defaultSort"
						:view="view"
						:results="results"
						:filter="filter"
						:hidden-columns="hiddenColumns"
						:hidden-materials="hiddenMaterials"
						:ref-name="refName"
						@sort="(s) => emit('sort', s)" />
					<PlanetSearchColumnsMenu
						v-model:hidden-columns="hiddenColumns"
						v-model:hidden-materials="hiddenMaterials"
						:view="view"
						:results="results"
						:filter="filter" />
				</div>
			</div>
		</div>

		<ul v-if="labelledChips.length" class="flex flex-row flex-wrap gap-2">
			<li
				v-for="c in labelledChips"
				:key="c.chip.key"
				class="inline-flex items-center gap-1 pl-3 rounded-full border border-blue-300/60 bg-blue-950 text-sm">
				{{ c.label }}
				<button
					type="button"
					class="min-w-11 min-h-11 lg:min-w-7 lg:min-h-7 rounded-full cursor-pointer hover:bg-white/10"
					:aria-label="t('planet_search.chips.remove', { label: c.label })"
					@click="emit('update:filter', c.chip.remove)">
					×
				</button>
			</li>
		</ul>

		<!-- always in the DOM, so its content is announced when it appears -->
		<div role="status" :class="{ '-mt-3': !nameNote }">
			<div
				v-if="nameNote"
				class="border border-white/20 rounded px-3 py-2 flex flex-row flex-wrap items-center gap-2">
				<p>{{ nameNote.text }}</p>
				<PButton
					v-for="h in nameNote.hints"
					:key="h.label"
					size="sm"
					type="secondary"
					@click="emit('update:filter', h.filter)">
					{{ h.label }}
				</PButton>
				<PButton
					size="sm"
					@click="emit('update:filter', nameNote.showAll.filter)">
					{{ nameNote.showAll.label }}
				</PButton>
			</div>
		</div>

		<div
			v-if="hints.length"
			class="border border-warning/50 rounded p-3 flex flex-col gap-2">
			<p>{{ t("planet_search.hints.title") }}</p>
			<div class="flex flex-row flex-wrap gap-2">
				<PButton
					v-for="h in hints"
					:key="h.label"
					type="secondary"
					@click="emit('update:filter', h.filter)">
					{{ h.label }}
				</PButton>
			</div>
		</div>
	</div>
</template>
