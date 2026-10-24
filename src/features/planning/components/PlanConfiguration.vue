<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		type WritableComputedRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	import { RouterLink } from "vue-router";
	const { t } = useI18n();

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Types & Interfaces
	import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";
	import type { PSelectOption } from "@/ui/ui.types";

	// Util
	import { capitalizeString } from "@/util/text";

	// UI
	import { PSelect } from "@/ui";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
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
		// the active empire's exchange preference
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planetId: {
			type: String,
			required: false,
			default: undefined,
		},
		// a visitor without empires: where the prices come from instead
		priceSource: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const planningStore = usePlanningStore();
	const cxName = computed(() =>
		props.cxUuid ? planningStore.cxs[props.cxUuid]?.cx_name : undefined
	);

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
	}>();

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
	<div class="flex flex-col gap-3 text-sm">
		<!-- a visitor's shared copy has no empire to pick -->
		<label
			v-if="!disabled && empireSelectOptions.length > 0"
			class="flex flex-col gap-1 text-xs text-muted-strong">
			{{ t("plan.base.empire.calculate_with") }}
			<PSelect
				v-model:value="localActiveEmpireUuid"
				:aria-label="t('plan.base.empire.calculate_with')"
				size="sm"
				class="w-full"
				:options="empireSelectOptions" />
		</label>
		<div v-if="activeEmpire" class="text-xs text-muted">
			{{
				t(
					"plan.base.empire.note",
					{
						faction: capitalizeString(activeEmpire.empire_faction),
						n: planEmpires.length,
					},
					planEmpires.length
				)
			}}
		</div>
		<div class="flex items-center justify-between gap-3">
			<span>{{ t("plan.components.configuration.prices") }}</span>
			<RouterLink
				v-if="cxName && !disabled"
				:to="`/exchanges/${cxUuid}?scope=${planetId ?? 'all'}`"
				class="text-link hover:underline text-right">
				{{ cxName }}
			</RouterLink>
			<span v-else class="text-muted text-right">
				{{
					priceSource ??
					cxName ??
					t("plan.components.configuration.no_preference")
				}}
			</span>
		</div>
	</div>
</template>
