<script setup lang="ts">
	import { computed, type ComputedRef, watch } from "vue";

	// Composables
	import { useCXData } from "@/features/cx/useCXData";
	import { usePreferences } from "@/features/preferences/usePreferences";

	// Types & Interfaces
	import type { PSelectOption, SizeKey } from "@/ui/ui.types";

	// UI
	import { PSelect } from "@/ui";

	const props = withDefaults(
		defineProps<{
			selectClass?: string;
			addUndefinedCX?: boolean;
			size?: SizeKey;
			// false: the given cxUuid wins over the user's default, e.g. one from a link
			followDefault?: boolean;
		}>(),
		{
			selectClass: "",
			addUndefinedCX: true,
			size: "md",
			followDefault: true,
		}
	);

	const cxUuid = defineModel<string | undefined>("cxUuid");

	const { defaultCXUuid } = usePreferences();

	const preferenceOptions: PSelectOption[] = useCXData().getPreferenceOptions(
		props.addUndefinedCX
	);

	// a default CX that was deleted is ignored
	const validDefaultCXUuid: ComputedRef<string | undefined> = computed(() =>
		preferenceOptions.some((o) => o.value === defaultCXUuid.value)
			? defaultCXUuid.value
			: undefined
	);

	// shown: the default CX, else the CX the parent passed
	const shownCXUuid: ComputedRef<string | undefined> = computed(
		() =>
			(props.followDefault ? validDefaultCXUuid.value : undefined) ??
			cxUuid.value
	);

	function pick(value: string | undefined): void {
		cxUuid.value = value;
		defaultCXUuid.value = value;
	}

	// the parent calculates with its CX, keep it on the one shown here
	watch(
		() => cxUuid.value,
		(current) => {
			if (
				props.followDefault &&
				validDefaultCXUuid.value &&
				validDefaultCXUuid.value !== current
			)
				cxUuid.value = validDefaultCXUuid.value;
		},
		{ immediate: true }
	);
</script>

<template>
	<PSelect
		:value="shownCXUuid"
		:options="preferenceOptions"
		clearable
		searchable
		:size="size"
		:class="selectClass"
		@update:value="(v) => pick(v as string | undefined)" />
</template>
