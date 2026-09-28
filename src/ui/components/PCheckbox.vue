<script setup lang="ts">
	import { computed, inject } from "vue";

	import { formItemKey } from "@/ui/formItem";
	import { checkboxConfig } from "@/ui/styles";
	const checked = defineModel<boolean>("checked");

	const { disabled = false, ariaLabel = undefined } = defineProps<{
		disabled?: boolean;
		/** accessible name when there is no label text or PFormItem */
		ariaLabel?: string;
	}>();

	// labelled by the surrounding PFormItem unless it has its own name
	const formItem = inject(formItemKey, null);
	const inputId = computed(() => (ariaLabel ? undefined : formItem?.inputId));

	const inputBase = computed(() =>
		[
			checkboxConfig.input,
			checkboxConfig.colors.base,
			checkboxConfig.colors.disabled,
		].join(" ")
	);
</script>

<template>
	<div class="pcheckbox" :class="checkboxConfig.container">
		<label :class="checkboxConfig.label">
			<span class="relative flex">
				<input
					:id="inputId"
					v-model="checked"
					:disabled="disabled"
					:aria-label="ariaLabel"
					type="checkbox"
					:class="inputBase" />
				<span :class="checkboxConfig.checkIcon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						:class="checkboxConfig.checkIconSVG"
						viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"></path>
					</svg>
				</span>
			</span>
			<span v-if="$slots.default" class="pl-2">
				<slot />
			</span>
		</label>
	</div>
</template>
