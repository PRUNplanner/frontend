<script setup lang="ts">
	import { computed, inject, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import type { SizeKey } from "@/ui/ui.types";
	import { formItemKey } from "@/ui/formItem";
	import { inputConfig } from "@/ui/styles";

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
	} = defineProps<{
		disabled?: boolean;
		size?: SizeKey;
		placeholder?: string;
		rows?: number;
		type?: "input" | "textarea" | "password";
		/** accessible name when no <label> is linked to the field */
		ariaLabel?: string;
		/** e.g. "username", "current-password", "new-password" */
		autocomplete?: string;
	}>();

	// labelled by the surrounding PFormItem unless it has its own name
	const formItem = inject(formItemKey, null);
	const inputId = computed(() => (ariaLabel ? undefined : formItem?.inputId));

	const inputEl = ref<HTMLInputElement | null>(null);

	const placeholderText = computed(
		() => placeholder ?? t("common.ui.placeholder.please_input")
	);

	function focus() {
		inputEl.value?.focus();
	}

	defineExpose({ focus, inputEl });

	function onInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value.value = target.value;
	}
</script>

<template>
	<div>
		<div
			:class="`${inputConfig.container} ${inputConfig.sizes[size].container}`">
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
				:class="`${inputConfig.sizes[size].input}`"
				:autocomplete="autocomplete"
				@input="onInput" />
			<input
				v-else
				:id="inputId"
				ref="inputEl"
				name="pinput-input"
				:disabled="disabled"
				:type="type === 'password' ? 'password' : 'text'"
				:value="value"
				:placeholder="placeholderText"
				:aria-label="ariaLabel"
				:class="`${inputConfig.sizes[size].input}`"
				:autocomplete="autocomplete"
				@input="onInput" />
		</div>
	</div>
</template>
