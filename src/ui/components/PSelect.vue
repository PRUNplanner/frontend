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
		size = "md",
		status = undefined,
	} = defineProps<{
		options: PSelectOption[];
		searchable?: boolean;
		disabled?: boolean;
		clearable?: boolean;
		placeholder?: string;
		/** accessible name when not inside a PFormItem */
		ariaLabel?: string;
		size?: SizeKey;
		/** a PFormItem with an error sets "error" */
		status?: FieldStatus;
	}>();

	const placeholderText = computed(
		() => placeholder ?? t("common.ui.placeholder.please_select")
	);

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
		openList,
		close,
		toggle,
		onKeydown,
		onFocusout,
	} = useSelectList(() => options, triggerRef, {
		disabled: () => disabled,
		searchable: () => searchable,
		searchInput,
		pick: change,
	});

	const displayValue: ComputedRef<string> = computed(
		() =>
			options
				.flatMap((o) => o.children ?? [o])
				.find((f) => f.value === value.value)?.label ??
			placeholderText.value
	);

	function change(e: string | number | undefined) {
		if (disabled) return;

		if (value.value === e && clearable) value.value = null;
		else value.value = e;

		close(true);
	}

	function clear(): void {
		value.value = null;
		close();
	}

	// labelled by the surrounding PFormItem; the inner search PInput is not
	const formItem = inject(formItemKey, null);
	provide(formItemKey, null);
	const fieldStatus = computed(() => status ?? formItem?.status.value);
</script>

<template>
	<div
		ref="triggerRef"
		class="pselect leading-none focus-visible:-outline-offset-2"
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
			class="flex flex-row items-center cursor-pointer bg-white/5 text-ink rounded-control pr-2 pointer-coarse:min-h-11"
			:class="[
				open && searchable ? '' : 'py-1',
				size === 'sm' ? 'min-h-6 text-xs' : 'min-h-7',
				fieldStatus ? fieldStatusConfig[fieldStatus] : '',
			]"
			@click="toggle">
			<div
				v-if="!(open && searchable)"
				class="grow px-2 text-nowrap"
				@click.stop="openList">
				{{ displayValue }}
			</div>
			<input
				v-else
				ref="searchInput"
				v-model="searchString"
				type="text"
				autocomplete="off"
				class="grow self-stretch min-w-0 px-2 bg-transparent focus-visible:-outline-offset-2"
				aria-autocomplete="list"
				:aria-controls="listId"
				:aria-activedescendant="activeId"
				:aria-label="t('common.ui.placeholder.search')"
				:placeholder="t('common.ui.placeholder.search')"
				@click.stop />
			<div
				v-if="value && value !== null && clearable"
				class="text-muted w-4"
				@click.stop="clear">
				<ClearSharp />
			</div>
			<div class="text-white w-4" @click.prevent.stop="toggle">
				<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z"
						fill="currentColor" />
				</svg>
			</div>
		</div>

		<Teleport v-if="open" to="body">
			<!-- mousedown keeps focus in the select, so a click picks before focus leaves -->
			<div
				ref="panel"
				:class="panelConfig.panel"
				class="pselect-list p-1 max-h-75 overflow-auto text-white"
				:style="{ zIndex: Z_LIST }"
				@mousedown.prevent
				@focusout="onFocusout">
				<div :id="listId" role="listbox" class="w-full flex flex-col">
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
