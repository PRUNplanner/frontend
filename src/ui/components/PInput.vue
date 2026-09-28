<script setup lang="ts">
	import { computed, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import type { SizeKey } from "@/ui/ui.types";
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
	} = defineProps<{
		disabled?: boolean;
		size?: SizeKey;
		placeholder?: string;
		rows?: number;
		type?: "input" | "textarea" | "password";
		/** accessible name when no <label> is linked to the field */
		ariaLabel?: string;
	}>();

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
			<input
				v-if="type === 'input'"
				ref="inputEl"
				name="pinput-input"
				:disabled="disabled"
				type="text"
				:value="value"
				:placeholder="placeholderText"
				:aria-label="ariaLabel"
				:class="`${inputConfig.sizes[size].input}`"
				autocomplete="off"
				@input="onInput" />
			<input
				v-else-if="type === 'password'"
				ref="inputEl"
				name="pinput-input"
				:disabled="disabled"
				type="password"
				:value="value"
				:placeholder="placeholderText"
				:aria-label="ariaLabel"
				:class="`${inputConfig.sizes[size].input}`"
				autocomplete="off"
				@input="onInput" />
			<textarea
				v-else-if="type === 'textarea'"
				ref="inputEl"
				name="pinput-textarea"
				:disabled="disabled"
				type="text"
				:value="value"
				:rows="rows"
				:placeholder="placeholderText"
				:aria-label="ariaLabel"
				:class="`${inputConfig.sizes[size].input}`"
				autocomplete="off"
				@input="onInput" />
		</div>
	</div>
</template>
