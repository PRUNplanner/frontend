<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Components
	import PPagination from "@/ui/components/PPagination.vue";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import { ChevronLeftSharp, ChevronRightSharp } from "@vicons/material";

	// below a ranked list: its pager once expanded, and the Show all /
	// Show top button
	const {
		total,
		top,
		offset,
		shown,
		pageCount,
		expanded,
		showAll,
		pagesLabel,
	} = defineProps<{
			/** rows in the whole list */
			total: number;
			/** rows while collapsed */
			top: number;
			/** first row shown, 0-based, and rows shown */
			offset: number;
			shown: number;
			pageCount: number;
			expanded: boolean;
			/** "Show all 75 rising" */
			showAll: string;
			/** the pager's accessible name */
			pagesLabel: string;
		}>();
	const page = defineModel<number>("page", { required: true });
	defineEmits<{ (e: "toggle"): void }>();

	const { t } = useI18n();

	const range = computed(() =>
		t("market_report.list.range", {
			from: offset + 1,
			to: offset + shown,
			total,
		})
	);
</script>

<template>
	<nav
		v-if="expanded && pageCount > 1"
		:aria-label="pagesLabel"
		class="flex items-center justify-between gap-2">
		<button
			type="button"
			class="sm:hidden flex items-center justify-center size-11 rounded-control hover:bg-hover disabled:text-white/38"
			:aria-label="t('common.ui.pagination.previous')"
			:disabled="page <= 1"
			@click="page--">
			<ChevronLeftSharp class="size-5" />
		</button>
		<span class="text-xs text-muted tabular-nums">{{ range }}</span>
		<!-- a wrapper: the pager's own display rule beats `hidden` -->
		<div class="hidden sm:block">
			<PPagination
				v-model:page="page"
				class="mt-0!"
				:page-count="pageCount" />
		</div>
		<button
			type="button"
			class="sm:hidden flex items-center justify-center size-11 rounded-control hover:bg-hover disabled:text-white/38"
			:aria-label="t('common.ui.pagination.next')"
			:disabled="page >= pageCount"
			@click="page++">
			<ChevronRightSharp class="size-5" />
		</button>
	</nav>
	<PButton
		v-if="total > top"
		type="secondary"
		class="w-full sm:w-auto sm:self-center pointer-coarse:h-11"
		:aria-expanded="expanded"
		@click="$emit('toggle')">
		{{ expanded ? t("market_report.list.show_top", { count: top }) : showAll }}
	</PButton>
</template>
