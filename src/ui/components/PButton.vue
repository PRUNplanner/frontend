<script setup lang="ts">
	import { computed, useAttrs, useSlots } from "vue";

	import PSpin from "./PSpin.vue";

	import type { ButtonColorKey, SizeKey } from "@/ui/ui.types";
	import { buttonConfig } from "@/ui/styles";

	const {
		loading = false,
		disabled = false,
		size = "md",
		type = "primary",
		htmlType = "button",
	} = defineProps<{
		loading?: boolean;
		disabled?: boolean;
		size?: SizeKey;
		type?: ButtonColorKey;
		htmlType?: "button" | "submit";
	}>();

	defineEmits<{
		(e: "click", event: MouseEvent): void;
	}>();

	// icon-only buttons need a name for screen readers
	if (import.meta.env.DEV) {
		const slots = useSlots();
		const attrs = useAttrs();
		if (!slots.default && !attrs["aria-label"] && !attrs["aria-labelledby"])
			console.warn("PButton: icon-only button needs an aria-label");
	}

	const buttonBase = computed(() =>
		[
			buttonConfig.base,
			buttonConfig.sizes[size].base,
			buttonConfig.colors[type].base,
			buttonConfig.colors[type].hover,
			buttonConfig.colors[type].disabled,
		].join(" ")
	);
</script>

<template>
	<button
		class="pbutton"
		:type="htmlType"
		:class="buttonBase"
		:disabled="disabled"
		:aria-busy="loading ? 'true' : 'false'"
		@click="(e) => $emit('click', e)">
		<PSpin v-if="loading" color="white" />

		<span
			v-if="$slots.icon && !loading"
			key="icon"
			class=""
			:class="buttonConfig.sizes[size].icon">
			<slot name="icon" />
		</span>
		<span v-if="$slots.default" class="inline-block">
			<slot />
		</span>
	</button>
</template>
