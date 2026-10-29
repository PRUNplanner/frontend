import { type Ref, ref } from "vue";

/**
 * Sort state of a table with clickable headers: clicking the sorted column
 * flips the direction, another column starts in its first direction.
 *
 * @param {K} initialKey Column sorted at first
 * @param {(key: K) => boolean} descendingFirst Columns that start descending
 * @returns Sort key, direction, the header click and the aria-sort value
 */
export function useSortState<K extends string>(
	initialKey: K,
	descendingFirst: (key: K) => boolean
) {
	const firstDir = (key: K): 1 | -1 => (descendingFirst(key) ? -1 : 1);

	const sortKey = ref(initialKey) as Ref<K>;
	const sortDir = ref<1 | -1>(firstDir(initialKey));

	function sortBy(key: K): void {
		if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1;
		else {
			sortKey.value = key;
			sortDir.value = firstDir(key);
		}
	}

	const ariaSort = (key: K) =>
		sortKey.value === key
			? sortDir.value === 1
				? "ascending"
				: "descending"
			: undefined;

	return { sortKey, sortDir, sortBy, ariaSort };
}
