<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Engine
	import { applySortClick } from "@/features/planet_search/planetSearch.engine";

	// Types & Interfaces
	import type { IPlanetSearchSort } from "@/features/planet_search/planetSearch.types";

	const props = defineProps<{
		sorts: IPlanetSearchSort[];
		sortKey: string;
		firstDir: IPlanetSearchSort["dir"];
		label: string;
		sub?: string;
	}>();

	const emit = defineEmits<{
		(e: "sort", value: IPlanetSearchSort[]): void;
	}>();

	const index = computed(() =>
		props.sorts.findIndex((s) => s.key === props.sortKey)
	);
	const active = computed(() =>
		index.value === -1 ? undefined : props.sorts[index.value]
	);

	// shift+click adds the column as a tiebreaker
	function click(e: MouseEvent) {
		emit(
			"sort",
			applySortClick(props.sorts, props.sortKey, props.firstDir, e.shiftKey)
		);
	}
</script>

<template>
	<button
		type="button"
		class="cursor-pointer font-bold text-left hover:underline"
		:aria-label="t('planet_search.results.sort', { column: label })"
		:aria-pressed="active !== undefined"
		:title="t('planet_search.results.sort_hint')"
		@click="click">
		<span class="whitespace-nowrap">
			{{ label }}
			<span v-if="active" aria-hidden="true">
				{{ active.dir === "asc" ? "▲" : "▼"
				}}<sup v-if="sorts.length > 1" class="text-xs">{{
					index + 1
				}}</sup>
			</span>
		</span>
		<span v-if="sub" class="block text-xs font-normal text-muted">
			{{ sub }}
		</span>
	</button>
</template>
