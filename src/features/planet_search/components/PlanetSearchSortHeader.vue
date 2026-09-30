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
		/** fills a fixed-width column: right-aligned, a long label wraps to two lines */
		truncate?: boolean;
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
		class="cursor-pointer font-bold hover:underline"
		:class="truncate ? 'block w-full text-right' : 'text-left'"
		:aria-label="t('planet_search.results.sort', { column: label })"
		:aria-pressed="active !== undefined"
		:title="
			truncate
				? `${label} · ${t('planet_search.results.sort_hint')}`
				: t('planet_search.results.sort_hint')
		"
		@click="click">
		<span
			class="whitespace-nowrap"
			:class="{ 'flex flex-row justify-end': truncate }">
			<span :class="{ 'line-clamp-2 break-words whitespace-normal': truncate }">{{ label }}</span>
			<span v-if="active" aria-hidden="true" class="shrink-0 ml-1">
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
