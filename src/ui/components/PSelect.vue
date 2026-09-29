<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		nextTick,
		onBeforeUnmount,
		provide,
		inject,
		type Ref,
		ref,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { formItemKey } from "@/ui/formItem";
	import { currentlyOpenId } from "@/ui/stateCurrentOpen";
	import type { PSelectOption } from "@/ui/ui.types";
	import PInput from "./PInput.vue";
	import PSelectElement from "./PSelectElement.vue";
	import { createPopper, type Instance } from "@popperjs/core";
	import { ClearSharp } from "@vicons/material";

	const value = defineModel<null | string | number | undefined>("value", {
		required: true,
	});

	const {
		options,
		searchable = false,
		disabled = false,
		clearable = false,
		placeholder = undefined,
		ariaLabel = undefined,
	} = defineProps<{
		options: PSelectOption[];
		searchable?: boolean;
		disabled?: boolean;
		clearable?: boolean;
		placeholder?: string;
		/** accessible name when not inside a PFormItem */
		ariaLabel?: string;
	}>();

	const placeholderText = computed(
		() => placeholder ?? t("common.ui.placeholder.please_select")
	);

	const open = ref(false);
	const searchString: Ref<string | null> = ref(null);
	const highlightedIndex = ref(0);
	const useSearch: Ref<boolean> = ref(false);

	let popperInstance: Instance | null = null;
	const triggerRef = ref<HTMLElement | null>(null);
	const dropdownRef = ref<HTMLElement | null>(null);
	const componentId = `select-${Math.random().toString(36).substring(2, 9)}`;

	const displayValue: ComputedRef<string> = computed(() => {
		const allOptions: PSelectOption[] = [];

		options.forEach((e) => {
			if (!e.children) allOptions.push(e);
			else {
				e.children.forEach((c) => allOptions.push(c));
			}
		});

		return (
			allOptions.find((f) => f.value === value.value)?.label ??
			placeholderText.value
		);
	});

	const filteredOptions: ComputedRef<PSelectOption[]> = computed(() => {
		if (searchString.value === null || searchString.value === "")
			return options;
		const search = searchString.value.toLowerCase();
		return options
			.map((f: PSelectOption) => {
				if (f.children) {
					const matchingChildren = f.children.filter(
						(c: PSelectOption) =>
							c.label.toLowerCase().includes(search)
					);
					if (matchingChildren.length === 0) return null;
					return { ...f, children: matchingChildren };
				}
				if (f.label.toLowerCase().includes(search)) return f;
				return null;
			})
			.filter((x: PSelectOption | null): x is PSelectOption => x != null);
	});

	function change(e: string | number | undefined) {
		if (disabled) return;

		if (value.value === e && clearable) value.value = null;
		else value.value = e;

		open.value = false;
	}

	function clear(): void {
		value.value = null;
		useSearch.value = false;
		searchString.value = null;
	}

	const toggleOpen = async () => {
		if (disabled) return;

		if (searchable) {
			useSearch.value = true;
		}

		if (currentlyOpenId.value && currentlyOpenId.value !== componentId) {
			currentlyOpenId.value = componentId;
			open.value = true;
		} else {
			open.value = !open.value;
			currentlyOpenId.value = open.value ? componentId : null;
		}

		await nextTick();

		if (open.value && triggerRef.value && dropdownRef.value) {
			// Set min-width based on trigger
			const width = triggerRef.value.offsetWidth;
			dropdownRef.value.style.minWidth = `${width}px`;

			// Create Popper instance
			popperInstance = createPopper(triggerRef.value, dropdownRef.value, {
				placement: "bottom-start",
				modifiers: [
					{
						name: "offset",
						options: {
							offset: [0, 4],
						},
					},
					{
						name: "preventOverflow",
						options: {
							boundary: "viewport",
						},
					},
				],
			});
		}
	};

	// labelled by the surrounding PFormItem; the inner search PInput is not
	const formItem = inject(formItemKey, null);
	provide(formItemKey, null);

	function onKeyDown(e: KeyboardEvent) {
		if (!open.value) {
			if (["Enter", " ", "ArrowDown"].includes(e.key)) {
				e.preventDefault();
				toggleOpen();
			}
			return;
		}

		if (e.key === "Escape") {
			open.value = false;
			// the search input may have had focus; keep it on the select
			triggerRef.value?.focus();
			return;
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			highlightedIndex.value = Math.min(
				highlightedIndex.value + 1,
				filteredOptions.value.length - 1
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const option = filteredOptions.value[highlightedIndex.value];
			if (option) change(option.value);
			triggerRef.value?.focus();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (
			!triggerRef.value?.contains(e.target as Node) &&
			!dropdownRef.value?.contains(e.target as Node)
		) {
			open.value = false;
		}
	}

	function ensureOpened() {
		if (!open.value) toggleOpen();
	}

	watch(open, (val) => {
		if (!val && popperInstance) {
			popperInstance.destroy();
			popperInstance = null;
		}

		if (val) {
			document.addEventListener("click", handleClickOutside);
		} else {
			document.removeEventListener("click", handleClickOutside);
			useSearch.value = false;
			searchString.value = null;
		}
	});

	watch(currentlyOpenId, (newId) => {
		if (newId !== componentId && open.value) open.value = false;
	});

	onBeforeUnmount(() => {
		if (popperInstance) {
			popperInstance.destroy();
			popperInstance = null;
		}

		if (currentlyOpenId.value === componentId) currentlyOpenId.value = null;

		document.removeEventListener("click", handleClickOutside);
	});
</script>

<template>
	<div
		ref="triggerRef"
		class="pselect leading-none focus-visible:-outline-offset-2"
		tabindex="0"
		role="combobox"
		aria-haspopup="listbox"
		:aria-expanded="open"
		:aria-disabled="disabled"
		:aria-label="ariaLabel"
		:aria-labelledby="ariaLabel ? undefined : formItem?.labelId"
		@keydown="onKeyDown">
		<label name="pselect-label">
			<div
				class="flex flex-row items-center cursor-pointer bg-white/5 text-white/80 rounded-sm pr-2 min-h-7"
				:class="!useSearch ? 'py-1 ' : ''"
				@click="toggleOpen">
				<div
					v-if="!useSearch"
					class="grow px-2 text-nowrap"
					@click.stop="ensureOpened">
					{{ displayValue }}
				</div>
				<div
					v-else
					class="grow child:child:bg-transparent!"
					@click.stop="ensureOpened">
					<PInput
						v-model:value="searchString"
						:placeholder="t('common.ui.placeholder.search')" />
				</div>
				<div
					v-if="value && value !== null && clearable"
					class="text-white/60 w-4"
					@click.stop="clear">
					<ClearSharp />
				</div>
				<div class="text-white w-4" @click.prevent.stop="toggleOpen">
					<svg
						viewBox="0 0 16 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg">
						<path
							d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z"
							fill="currentColor" />
					</svg>
				</div>
			</div>
		</label>

		<Teleport to="body">
			<div
				v-if="open"
				ref="dropdownRef"
				data-pselect-dropdown
				class="z-5000 p-1 bg-gray-900 text-white rounded-sm shadow-lg max-h-75 overflow-auto">
				<div
					class="w-full flex flex-col bg-gray-900 child:py-1 child:px-2 child:hover:bg-gray-800 rounded-b-sm">
					<PSelectElement
						v-for="(option, idx) in filteredOptions"
						:key="option.value"
						:option="option"
						:selected-value="value"
						:highlighted="idx === highlightedIndex"
						@click="(v) => change(v)" />

					<template v-if="filteredOptions.length === 0">
						<div class="text-center text-xs">
							{{ $t("common.ui.select.no_results") }}
						</div>
					</template>
				</div>
			</div>
		</Teleport>
	</div>
</template>
