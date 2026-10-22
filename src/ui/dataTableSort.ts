import type { PDataTableColumn, PDataTableSort } from "@/ui/ui.types";

/** row[key]: empty first, then numbers or strings */
function compareKey<T>(key: string) {
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

/**
 * Rows in a data table's sort, a copy; unsorted it returns `data` as is.
 * PDataTable sorts with it, and lists that cut or page before the table
 * (or show the rows without one) sort the same way.
 *
 * @author jplacht
 *
 * @param {T[]} data Rows
 * @param {PDataTableColumn<T>[]} columns Leaf columns
 * @param {PDataTableSort} sort Sort
 * @returns {T[]} Sorted rows
 */
export function sortRows<T>(
	data: T[],
	columns: PDataTableColumn<T>[],
	sort: PDataTableSort
): T[] {
	const col = columns.find((c) => c.key === sort.key);
	if (!col?.sorter || !sort.order) return data;
	const compare = col.sorter === true ? compareKey<T>(col.key) : col.sorter;
	const flag = sort.order === "ascend" ? 1 : -1;
	return data.slice().sort((a, b) => compare(a, b) * flag);
}
