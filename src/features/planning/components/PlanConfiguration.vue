<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		onMounted,
		type PropType,
		ref,
		type Ref,
		type WritableComputedRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";
	import type { PSelectOption } from "@/ui/ui.types";

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
			type: Array as PropType<PlanEmpire[]>,
			required: false,
			default: undefined,
		},
		activeEmpire: {
			type: Object as PropType<PlanEmpire>,
			required: false,
			default: undefined,
		},
		planEmpires: {
			type: Array as PropType<PlanEmpire[]>,
			required: true,
		},
		// new plans start with naming them, the hint says why Create waits
		newPlan: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const refNameInput: Ref<{ focus: () => void } | null> = ref(null);
	onMounted(() => {
		if (props.newPlan) refNameInput.value?.focus();
	});

	function createEmpireOptions(
		data: PlanEmpire[] | undefined
	): PSelectOption[] {
		if (!data) return [];

		const selectOptions: PSelectOption[] = [];

		data.forEach((e: PlanEmpire) => {
			// check if the option is also assigned to the plan
			// by trying to find it in planEmpires

			const pE: PlanEmpire | undefined = props.planEmpires.find(
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
			emit("update:plan-name", value ?? ""),
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
		<PFormItem :label="t('plan.components.configuration.name')">
			<PInput
				ref="refNameInput"
				v-model:value="localPlanName"
				class="w-full"
				:disabled="disabled"
				:placeholder="
					newPlan
						? t('plan.save_status.name_to_create')
						: t('plan.save_status.name_to_save')
				" />
		</PFormItem>
		<!-- a read-only (shared) plan has no empire to pick -->
		<PFormItem
			v-if="!disabled"
			:label="t('plan.components.configuration.empire')">
			<PSelect
				v-model:value="localActiveEmpireUuid"
				class="w-full"
				:options="empireSelectOptions" />
		</PFormItem>
	</PForm>
</template>
