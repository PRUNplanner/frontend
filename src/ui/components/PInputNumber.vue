<script setup lang="ts">
	import { SizeKey } from "@/ui/ui.types";
	import { inputNumberConfig } from "@/ui/styles";

	const value = defineModel<number | null>("value", {
		required: false,
		type: [Number, null],
	});

	const {
		disabled = false,
		size = "md",
		showButtons = false,
		decimals = false,
		min = -Infinity,
		max = Infinity,
		placeholder = "Please Input",
	} = defineProps<{
		disabled?: boolean;
		size?: SizeKey;
		showButtons?: boolean;
		decimals?: boolean;
		min?: number;
		max?: number;
		placeholder?: string;
	}>();

	function onInput(e: Event) {
		const target = e.target as HTMLInputElement;

		// sanitize input
		if (decimals) target.value = target.value.replace(/[^0-9.]/g, "");
		else target.value = target.value.replace(/\D/g, "");

		if (target.value !== "") {
			let numValue = Number(target.value);
			// clamp to min/max
			if (numValue < min) numValue = min;
			if (numValue > max) numValue = max;
			value.value = numValue;
			target.value = String(numValue);
		} else {
			value.value = null;
		}
	}

	function canChange(e: number): boolean {
		if (disabled) return false;
		if (value.value === null || value.value === undefined) return true;

		if (value.value + e >= min && value.value + e <= max) return true;
		return false;
	}

	function change(e: number) {
		if (canChange(e)) {
			if (value.value === null || value.value === undefined)
				value.value = 0;
			value.value += e;
		}
	}
</script>

<template>
	<div>
		<div
			:class="`${inputNumberConfig.container} ${inputNumberConfig.sizes[size].container}`">
			<input
				:disabled="disabled"
				type="text"
				inputmode="numeric"
				:value="value"
				:placeholder="placeholder"
				:class="`${inputNumberConfig.input} ${inputNumberConfig.sizes[size].input}`"
				@input="onInput" />

			<div
				v-if="showButtons"
				:class="`${inputNumberConfig.buttonContainer} ${inputNumberConfig.sizes[size].buttonContainer}`">
				<div
					class="ph-no-capture"
					:class="
						canChange(-1)
							? inputNumberConfig.buttonChangeAllowed
							: inputNumberConfig.buttonChangeUnallowed
					"
					@click="change(-1)">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						viewBox="0 0 24 24">
						<path
							d="M19 12.998H5v-2h14z"
							fill="currentColor"></path>
					</svg>
				</div>
				<div
					class="ph-no-capture"
					:class="
						canChange(1)
							? inputNumberConfig.buttonChangeAllowed
							: inputNumberConfig.buttonChangeUnallowed
					"
					@click="change(1)">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						viewBox="0 0 24 24">
						<path
							d="M19 12.998h-6v6h-2v-6H5v-2h6v-6h2v6h6z"
							fill="currentColor"></path>
					</svg>
				</div>
			</div>
		</div>
	</div>
</template>
