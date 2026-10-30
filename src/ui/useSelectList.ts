import {
	computed,
	type ComputedRef,
	nextTick,
	onBeforeUnmount,
	type Ref,
	ref,
	useId,
	watch,
} from "vue";

// Composables
import { createFloating } from "@/ui/popper";
import { useOverlayLayer } from "@/ui/useOverlayLayer";

// Util
import { optionKeys } from "@/ui/optionKeys";

// Types & Interfaces
import type { PSelectOption } from "@/ui/ui.types";

type Value = PSelectOption["value"];

/**
 * The list of PSelect and PSelectMultiple: open state, search, filtering,
 * keyboard highlight and listbox ids. The list is a non-modal layer
 * (useOverlayLayer), so Esc closes it before a modal or popover around it,
 * and positioned with createFloating. It closes on a click outside and when
 * focus leaves select and list.
 *
 * @author jplacht
 *
 * @param {() => PSelectOption[]} options Options, groups with children
 * @param {Ref<HTMLElement | null>} root The select's root (the combobox)
 * @param {Object} config disabled, searchable, the search input's ref and
 * pick (Enter or a click on an option)
 * @returns list state, refs and handlers for the select's template
 */
export function useSelectList(
	options: () => PSelectOption[],
	root: Ref<HTMLElement | null>,
	config: {
		disabled: () => boolean;
		searchable: () => boolean;
		searchInput: Ref<{ focus: () => void } | null>;
		pick: (value: Value) => void;
	}
) {
	const listId = useId();
	const open: Ref<boolean> = ref(false);
	const panel: Ref<HTMLElement | null> = ref(null);
	const searchString: Ref<string | null> = ref(null);
	const highlightedIndex: Ref<number> = ref(0);

	const filteredOptions: ComputedRef<PSelectOption[]> = computed(() => {
		if (searchString.value === null || searchString.value === "")
			return options();
		const search = searchString.value.toLowerCase();
		// 0: whole first word ("EXT" in "EXT (Extractor)"), 1: label prefix,
		// 2: anywhere; a group by its best child; ties keep their order
		const rank = (o: Omit<PSelectOption, "value">): number => {
			if (o.children) return Math.min(...o.children.map(rank));
			const label = o.label.toLowerCase();
			if (label.split(/[\s(]/, 1)[0] === search) return 0;
			return label.startsWith(search) ? 1 : 2;
		};
		const byRank = <T extends Omit<PSelectOption, "value">>(list: T[]) =>
			list.sort((a, b) => rank(a) - rank(b));
		return byRank(
			options()
				.map((f) => {
					if (f.children) {
						const children = f.children.filter((c) =>
							c.label.toLowerCase().includes(search)
						);
						return children.length
							? { ...f, children: byRank(children) }
							: null;
					}
					return f.label.toLowerCase().includes(search) ? f : null;
				})
				.filter((x): x is PSelectOption => x != null)
		);
	});

	// what arrow keys and Enter move through: group children, not headers
	const selectableOptions: ComputedRef<PSelectOption[]> = computed(() =>
		filteredOptions.value.flatMap((o) => o.children ?? [o])
	);
	// unique v-for keys, also for a missing or repeated value
	const keys = computed(() => optionKeys(filteredOptions.value));
	// index in selectableOptions of each filtered option's first entry
	const selectableOffsets: ComputedRef<number[]> = computed(() => {
		let offset = 0;
		return filteredOptions.value.map((o) => {
			const start = offset;
			offset += o.children?.length ?? 1;
			return start;
		});
	});

	watch(searchString, () => (highlightedIndex.value = 0));

	// -1 for every option but the one holding the highlight, so an arrow key
	// re-renders two options instead of the whole list
	function highlightOf(option: PSelectOption, idx: number): number {
		const local = highlightedIndex.value - selectableOffsets.value[idx];
		return local >= 0 && local < (option.children?.length ?? 1)
			? local
			: -1;
	}

	/** the highlighted option's id, for aria-activedescendant */
	const activeId = computed(() =>
		open.value && selectableOptions.value.length
			? `${listId}-${highlightedIndex.value}`
			: undefined
	);

	function within(target: EventTarget | null): boolean {
		return (
			target instanceof Node &&
			(!!root.value?.contains(target) || !!panel.value?.contains(target))
		);
	}

	function openList(): void {
		if (!config.disabled()) open.value = true;
	}

	/**
	 * @param {boolean} refocus Back to the combobox (Esc, Enter), e.g. from
	 * the search input that the render removes
	 */
	function close(refocus = false): void {
		if (!open.value) return;
		const active = document.activeElement;
		if (refocus && (!active || active === document.body || within(active)))
			root.value?.focus();
		open.value = false;
	}

	function toggle(): void {
		if (open.value) close();
		else openList();
	}

	const { inLayerAbove } = useOverlayLayer(open, panel, {
		autoFocus: () => false,
		close: () => close(true),
		modal: false,
	});

	function onDocumentClick(e: MouseEvent): void {
		const target = e.target as Node;
		if (!within(target) && !inLayerAbove(target)) close();
	}

	/** on the root and the list: focus moving elsewhere closes it */
	function onFocusout(e: FocusEvent): void {
		if (e.relatedTarget && !within(e.relatedTarget)) close();
	}

	function onKeydown(e: KeyboardEvent): void {
		// a button inside the combobox (a chip's remove) handles its own keys
		if (
			config.disabled() ||
			(e.target !== e.currentTarget &&
				e.target instanceof Element &&
				e.target.closest("button"))
		)
			return;
		if (!open.value) {
			if (["Enter", " ", "ArrowDown"].includes(e.key)) {
				e.preventDefault();
				openList();
			}
			return;
		}
		const last = selectableOptions.value.length - 1;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			highlightedIndex.value = Math.min(highlightedIndex.value + 1, last);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const option = selectableOptions.value[highlightedIndex.value];
			if (option) config.pick(option.value);
		}
	}

	let floating: { destroy: () => void } | null = null;
	watch(open, async (value) => {
		floating?.destroy();
		floating = null;
		document.removeEventListener("click", onDocumentClick);
		if (!value) {
			searchString.value = null;
			return;
		}
		// after the render and the layer noting the combobox as the opener
		await nextTick();
		if (!open.value || !root.value || !panel.value) return;
		panel.value.style.minWidth = `${root.value.offsetWidth}px`;
		floating = createFloating(root.value, panel.value, "bottom-start", 4);
		document.addEventListener("click", onDocumentClick);
		if (config.searchable()) config.searchInput.value?.focus();
	});

	onBeforeUnmount(() => {
		floating?.destroy();
		document.removeEventListener("click", onDocumentClick);
	});

	return {
		listId,
		open,
		panel,
		searchString,
		highlightedIndex,
		filteredOptions,
		selectableOffsets,
		keys,
		highlightOf,
		activeId,
		openList,
		close,
		toggle,
		onKeydown,
		onFocusout,
	};
}
