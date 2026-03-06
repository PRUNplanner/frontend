<script setup lang="ts">
	import { computed, ComputedRef, PropType, WritableComputedRef } from "vue";

	// Types & Interfaces
	import { IPlanEmpire } from "@/stores/planningStore.types";
	import { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PForm, PFormItem, PInput, PSelect } from "@/ui";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		planName: {
			type: String,
			required: false,
			default: undefined,
		},
		empireOptions: {
			type: Array as PropType<IPlanEmpire[]>,
			required: false,
			default: undefined,
		},
		activeEmpire: {
			type: Object as PropType<IPlanEmpire>,
			required: false,
			default: undefined,
		},
		planEmpires: {
			type: Array as PropType<IPlanEmpire[]>,
			required: true,
		},
	});

	function createEmpireOptions(
		data: IPlanEmpire[] | undefined
	): PSelectOption[] {
		if (!data) return [];

		const selectOptions: PSelectOption[] = [];

		data.forEach((e: IPlanEmpire) => {
			// check if the option is also assigned to the plan
			// by trying to find it in planEmpires

			const pE: IPlanEmpire | undefined = props.planEmpires.find(
				(f) => f.uuid === e.uuid
			);

			selectOptions.push({
				label: pE ? `» ${e.empire_name}` : e.empire_name,
				value: e.uuid,
			});
		});

		return selectOptions.sort((a, b) =>
			(a.label as string) > (b.label as string) ? 1 : -1
		);
	}

	const emit = defineEmits<{
		(e: "update:active-empire", empireUuid: string): void;
		(e: "update:plan-name", value: string): void;
	}>();

	// Local State
	const localPlanName: WritableComputedRef<string | undefined> = computed({
		get: () => props.planName,
		set: (value: string | undefined) =>
			value ? emit("update:plan-name", value) : {},
	});

	const localActiveEmpireUuid: WritableComputedRef<string | undefined> =
		computed({
			get: () => props.activeEmpire?.uuid,
			set: (value: string) => emit("update:active-empire", value),
		});

	const empireSelectOptions: ComputedRef<PSelectOption[]> = computed(() =>
		createEmpireOptions(props.empireOptions)
	);
</script>

<template>
	<PForm>
		<PFormItem label="Name">
			<PInput
				v-model:value="localPlanName"
				class="w-full"
				:disabled="disabled"
				placeholder="Plan Name" />
		</PFormItem>
		<PFormItem label="Empire">
			<PSelect
				v-model:value="localActiveEmpireUuid"
				class="w-full"
				:disabled="disabled"
				:options="empireSelectOptions" />
		</PFormItem>
	</PForm>
</template>
