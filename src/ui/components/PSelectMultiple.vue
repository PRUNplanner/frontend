<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		inject,
		provide,
		type Ref,
		ref,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useSelectList } from "@/ui/useSelectList";

	// Types & Interfaces
	import type { FieldStatus, PSelectOption, SizeKey } from "@/ui/ui.types";

	// UI
	import { formItemKey } from "@/ui/formItem";
	import { fieldStatusConfig, panelConfig } from "@/ui/styles";
	import { Z_LIST } from "@/ui/zIndex";
	import PSelectElement from "./PSelectElement.vue";
	import PTag from "./PTag.vue";
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
		clearable = false,
		placeholder = undefined,
		maxItems = Infinity,
		ariaLabel = undefined,
		size = "md",
		status = undefined,
	} = defineProps<{
		options: PSelectOption[];
		searchable?: boolean;
		disabled?: boolean;
		clearable?: boolean;
		placeholder?: string;
		maxItems?: number;
		/** accessible name when not inside a PFormItem */
		ariaLabel?: string;
		size?: SizeKey;
		/** a PFormItem with an error sets "error" */
		status?: FieldStatus;
	}>();

	const triggerRef: Ref<HTMLElement | null> = ref(null);
	const searchInput: Ref<HTMLInputElement | null> = ref(null);

	const {
		listId,
		open,
		panel,
		searchString,
		filteredOptions,
		selectableOffsets,
		keys,
		highlightOf,
		activeId,
		toggle,
		onKeydown,
		onFocusout,
	} = useSelectList(() => options, triggerRef, {
		disabled: () => disabled,
		searchable: () => searchable,
		searchInput,
		pick: change,
	});

	/** Selected items as { value, label } for correct remove by value */
	const selectedEntries: ComputedRef<
		{ value: string | number | undefined; label: string }[]
	> = computed(() => {
		const allOptions = options.flatMap((o) => o.children ?? [o]);
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

	// new arrays only, the parent's array is never changed in place
	function change(e: string | number | undefined) {
		if (disabled) return;

		if (value.value.includes(e))
			value.value = value.value.filter((v) => v !== e);
		// maxItems limits adding, removing always works
		else if (value.value.length < maxItems)
			value.value = [...value.value, e];
	}

	function clear(): void {
		if (disabled) return;
		value.value = [];
		searchString.value = null;
	}

	function removeElement(v: string | number | undefined): void {
		if (disabled || v === undefined || !value.value.includes(v)) return;
		// removed by keyboard: focus stays in the select, not on the page
		if (triggerRef.value?.contains(document.activeElement))
			triggerRef.value.focus();
		value.value = value.value.filter((x) => x !== v);
	}

	// labelled by the surrounding PFormItem
	const formItem = inject(formItemKey, null);
	provide(formItemKey, null);
	const fieldStatus = computed(() => status ?? formItem?.status.value);
</script>

<template>
	<div
		ref="triggerRef"
		class="pselect-multiple leading-none focus-visible:-outline-offset-2"
		tabindex="0"
		role="combobox"
		aria-haspopup="listbox"
		:aria-expanded="open"
		:aria-controls="open ? listId : undefined"
		:aria-activedescendant="activeId"
		:aria-disabled="disabled"
		:aria-label="ariaLabel"
		:aria-labelledby="ariaLabel ? undefined : formItem?.labelId"
		:aria-describedby="formItem?.describedBy.value"
		:aria-invalid="fieldStatus === 'error' || undefined"
		@keydown="onKeydown"
		@focusout="onFocusout">
		<div
			class="flex flex-row items-center cursor-pointer bg-white/5 py-0.5 text-ink rounded-control px-2 pointer-coarse:min-h-11"
			:class="[
				size === 'sm' ? 'min-h-6 text-xs' : 'min-h-7',
				fieldStatus ? fieldStatusConfig[fieldStatus] : '',
			]"
			@click="toggle">
			<div class="w-full max-w-full grow">
				<template v-if="selectedEntries.length > 0">
					<div class="flex w-full max-w-full flex-wrap gap-y-1">
						<PTag
							v-for="entry in selectedEntries"
							:key="String(entry.value)"
							:value="entry.label"
							:size="size"
							type="secondary"
							closable
							@close="removeElement(entry.value)" />
					</div>
				</template>
				<template v-else>
					{{ placeholder ?? $t("common.ui.select.select_options") }}
				</template>
			</div>

			<div
				v-if="clearable && !disabled && value.length !== 0"
				class="text-muted w-4"
				@click.stop="clear">
				<ClearSharp />
			</div>
			<div class="text-white w-4" @click.stop="toggle">
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

		<Teleport v-if="open" to="body">
			<div
				ref="panel"
				:class="panelConfig.panel"
				class="pselect-list p-1 max-h-75 overflow-auto text-white"
				:style="{ zIndex: Z_LIST }"
				@focusout="onFocusout">
				<input
					v-if="searchable"
					ref="searchInput"
					v-model="searchString"
					type="text"
					autocomplete="off"
					class="w-full h-7 mb-1 px-2 rounded-control bg-white/5 focus-visible:-outline-offset-2"
					aria-autocomplete="list"
					:aria-controls="listId"
					:aria-activedescendant="activeId"
					:aria-label="t('common.ui.placeholder.search')"
					:placeholder="t('common.ui.placeholder.search')"
					@keydown="onKeydown" />
				<!-- mousedown keeps focus in the select, so a click picks before focus leaves -->
				<div
					:id="listId"
					role="listbox"
					aria-multiselectable="true"
					class="w-full flex flex-col"
					@mousedown.prevent>
					<PSelectElement
						v-for="(option, idx) in filteredOptions"
						:key="keys[idx]"
						:option="option"
						:selected-value="value"
						:highlighted-index="highlightOf(option, idx)"
						:list-id="listId"
						:first-index="selectableOffsets[idx]"
						@click="(v) => change(v)" />
				</div>
				<div
					v-if="filteredOptions.length === 0"
					class="py-1 px-2 text-center text-xs">
					{{ $t("common.ui.select.no_results") }}
				</div>
			</div>
		</Teleport>
	</div>
</template>
