<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Engine
	import {
		filteredMaterials,
		foundMaterials,
		toggle,
	} from "@/features/planet_search/planetSearch.engine";

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import {
		PlanetSearchColumnSchema,
		type PlanetSearchColumn,
		type PlanetSearchFilter,
		type PlanetSearchView,
	} from "@/features/planet_search/planetSearch.schemas";

	// UI
	import { PButton, PCheckbox } from "@/ui";
	import { popoverConfig } from "@/ui/styles";
	import { NPopover } from "naive-ui";

	const hiddenColumns = defineModel<PlanetSearchColumn[]>("hiddenColumns", {
		required: true,
	});
	const hiddenMaterials = defineModel<string[]>("hiddenMaterials", {
		required: true,
	});

	const props = defineProps<{
		view: PlanetSearchView;
		results: PlanetSearchIndexEntry[];
		filter: PlanetSearchFilter;
	}>();

	// "other resources" is its own column only in the list
	const columns = computed(() =>
		PlanetSearchColumnSchema.options.filter(
			(c) => props.view === "list" || c !== "other"
		)
	);

	const found = computed(() => foundMaterials(props.results));
	const others = computed(() => {
		const filtered = new Set(filteredMaterials(props.filter));
		return Object.keys(found.value)
			.filter((m) => !filtered.has(m))
			.sort();
	});
	const othersShown = computed(
		() => others.value.filter((m) => !hiddenMaterials.value.includes(m)).length
	);

	const shown = computed(() => {
		const cols = columns.value.filter(
			(c) => !hiddenColumns.value.includes(c)
		).length;
		return props.view === "matrix" ? cols + othersShown.value : cols;
	});
	const total = computed(() =>
		props.view === "matrix"
			? columns.value.length + others.value.length
			: columns.value.length
	);
</script>

<template>
	<NPopover
		trigger="click"
		placement="bottom-end"
		scrollable
		:show-arrow="false"
		:class="popoverConfig.panel">
		<template #trigger>
			<PButton type="secondary">
				{{ t("planet_search.columns.button", { shown, total }) }}
			</PButton>
		</template>
		<div class="flex flex-col gap-1 w-[260px] max-h-[70vh] overflow-y-auto">
			<PCheckbox
				v-for="c in columns"
				:key="c"
				:checked="!hiddenColumns.includes(c)"
				@update:checked="hiddenColumns = toggle(hiddenColumns, c)">
				{{ t(`planet_search.columns.${c}`) }}
			</PCheckbox>

			<template v-if="view === 'matrix'">
				<div
					class="flex flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10">
					<span class="font-bold">
						{{
							t("planet_search.columns.found", {
								shown: othersShown,
								total: others.length,
							})
						}}
					</span>
					<span class="flex gap-1">
						<PButton
							size="sm"
							type="secondary"
							@click="
								hiddenMaterials = hiddenMaterials.filter(
									(m) => !others.includes(m)
								)
							">
							{{ t("planet_search.columns.all") }}
						</PButton>
						<PButton
							size="sm"
							type="secondary"
							@click="
								hiddenMaterials = [
									...new Set([...hiddenMaterials, ...others]),
								]
							">
							{{ t("planet_search.columns.none") }}
						</PButton>
					</span>
				</div>
				<div
					v-for="m in others"
					:key="m"
					class="flex flex-row items-center justify-between">
					<PCheckbox
						:checked="!hiddenMaterials.includes(m)"
						@update:checked="
							hiddenMaterials = toggle(hiddenMaterials, m)
						">
						<span class="font-mono">{{ m }}</span>
					</PCheckbox>
					<span class="text-muted text-xs">
						{{ found[m] }}/{{ results.length }}
					</span>
				</div>
			</template>

			<PButton
				size="sm"
				type="secondary"
				class="mt-2"
				@click="
					hiddenColumns = [];
					hiddenMaterials = [];
				">
				{{ t("planet_search.columns.reset") }}
			</PButton>
		</div>
	</NPopover>
</template>
