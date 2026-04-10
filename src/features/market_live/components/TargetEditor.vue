<script setup lang="ts">
	import { computed, watch } from "vue";

	// Types & Interfaces
	import type { ComparisonTarget } from "@/features/market_live/cxDetectors.types";

	// UI
	import PSelect from "@/ui/components/PSelect.vue";
	import PInput from "@/ui/components/PInput.vue";
	import PInputNumber from "@/ui/components/PInputNumber.vue";

	const props = defineProps<{
		modelValue: ComparisonTarget;
		fieldType: "string" | "number" | "array";
		operator: string;
	}>();

	const emit = defineEmits(["update:modelValue"]);

	const isStaticOnly = computed(() => props.operator === "matches");

	watch(
		() => props.operator,
		(newOp) => {
			if (newOp === "matches" && props.modelValue.type !== "static") {
				setType("static");
			}
		}
	);

	const internalValue = computed<string | number | undefined>({
		get: () => {
			if (props.modelValue.type === "static")
				return props.modelValue.value;
			if (props.modelValue.type === "previous_pct")
				return props.modelValue.offset;

			return undefined;
		},
		set: (val) => {
			const fallback = props.fieldType === "number" ? 0 : "";
			const safeVal = val ?? fallback;

			if (props.modelValue.type === "static") {
				const processedVal =
					props.fieldType === "number" ? Number(safeVal) : safeVal;
				emit("update:modelValue", {
					...props.modelValue,
					value: processedVal,
				});
			} else if (props.modelValue.type === "previous_pct") {
				emit("update:modelValue", {
					...props.modelValue,
					offset: Number(safeVal),
				});
			}
		},
	});

	const setType = (type: ComparisonTarget["type"]) => {
		let newTarget: ComparisonTarget;
		if (type === "static") {
			newTarget = {
				type: "static",
				value: props.fieldType === "number" ? 0 : "",
			};
		} else if (type === "previous") {
			newTarget = { type: "previous" };
		} else {
			newTarget = { type: "previous_pct", offset: 0 };
		}
		emit("update:modelValue", newTarget);
	};
</script>

<template>
	<div class="flex gap-2 items-center p-1 rounded-md">
		<PSelect
			v-if="!isStaticOnly"
			:value="modelValue.type"
			:options="[
				{ label: 'Value', value: 'static' },
				{ label: 'Previous', value: 'previous' },
				{ label: 'Offset %', value: 'previous_pct' },
			]"
			@update:value="(val: any) => setType(val)" />

		<span
			v-else
			class="text-[10px] font-bold uppercase px-2 text-slate-400">
			Text
		</span>

		<div class="pl-2">
			<template v-if="modelValue.type === 'static'">
				<PInputNumber
					v-if="fieldType === 'number'"
					v-model:value="internalValue as number"
					class="w-50"
					show-buttons
					@update:value="
						(val) => (internalValue = val ?? undefined)
					" />
				<PInput
					v-else
					v-model:value="internalValue as string"
					class="w-50"
					@update:value="
						(val) => (internalValue = val ?? undefined)
					" />
			</template>

			<PInputNumber
				v-if="modelValue.type === 'previous_pct'"
				v-model:value="internalValue as number"
				class="w-50"
				show-buttons
				@update:value="(val) => (internalValue = val ?? undefined)" />

			<span v-if="modelValue.type === 'previous'" class="px-2">
				Previous Datapoint
			</span>
		</div>
	</div>
</template>
