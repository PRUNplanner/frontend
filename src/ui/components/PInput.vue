<script setup lang="ts">
	import { computed, inject, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import type { FieldStatus, SizeKey } from "@/ui/ui.types";
	import { formItemKey } from "@/ui/formItem";
	import { fieldStatusConfig, inputConfig } from "@/ui/styles";

	const value = defineModel<string | null | undefined>("value", {
		required: true,
	});

	const {
		disabled = false,
		size = "md",
		placeholder = undefined,
		rows = 5,
		type = "input",
		ariaLabel = undefined,
		autocomplete = "off",
		status = undefined,
	} = defineProps<{
		disabled?: boolean;
		size?: SizeKey;
		placeholder?: string;
		rows?: number;
		type?: "input" | "textarea" | "password" | "email";
		/** accessible name when no <label> is linked to the field */
		ariaLabel?: string;
		/** e.g. "username", "current-password", "new-password" */
		autocomplete?: string;
		/** a PFormItem with an error sets "error" */
		status?: FieldStatus;
	}>();

	// labelled by the surrounding PFormItem unless it has its own name
	const formItem = inject(formItemKey, null);
	const inputId = computed(() => (ariaLabel ? undefined : formItem?.inputId));
	const fieldStatus = computed(() => status ?? formItem?.status.value);

	const inputEl = ref<HTMLInputElement | null>(null);

	const placeholderText = computed(
		() => placeholder ?? t("common.ui.placeholder.please_input")
	);

	function focus() {
		inputEl.value?.focus();
	}

	defineExpose({ focus, inputEl });

	defineEmits<{
		(e: "keydown", event: KeyboardEvent): void;
	}>();

	function onInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value.value = target.value;
	}
</script>

<template>
	<div>
		<div
			:class="[
				inputConfig.container,
				inputConfig.sizes[size].container,
				type === 'textarea' ? '' : inputConfig.sizes[size].field,
				fieldStatus ? fieldStatusConfig[fieldStatus] : '',
			]">
			<span
				v-if="$slots.prefix"
				class="flex items-center shrink-0 text-muted">
				<slot name="prefix" />
			</span>
			<textarea
				v-if="type === 'textarea'"
				:id="inputId"
				ref="inputEl"
				name="pinput-textarea"
				:disabled="disabled"
				:value="value"
				:rows="rows"
				:placeholder="placeholderText"
				:aria-label="ariaLabel"
				:aria-invalid="fieldStatus === 'error' || undefined"
				:aria-describedby="formItem?.describedBy.value"
				:class="`${inputConfig.sizes[size].input} py-1`"
				:autocomplete="autocomplete"
				@input="onInput"
				@keydown="$emit('keydown', $event)" />
			<input
				v-else
				:id="inputId"
				ref="inputEl"
				name="pinput-input"
				:disabled="disabled"
				:type="type === 'input' ? 'text' : type"
				:value="value"
				:placeholder="placeholderText"
				:aria-label="ariaLabel"
				:aria-invalid="fieldStatus === 'error' || undefined"
				:aria-describedby="formItem?.describedBy.value"
				:class="`${inputConfig.sizes[size].input}`"
				:autocomplete="autocomplete"
				@input="onInput"
				@keydown="$emit('keydown', $event)" />
		</div>
	</div>
</template>
