<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// UI
	import { ChevronLeftSharp, ChevronRightSharp } from "@vicons/material";

	/**
	 * Page buttons: previous, up to 9 pages with "…" jumps, next.
	 *
	 * @author jplacht
	 */
	const { pageCount } = defineProps<{ pageCount: number }>();
	const page = defineModel<number>("page", { required: true });

	interface PageItem { page: number; more: boolean }

	// up to 9 items: first, last and the pages around the current one
	const items = computed<PageItem[]>(() => {
		const last = pageCount;
		if (last <= 2)
			return Array.from({ length: last }, (_, i) => ({
				page: i + 1,
				more: false,
			}));
		const end = Math.min(Math.max(page.value + 2, 7), last - 2);
		const start = Math.max(Math.min(page.value - 2, last - 6), 3);
		const list: PageItem[] = [{ page: 1, more: false }];
		list.push(
			start > 3 ? { page: start - 1, more: true } : { page: 2, more: false }
		);
		for (let i = start; i <= end; i++) list.push({ page: i, more: false });
		if (end < last - 2) list.push({ page: end + 1, more: true });
		else if (end === last - 2 && list[list.length - 1].page !== last - 1)
			list.push({ page: last - 1, more: false });
		if (list[list.length - 1].page !== last)
			list.push({ page: last, more: false });
		return list;
	});

	function go(to: number): void {
		page.value = Math.min(Math.max(to, 1), pageCount);
	}
</script>

<template>
	<nav class="ppagination">
		<button
			type="button"
			class="ppagination-item"
			:aria-label="t('common.ui.pagination.previous')"
			:disabled="page <= 1"
			@click="go(page - 1)">
			<ChevronLeftSharp class="w-4 h-4" />
		</button>
		<button
			v-for="item in items"
			:key="`${item.more ? 'more' : 'page'}#${item.page}`"
			type="button"
			class="ppagination-item"
			:class="item.page === page && !item.more ? 'ppagination-active' : ''"
			:aria-label="
				item.more
					? t('common.ui.pagination.more')
					: t('common.ui.pagination.page', { page: item.page })
			"
			:aria-current="item.page === page && !item.more ? 'page' : undefined"
			@click="go(item.page)">
			{{ item.more ? "…" : item.page }}
		</button>
		<button
			type="button"
			class="ppagination-item"
			:aria-label="t('common.ui.pagination.next')"
			:disabled="page >= pageCount"
			@click="go(page + 1)">
			<ChevronRightSharp class="w-4 h-4" />
		</button>
	</nav>
</template>

<style>
	@reference "../../assets/css/style.css";

	.ppagination {
		@apply flex justify-end gap-2 mt-3 text-sm;
	}

	.ppagination-item {
		@apply flex items-center justify-center min-w-7 h-7 px-1.5 rounded-control border border-transparent text-ink cursor-pointer hover:text-link disabled:text-white/38 disabled:cursor-not-allowed;
	}

	.ppagination-item.ppagination-active {
		@apply text-link border-link/50;
	}
</style>
