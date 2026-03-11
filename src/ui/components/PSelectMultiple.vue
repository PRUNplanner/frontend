<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		nextTick,
		onBeforeUnmount,
		Ref,
		ref,
		watch,
	} from "vue";
	import { currentlyOpenId } from "@/ui/stateCurrentOpen";
	import { PSelectOption } from "@/ui/ui.types";
	import PInput from "./PInput.vue";
	import PSelectElement from "./PSelectElement.vue";
	import PTag from "./PTag.vue";
	import { createPopper, Instance } from "@popperjs/core";
	import { ClearSharp } from "@vicons/material";

	const value = defineModel<Array<null | string | number | undefined>>(
		"value",
		{
			required: true,
		}
	);

	const {
		options,
		searchable = false,
		disabled = false,
		clearable = true,
		maxItems = Infinity,
	} = defineProps<{
		options: PSelectOption[];
		searchable?: boolean;
		disabled?: boolean;
		clearable?: boolean;
		maxItems?: number;
	}>();

	const open = ref(false);
	const searchString: Ref<string | null> = ref(null);
	const highlightedIndex = ref(0);

	let popperInstance: Instance | null = null;
	const triggerRef = ref<HTMLElement | null>(null);
	const dropdownRef = ref<HTMLElement | null>(null);
	const searchInputRef = ref<{ focus: () => void } | null>(null);
	const componentId = `select-${Math.random().toString(36).substring(2, 9)}`;
	const dropdownPosition = ref({ top: "0px", left: "0px", width: "100px" });

	/** Selected items as { value, label } for correct remove by value */
	const selectedEntries: ComputedRef<
		{ value: string | number | undefined; label: string }[]
	> = computed(() => {
		const allOptions: PSelectOption[] = [];
		options.forEach((e) => {
			if (!e.children) allOptions.push(e);
			else {
				e.children.forEach((c) => allOptions.push(c));
			}
		});
		return value.value
			.map((val) => {
				const opt = allOptions.find((a) => a.value === val);
				return opt ? { value: opt.value, label: opt.label } : null;
			})
			.filter(
				(
					x
				): x is { value: string | number | undefined; label: string } =>
					x != null
			);
	});

	const filteredOptions: ComputedRef<PSelectOption[]> = computed(() => {
		if (searchString.value === null || searchString.value === "")
			return options;
		else {
			return options.filter(
				(f) =>
					f.label
						.toLowerCase()
						.includes(searchString.value!.toLowerCase()) ||
					f.children?.filter((c) =>
						c.label
							.toLowerCase()
							.includes(searchString.value!.toLowerCase())
					)
			);
		}
	});

	function change(e: string | number | undefined) {
		if (disabled) return;
		if (!(value.value.length + 1 <= maxItems)) return;

		const index = value.value.indexOf(e);

		// not in value, add it
		if (index === -1) {
			value.value.push(e);
		} else {
			value.value.splice(index, 1);
		}
		value.value = [...value.value];
	}

	const toggleOpen = async () => {
		if (disabled) return;

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

	function clear(): void {
		value.value = [];
		searchString.value = null;
	}

	function removeElement(v: string | number | undefined): void {
		if (!disabled && v !== undefined) {
			const index = value.value.indexOf(v, 0);
			if (index !== -1) {
				value.value.splice(index, 1);
				value.value = [...value.value];
			}
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		if (!open.value) return;

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
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (
			!triggerRef.value?.contains(e.target as Node) &&
			!dropdownRef.value?.contains(e.target as Node)
		) {
			open.value = false;
			searchString.value = null;
		}
	}

	watch(open, async (val) => {
		if (val) {
			await nextTick();
			if (searchable && searchInputRef.value) {
				searchInputRef.value.focus();
			}
		}
	});

	watch(open, (val) => {
		if (!val && popperInstance) {
			popperInstance.destroy();
			popperInstance = null;
		}

		if (val) {
			document.addEventListener("click", handleClickOutside);
		} else {
			document.removeEventListener("click", handleClickOutside);
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
		class="pselect-multiple leading-none outline-none"
		tabindex="0"
		@keydown="onKeyDown">
		<label name="pselect-multiple-label">
			<div
				class="flex flex-row items-center cursor-pointer bg-white/5 py-1 text-white/80 rounded-sm px-2 min-h-7"
				@click="toggleOpen">
				<div class="w-full max-w-full grow">
					<template v-if="selectedEntries.length > 0">
						<div class="flex w-full max-w-full flex-wrap gap-y-1">
							<PTag
								v-for="entry in selectedEntries"
								:key="String(entry.value)"
								:value="entry.label"
								type="secondary"
								@click.stop="removeElement(entry.value)">
								<template #icon><ClearSharp /></template>
							</PTag>
						</div>
					</template>
					<template v-else> Select Options </template>
				</div>

				<div
					v-if="clearable && value.length !== 0"
					class="text-white/60 w-4"
					@click.stop="clear">
					<ClearSharp />
				</div>
				<div class="text-white w-4" @click.stop="toggleOpen">
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
				class="z-5000 p-1 bg-gray-900 text-white rounded-sm shadow-lg max-h-75 overflow-auto"
				:style="dropdownPosition">
				<div
					class="w-full flex flex-col bg-gray-900 child:py-1 child:px-2 child:hover:bg-gray-800 rounded-b-sm">
					<PInput
						v-if="searchable"
						ref="searchInputRef"
						v-model:value="searchString"
						placeholder="Search"
						@keydown="onKeyDown" />
					<PSelectElement
						v-for="(option, idx) in filteredOptions"
						:key="option.value"
						:option="option"
						:selected-value="value"
						:highlighted="idx === highlightedIndex"
						@click="(v) => change(v)" />

					<template v-if="filteredOptions.length === 0">
						<div class="text-center text-xs">No Results</div>
					</template>
				</div>
			</div>
		</Teleport>
	</div>
</template>
