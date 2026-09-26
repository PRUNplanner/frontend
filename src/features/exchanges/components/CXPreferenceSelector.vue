<script setup lang="ts">
	import { computed, ComputedRef, watch, WritableComputedRef } from "vue";

	// Composables
	import { useCXData } from "@/features/cx/useCXData";
	import { usePreferences } from "@/features/preferences/usePreferences";

	// Types & Interfaces
	import { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PSelect } from "@/ui";

	const props = defineProps({
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		selectClass: {
			type: String,
			required: false,
			default: "",
		},
		addUndefinedCX: {
			type: Boolean,
			required: false,
			default: true,
		},
	});

	let { defaultCXUuid } = usePreferences();

	const emit = defineEmits<{
		(e: "update:cxuuid", value: string | undefined): void;
	}>();

	const preferenceOptions: PSelectOption[] = useCXData().getPreferenceOptions(
		props.addUndefinedCX
	);

	// a default CX that was deleted is ignored
	const validDefaultCXUuid: ComputedRef<string | undefined> = computed(() =>
		preferenceOptions.some((o) => o.value === defaultCXUuid.value)
			? defaultCXUuid.value
			: undefined
	);

	const localCXUuid: WritableComputedRef<string | undefined> = computed({
		get: () => validDefaultCXUuid.value ?? props.cxUuid,
		set: (value: string | undefined) => {
			emit("update:cxuuid", value);
			defaultCXUuid.value = value;
		},
	});

	// the parent calculates with its CX, keep it on the one shown here
	watch(
		() => props.cxUuid,
		(cxUuid) => {
			if (validDefaultCXUuid.value && validDefaultCXUuid.value !== cxUuid)
				emit("update:cxuuid", validDefaultCXUuid.value);
		},
		{ immediate: true }
	);
</script>

<template>
	<PSelect
		v-model:value="localCXUuid"
		:options="preferenceOptions"
		clearable
		searchable
		:class="selectClass" />
</template>
