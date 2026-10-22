import { computed, ref, watch, type Ref } from "vue";

// Util
import { sortRows } from "@/ui/dataTableSort";

// Types & Interfaces
import type { PDataTableColumn, PDataTableSort } from "@/ui/ui.types";

/** rows per page once a list is expanded */
const LIST_PAGE_SIZE = 25;

const UNSORTED: PDataTableSort = { key: null, order: false };

/**
 * A ranked list of the market report: its top rows, or all of them in
 * pages after "Show all". The sort applies to the whole list before the
 * cut. A change of `view` (rising or falling, the gaps' basis) resets
 * sort and page and keeps the list open.
 *
 * @author jplacht
 *
 * @param {() => T[]} rows Every row, in the default order
 * @param {number} top Rows while collapsed
 * @param {() => PDataTableColumn<T>[]} [columns] Sortable columns
 * @param {() => unknown} [view] The list's current view
 */
export function useMarketList<T>(
	rows: () => T[],
	top: number,
	columns: () => PDataTableColumn<T>[] = () => [],
	view: () => unknown = () => null
) {
	const sort: Ref<PDataTableSort> = ref(UNSORTED);
	const expanded = ref(false);
	const page = ref(1);

	const sorted = computed(() => sortRows(rows(), columns(), sort.value));
	const total = computed(() => sorted.value.length);
	const pageCount = computed(() =>
		Math.max(1, Math.ceil(total.value / LIST_PAGE_SIZE))
	);
	// the first row shown, 0-based
	const offset = computed(() =>
		expanded.value
			? (Math.min(page.value, pageCount.value) - 1) * LIST_PAGE_SIZE
			: 0
	);
	const visible = computed(() =>
		sorted.value.slice(
			offset.value,
			offset.value + (expanded.value ? LIST_PAGE_SIZE : top)
		)
	);

	watch(view, () => {
		sort.value = UNSORTED;
		page.value = 1;
	});
	watch(sort, () => (page.value = 1));

	function toggle(): void {
		expanded.value = !expanded.value;
		page.value = 1;
	}

	return {
		sort,
		expanded,
		page,
		pageCount,
		total,
		offset,
		visible,
		toggle,
	};
}
