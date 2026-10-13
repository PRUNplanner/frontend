<script setup lang="ts" generic="T">
	import {
		computed,
		onBeforeUnmount,
		onUpdated,
		ref,
		shallowRef,
		useSlots,
		watch,
		type VNode,
	} from "vue";

	import { useI18n } from "vue-i18n";

	// Components
	import PPagination from "@/ui/components/PPagination.vue";

	// UI
	import { ChevronRightSharp } from "@vicons/material";

	// Types & Interfaces
	import type {
		PDataTableAlign,
		PDataTableColumn,
		PDataTableSortOrder,
	} from "@/ui/ui.types";

	// a generic component: imports first, then code
	const { t } = useI18n();

	/**
	 * Data table: sortable columns (descend, ascend, none), a sticky header,
	 * pagination, expandable rows, summary and empty slots. Columns are an
	 * array; cells render `row[key]` or the `cell-<key>` slot.
	 *
	 * Pass `columns`, `data` and `rowKey` as stable references (not inline
	 * functions or literals): a new one re-renders the whole table.
	 *
	 * @author jplacht
	 */
	const {
		columns,
		data,
		rowKey = undefined,
		striped = false,
		maxHeight = undefined,
		fill = false,
		pageSize = undefined,
		rowClass = undefined,
		rowClick = undefined,
		popover = false,
		expandLabel = undefined,
		virtual = false,
		minWidth = undefined,
	} = defineProps<{
		columns: PDataTableColumn<T>[];
		data: T[];
		rowKey?: (row: T) => string | number;
		striped?: boolean;
		/** the body scrolls under the header beyond this height */
		maxHeight?: number | string;
		/** fills a `flex-1 min-h-0` parent, the body scrolls under the header */
		fill?: boolean;
		pageSize?: number;
		rowClass?: string | ((row: T, index: number) => string);
		/** makes rows clickable and keyboard-operable (Enter, Space) */
		rowClick?: (row: T) => void;
		/** colours for a table inside a popover */
		popover?: boolean;
		/** name of a row's expand button (default "Show details") */
		expandLabel?: (row: T) => string;
		/** renders only the rows in view; needs `fill` or `maxHeight` */
		virtual?: boolean;
		/** narrower than this, the table scrolls sideways in its box */
		minWidth?: number | string;
	}>();

	const expandedRowKeys = defineModel<(string | number)[]>(
		"expandedRowKeys",
		{ default: () => [] }
	);

	defineSlots<
		{
			[cell: `cell-${string}`]: (p: { row: T; index: number }) => VNode[];
			[header: `header-${string}`]: () => VNode[];
		} & {
			expand?: (p: { row: T }) => VNode[];
			summary?: () => VNode[];
			empty?: () => VNode[];
		}
	>();
	const slots = useSlots();

	// Columns
	const leaves = computed(() =>
		columns.flatMap((c) => (c.children?.length ? c.children : [c]))
	);
	const grouped = computed(() => columns.some((c) => c.children?.length));
	const hasExpand = computed(() => !!slots.expand);
	const colCount = computed(
		() => leaves.value.length + (hasExpand.value ? 1 : 0)
	);

	interface HeaderCell {
		col: PDataTableColumn<T>;
		colspan: number;
		rowspan: number;
	}

	/** header rows: groups (spanning their children) and the leaf titles */
	const headerRows = computed<HeaderCell[][]>(() => {
		const top: HeaderCell[] = [];
		let skip = 0;
		for (const col of columns) {
			if (skip > 0) {
				skip--;
				continue;
			}
			const span = col.children?.length || col.titleColSpan || 1;
			if (!col.children?.length) skip = span - 1;
			top.push({
				col,
				colspan: span,
				rowspan: grouped.value && !col.children?.length ? 2 : 1,
			});
		}
		if (!grouped.value) return [top];
		const sub = columns.flatMap((c) =>
			(c.children ?? []).map((col) => ({ col, colspan: 1, rowspan: 1 }))
		);
		return [top, sub];
	});

	const px = (v: number | string | undefined) =>
		typeof v === "number" ? `${v}px` : v;

	// percentage widths stay on the col: on the header they change the layout
	const headerWidth = (v: number | string | undefined) =>
		typeof v === "number" ? px(v) : undefined;

	const alignClass = (align: PDataTableAlign | undefined) =>
		align === "right" ? "numeric" : align === "center" ? "text-center" : "";

	// Sorting: one column at a time, descend → ascend → none
	const initial = leaves.value.find((c) => c.sorter && c.defaultSortOrder);
	const sortKey = ref<string | null>(initial?.key ?? null);
	const sortOrder = ref<PDataTableSortOrder>(
		initial?.defaultSortOrder ?? false
	);

	/** row[key]: empty first, then numbers or strings */
	function compareKey(key: string) {
		return (a: T, b: T): number => {
			const v1 = (a as Record<string, unknown>)[key];
			const v2 = (b as Record<string, unknown>)[key];
			if (v1 === null || v1 === undefined)
				return v2 === null || v2 === undefined ? 0 : -1;
			if (v2 === null || v2 === undefined) return 1;
			if (typeof v1 === "number" && typeof v2 === "number") return v1 - v2;
			if (typeof v1 === "string" && typeof v2 === "string")
				return v1.localeCompare(v2);
			return 0;
		};
	}

	function toggleSort(col: PDataTableColumn<T>): void {
		if (!col.sorter) return;
		if (sortKey.value !== col.key || !sortOrder.value) {
			sortKey.value = col.key;
			sortOrder.value = "descend";
		} else
			sortOrder.value = sortOrder.value === "descend" ? "ascend" : false;
	}

	const ariaSort = (col: PDataTableColumn<T>) =>
		sortKey.value === col.key && sortOrder.value
			? sortOrder.value === "ascend"
				? "ascending"
				: "descending"
			: "none";

	const isSorting = (key: string) =>
		sortKey.value === key && sortOrder.value !== false;

	const sorted = computed<T[]>(() => {
		const col = leaves.value.find((c) => c.key === sortKey.value);
		if (!col?.sorter || !sortOrder.value) return data;
		const compare =
			col.sorter === true ? compareKey(col.key) : col.sorter;
		const flag = sortOrder.value === "ascend" ? 1 : -1;
		return data.slice().sort((a, b) => compare(a, b) * flag);
	});

	// Pagination: the page stays on sort; a shorter list moves it back in bounds
	const page = ref(1);
	const pageCount = computed(() =>
		pageSize ? Math.max(1, Math.ceil(data.length / pageSize)) : 1
	);
	const currentPage = computed(() =>
		Math.min(Math.max(page.value, 1), pageCount.value)
	);
	watch(currentPage, (p) => (page.value = p));
	const rows = computed<T[]>(() => {
		if (!pageSize) return sorted.value;
		const start = (currentPage.value - 1) * pageSize;
		return sorted.value.slice(start, start + pageSize);
	});

	const keyOf = (row: T, index: number): string | number =>
		rowKey ? rowKey(row) : index;

	/*
	 * Windowing (virtual): only the rows in view plus a margin render,
	 * between two spacer rows. Row heights are measured as rows render and
	 * kept per row key, unmeasured rows count with the average height.
	 * ponytail: offsets are rebuilt in O(rows) when heights change, fine
	 * for a few thousand rows; a Fenwick tree if tables grow far beyond.
	 */
	const windowed = computed(
		() => virtual && (fill || maxHeight !== undefined) && !pageSize
	);
	const scrollTop = ref(0);
	const viewHeight = ref(0);
	const heights = new Map<string, number>();
	const heightsVersion = ref(0);
	const averageHeight = ref(34);
	const OVERSCAN = 100;

	const offsets = computed<number[]>(() => {
		void heightsVersion.value;
		if (!windowed.value) return [];
		const list = rows.value;
		const out = new Array<number>(list.length + 1);
		out[0] = 0;
		for (let i = 0; i < list.length; i++)
			out[i + 1] =
				out[i] +
				(heights.get(String(keyOf(list[i], i))) ?? averageHeight.value);
		return out;
	});

	/** first index whose row ends below `y` */
	function indexAt(y: number): number {
		const o = offsets.value;
		let lo = 0;
		let hi = o.length - 2;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (o[mid + 1] <= y) lo = mid + 1;
			else hi = mid;
		}
		return Math.max(lo, 0);
	}

	// the previous tuple while the window holds the same rows: a scroll
	// inside it changes nothing that renders
	const range = computed<[number, number]>((prev) => {
		const count = rows.value.length;
		let start = 0;
		let end = count;
		if (windowed.value) {
			start = indexAt(scrollTop.value - OVERSCAN);
			end = Math.min(
				indexAt(scrollTop.value + (viewHeight.value || 800) + OVERSCAN) + 1,
				count
			);
		}
		return prev?.[0] === start && prev[1] === end ? prev : [start, end];
	});

	/** the rendered rows with their index in `rows` and their key */
	const items = computed(() => {
		const [start, end] = windowed.value
			? range.value
			: [0, rows.value.length];
		const out: { row: T; index: number; key: string | number }[] = [];
		for (let index = start; index < end; index++) {
			const row = rows.value[index];
			out.push({ row, index, key: keyOf(row, index) });
		}
		return out;
	});
	const spacerTop = computed(() =>
		windowed.value ? offsets.value[range.value[0]] : 0
	);
	const spacerBottom = computed(() =>
		windowed.value
			? offsets.value[rows.value.length] - offsets.value[range.value[1]]
			: 0
	);

	// scroll events come once per frame; the re-render follows before paint
	function onScroll(e: Event): void {
		if (windowed.value)
			scrollTop.value = (e.currentTarget as HTMLElement).scrollTop;
	}

	// measured in the next frame, when layout is done, not during the patch
	const tbody = shallowRef<HTMLElement | null>(null);
	let measureFrame = 0;
	function scheduleMeasure(): void {
		if (windowed.value && !measureFrame)
			measureFrame = requestAnimationFrame(measureRows);
	}
	onUpdated(scheduleMeasure);
	watch(tbody, scheduleMeasure);
	function measureRows(): void {
		measureFrame = 0;
		if (!windowed.value || !tbody.value) return;
		let changed = false;
		let sum = 0;
		let n = 0;
		for (const tr of tbody.value.querySelectorAll<HTMLElement>(
			":scope > tr[data-row-key]"
		)) {
			const h = tr.offsetHeight;
			if (!h) continue;
			sum += h;
			n++;
			const key = tr.dataset.rowKey!;
			if (heights.get(key) !== h) {
				heights.set(key, h);
				changed = true;
			}
		}
		if (n && Math.abs(sum / n - averageHeight.value) > 0.5)
			averageHeight.value = sum / n;
		if (changed) heightsVersion.value++;
	}

	// Expand
	const expandedSet = computed(() => new Set(expandedRowKeys.value));

	function toggleExpand(key: string | number): void {
		expandedRowKeys.value = expandedSet.value.has(key)
			? expandedRowKeys.value.filter((k) => k !== key)
			: [...expandedRowKeys.value, key];
	}

	/*
	 * Measured only when needed: the box width keeps expanded rows and the
	 * empty state as wide as the box while the table scrolls sideways; the
	 * header height is added to maxHeight, which limits the body.
	 */
	const box = ref<HTMLElement | null>(null);
	const head = ref<HTMLElement | null>(null);
	const boxWidth = ref<number | undefined>(undefined);
	const headHeight = ref(0);
	let observer: ResizeObserver | undefined;
	watch(
		[
			box,
			head,
			() => hasExpand.value || !rows.value.length,
			() => maxHeight !== undefined,
			windowed,
		],
		([boxEl, headEl, sticky, limited, win]) => {
			observer?.disconnect();
			if (typeof ResizeObserver === "undefined") return;
			observer = new ResizeObserver(() => {
				if (sticky && boxEl) boxWidth.value = boxEl.clientWidth;
				if (win && boxEl) viewHeight.value = boxEl.clientHeight;
				if (limited && headEl) headHeight.value = headEl.offsetHeight;
			});
			if ((sticky || win) && boxEl) observer.observe(boxEl);
			if (limited && headEl) observer.observe(headEl);
		},
		{ immediate: true }
	);
	onBeforeUnmount(() => {
		observer?.disconnect();
		cancelAnimationFrame(measureFrame);
	});

	const boxMaxHeight = computed(() =>
		maxHeight === undefined
			? undefined
			: `calc(${px(maxHeight)} + ${headHeight.value + 2}px)`
	);

	function rowClassOf(row: T, index: number): string {
		return typeof rowClass === "function" ? rowClass(row, index) : rowClass ?? "";
	}

	function onRowKey(e: KeyboardEvent, row: T): void {
		if (e.target !== e.currentTarget) return;
		e.preventDefault();
		rowClick?.(row);
	}
</script>

<template>
	<div
		class="p-data-table"
		:class="[
			fill ? 'h-full flex flex-col' : '',
			popover ? 'p-data-table-popover' : '',
			windowed && !fill ? 'p-data-table-borderless' : '',
		]">
		<!-- with fill, a 0px basis (not 0%): its rows never size the parent, it grows into the space -->
		<div
			ref="box"
			class="p-data-table-box"
			:class="fill ? 'grow basis-0 min-h-0' : ''"
			:style="{ maxHeight: boxMaxHeight }"
			@scroll.passive="onScroll">
			<!-- a fixed header means fixed layout: columns share the width -->
			<table
				class="p-data-table-table"
				:class="fill || maxHeight !== undefined ? 'table-fixed' : ''"
				:style="{ minWidth: px(minWidth) }">
				<colgroup>
					<col v-if="hasExpand" style="width: 48px" />
					<col
						v-for="col in leaves"
						:key="col.key"
						:style="{ width: px(col.width), minWidth: px(col.width) }" />
				</colgroup>
				<thead ref="head">
					<tr v-for="(headerRow, r) in headerRows" :key="r">
						<th
							v-if="hasExpand && r === 0"
							:rowspan="headerRows.length"
							class="p-data-table-expand-cell" />
						<th
							v-for="cell in headerRow"
							:key="cell.col.key"
							:colspan="cell.colspan > 1 ? cell.colspan : undefined"
							:rowspan="cell.rowspan > 1 ? cell.rowspan : undefined"
							:data-col-key="cell.col.key"
							:aria-sort="cell.col.sorter ? ariaSort(cell.col) : undefined"
							:class="[
								alignClass(cell.col.titleAlign ?? cell.col.align),
								cell.col.sorter ? 'p-data-table-sortable' : '',
								isSorting(cell.col.key) ? 'p-data-table-sorting' : '',
							]"
							:style="{
								width: headerWidth(cell.col.width),
								minWidth: px(cell.col.minWidth),
							}">
							<button
								v-if="cell.col.sorter"
								type="button"
								class="p-data-table-title"
								@click="toggleSort(cell.col)">
								<span class="p-data-table-title-text">
									<slot :name="`header-${cell.col.key}`">
										{{ cell.col.title }}
									</slot>
								</span>
								<span
									class="p-data-table-sorter"
									:class="
										isSorting(cell.col.key)
											? sortOrder === 'ascend'
												? 'p-data-table-sorter-asc'
												: 'p-data-table-sorter-desc'
											: ''
									"
									aria-hidden="true">
									<svg viewBox="0 0 28 28">
										<path
											d="M23.7916,15.2664 C24.0788,14.9679 24.0696,14.4931 23.7711,14.206 C23.4726,13.9188 22.9978,13.928 22.7106,14.2265 L14.7511,22.5007 L14.7511,3.74792 C14.7511,3.33371 14.4153,2.99792 14.0011,2.99792 C13.5869,2.99792 13.2511,3.33371 13.2511,3.74793 L13.2511,22.4998 L5.29259,14.2265 C5.00543,13.928 4.53064,13.9188 4.23213,14.206 C3.93361,14.4931 3.9244,14.9679 4.21157,15.2664 L13.2809,24.6944 C13.6743,25.1034 14.3289,25.1034 14.7223,24.6944 L23.7916,15.2664 Z"
											fill="currentColor" />
									</svg>
								</span>
							</button>
							<div v-else class="p-data-table-title">
								<span class="p-data-table-title-text">
									<slot :name="`header-${cell.col.key}`">
										{{ cell.col.title }}
									</slot>
								</span>
							</div>
						</th>
					</tr>
				</thead>
				<tbody ref="tbody">
					<template v-if="rows.length">
						<tr v-if="spacerTop" aria-hidden="true" class="p-data-table-spacer">
							<td :colspan="colCount" :style="{ height: `${spacerTop}px` }" />
						</tr>
						<template v-for="item in items" :key="item.key">
							<tr
								:data-row-key="item.key"
								:class="[
									striped && item.index % 2 === 1 ? 'p-data-table-striped' : '',
									rowClassOf(item.row, item.index),
									rowClick ? 'p-data-table-clickable' : '',
								]"
								:tabindex="rowClick ? 0 : undefined"
								@click="rowClick?.(item.row)"
								@keydown.enter="rowClick && onRowKey($event, item.row)"
								@keydown.space="rowClick && onRowKey($event, item.row)">
								<td v-if="hasExpand" class="p-data-table-expand-cell">
									<button
										type="button"
										class="p-data-table-expand-button"
										:aria-expanded="expandedSet.has(item.key)"
										:aria-label="
											expandLabel
												? expandLabel(item.row)
												: t('common.ui.table.expand_row')
										"
										@click.stop="toggleExpand(item.key)">
										<ChevronRightSharp
											class="size-4 transition-transform"
											:class="expandedSet.has(item.key) ? 'rotate-90' : ''" />
									</button>
								</td>
								<td
									v-for="col in leaves"
									:key="col.key"
									:data-col-key="col.key"
									:class="[
										alignClass(col.align),
										isSorting(col.key) ? 'p-data-table-sorting' : '',
									]">
									<slot :name="`cell-${col.key}`" :row="item.row" :index="item.index">
										{{ (item.row as Record<string, unknown>)[col.key] }}
									</slot>
								</td>
							</tr>
							<tr
								v-if="hasExpand && expandedSet.has(item.key)"
								class="p-data-table-expanded"
								:class="striped && item.index % 2 === 1 ? 'p-data-table-striped' : ''">
								<td :colspan="colCount">
									<div
										class="p-data-table-expand"
										:style="{ width: boxWidth ? `${boxWidth}px` : undefined }">
										<slot name="expand" :row="item.row" />
									</div>
								</td>
							</tr>
						</template>
						<tr v-if="spacerBottom" aria-hidden="true" class="p-data-table-spacer">
							<td :colspan="colCount" :style="{ height: `${spacerBottom}px` }" />
						</tr>
					</template>
					<tr v-else class="p-data-table-empty-row">
						<td :colspan="colCount">
							<div
								class="p-data-table-empty"
								:style="{ width: boxWidth ? `${boxWidth}px` : undefined }">
								<slot name="empty">
									<div class="p-data-table-empty-default">
										<svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
											<path
												d="M26 7.5C26 11.0899 23.0899 14 19.5 14C15.9101 14 13 11.0899 13 7.5C13 3.91015 15.9101 1 19.5 1C23.0899 1 26 3.91015 26 7.5ZM16.8536 4.14645C16.6583 3.95118 16.3417 3.95118 16.1464 4.14645C15.9512 4.34171 15.9512 4.65829 16.1464 4.85355L18.7929 7.5L16.1464 10.1464C15.9512 10.3417 15.9512 10.6583 16.1464 10.8536C16.3417 11.0488 16.6583 11.0488 16.8536 10.8536L19.5 8.20711L22.1464 10.8536C22.3417 11.0488 22.6583 11.0488 22.8536 10.8536C23.0488 10.6583 23.0488 10.3417 22.8536 10.1464L20.2071 7.5L22.8536 4.85355C23.0488 4.65829 23.0488 4.34171 22.8536 4.14645C22.6583 3.95118 22.3417 3.95118 22.1464 4.14645L19.5 6.79289L16.8536 4.14645Z"
												fill="currentColor" />
											<path
												d="M25 22.75V12.5991C24.5572 13.0765 24.053 13.4961 23.5 13.8454V16H17.5L17.3982 16.0068C17.0322 16.0565 16.75 16.3703 16.75 16.75C16.75 18.2688 15.5188 19.5 14 19.5C12.4812 19.5 11.25 18.2688 11.25 16.75L11.2432 16.6482C11.1935 16.2822 10.8797 16 10.5 16H4.5V7.25C4.5 6.2835 5.2835 5.5 6.25 5.5H12.2696C12.4146 4.97463 12.6153 4.47237 12.865 4H6.25C4.45507 4 3 5.45507 3 7.25V22.75C3 24.5449 4.45507 26 6.25 26H21.75C23.5449 26 25 24.5449 25 22.75ZM4.5 22.75V17.5H9.81597L9.85751 17.7041C10.2905 19.5919 11.9808 21 14 21L14.215 20.9947C16.2095 20.8953 17.842 19.4209 18.184 17.5H23.5V22.75C23.5 23.7165 22.7165 24.5 21.75 24.5H6.25C5.2835 24.5 4.5 23.7165 4.5 22.75Z"
												fill="currentColor" />
										</svg>
										<div>{{ t("common.ui.table.no_data") }}</div>
									</div>
								</slot>
							</div>
						</td>
					</tr>
				</tbody>
				<tfoot v-if="slots.summary && rows.length">
					<tr>
						<td :colspan="colCount">
							<slot name="summary" />
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
		<PPagination
			v-if="pageSize"
			:page="currentPage"
			:page-count="pageCount"
			@update:page="(p: number) => (page = p)" />
	</div>
</template>

<style>
	@reference "tailwindcss";

	/* the app's table look */
	.p-data-table {
		@apply relative text-sm/[1.6] text-[rgba(255,255,255,0.8)] tabular-nums;
	}

	.p-data-table-box {
		@apply overflow-auto border border-[#2d2d30] rounded-[3px];
	}

	.p-data-table-table {
		@apply w-full border-separate border-spacing-0 bg-[rgba(255,255,255,0.02)] [word-break:break-word];
	}

	.p-data-table thead {
		@apply sticky top-0 z-[2] bg-black;
	}

	.p-data-table th {
		@apply relative px-2.5 py-1.25 text-left align-middle font-bold text-[rgba(255,255,255,0.9)] bg-black border-b border-[#2d2d30];
	}

	.p-data-table td {
		@apply px-2.5 py-1.25 text-left align-middle border-b border-[#2d2d30] bg-[rgba(255,255,255,0.02)];
	}

	/* windowed rows under a max height are separated by stripes only, as before */
	.p-data-table-borderless tbody td,
	.p-data-table tbody > tr:last-child > td,
	.p-data-table tfoot td {
		@apply border-b-0;
	}

	.p-data-table th.numeric,
	.p-data-table td.numeric {
		@apply text-right;
	}

	.p-data-table th.text-center,
	.p-data-table td.text-center {
		@apply text-center;
	}

	.p-data-table-title {
		@apply flex w-full items-center flex-nowrap text-[length:inherit] font-[inherit] leading-[inherit] [text-align:inherit];
	}

	.p-data-table-title-text {
		@apply flex-1 min-w-0 whitespace-nowrap;
	}

	.p-data-table-sortable {
		@apply hover:bg-[#333337];
	}

	/* the whole cell is the button */
	.p-data-table-sortable > .p-data-table-title {
		@apply -mx-2.5 -my-1.25 px-2.5 py-1.25 w-[calc(100%+20px)] cursor-pointer;
	}

	.p-data-table th.p-data-table-sorting {
		@apply bg-[#333337];
	}

	.p-data-table td.p-data-table-sorting {
		@apply bg-transparent;
	}

	.p-data-table-sorter {
		@apply relative inline-flex items-center justify-center size-[15px] ml-1 text-[rgba(255,255,255,0.38)] align-[-0.2em];
	}

	.p-data-table-sorter svg {
		@apply size-3.5;
	}

	.p-data-table-sorter-asc,
	.p-data-table-sorter-desc {
		@apply text-[#6ea8fe];
	}

	.p-data-table-sorter-asc svg {
		@apply rotate-180;
	}

	.p-data-table tr.p-data-table-striped,
	.p-data-table tr.p-data-table-striped > td {
		@apply bg-[rgb(3,5,10)];
	}

	.p-data-table-popover tr.p-data-table-striped,
	.p-data-table-popover tr.p-data-table-striped > td,
	.p-data-table-popover td.p-data-table-sorting {
		@apply bg-[#151515];
	}

	.p-data-table-popover .p-data-table-box {
		@apply border-0 rounded-none;
	}

	.p-data-table-popover th,
	.p-data-table-popover td {
		@apply border-[rgb(88,88,94)];
	}

	.p-data-table tbody > tr:not(.p-data-table-empty-row, .p-data-table-spacer):hover,
	.p-data-table tbody > tr:not(.p-data-table-empty-row, .p-data-table-spacer):hover > td {
		@apply bg-[rgba(255,255,255,0.03)];
	}

	.p-data-table tr.p-data-table-spacer > td {
		@apply p-0 border-0 bg-transparent;
	}

	.p-data-table-clickable {
		@apply cursor-pointer;
	}

	.p-data-table th.p-data-table-expand-cell {
		@apply w-12;
	}

	.p-data-table td.p-data-table-expand-cell {
		@apply w-12 p-0 text-center leading-none;
	}

	.p-data-table-expand-button {
		@apply inline-flex items-center justify-center size-6 rounded-sm cursor-pointer align-middle;
	}

	/* the expand and empty boxes are the box's width themselves: their cell
	   adds no padding, or the row would be wider than the box */
	.p-data-table-expanded > td,
	.p-data-table-empty-row > td {
		@apply p-0;
	}

	.p-data-table-expand {
		@apply sticky left-0 overflow-hidden px-5 py-2.5 box-border;
	}

	/* the summary row continues the body: a border above, the row colour */
	.p-data-table tfoot td {
		@apply border-t border-[#2d2d30];
	}

	/* the empty state has no row colour */
	.p-data-table-table:has(> tbody > .p-data-table-empty-row) {
		@apply bg-transparent;
	}

	.p-data-table tr.p-data-table-empty-row > td {
		@apply p-0 bg-transparent;
	}

	.p-data-table-empty {
		@apply sticky left-0 flex items-center justify-center py-12;
	}

	.p-data-table-empty-default {
		@apply flex flex-col items-center text-[rgba(255,255,255,0.55)];
	}

	.p-data-table-empty-default svg {
		@apply size-10 mb-2 text-[rgba(255,255,255,0.38)];
	}
</style>
