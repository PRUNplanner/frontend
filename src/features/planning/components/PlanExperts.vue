<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		ref,
		type Ref,
	} from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackPlanEdit } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { ExpertType } from "@/features/api/schemas/planningData.schemas";
	import type {
		IExpertElement,
		IExpertRecord,
	} from "@/features/planning/usePlanCalculation.types";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PInputNumber, PNotice } from "@/ui";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		expertData: {
			type: Object as PropType<IExpertRecord>,
			required: true,
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
		// the plan's buildings: their expertise fields come first
		buildings: {
			type: Array as PropType<
				{ name: string; expertise: string | null }[]
			>,
			required: false,
			default: () => [],
		},
		// while customising the layout: every field, no toggle
		showAll: {
			type: Boolean,
			default: false,
		},
	});

	const emit = defineEmits<{
		(e: "update:expert", expert: ExpertType, value: number): void;
	}>();

	// Local State
	const localExpertData: ComputedRef<IExpertRecord> = computed(
		() => props.expertData
	);

	// buildings of the plan per field, e.g. "FP, HYF"
	const fieldBuildings = (expert: ExpertType): string =>
		props.buildings
			.filter((b) => b.expertise === expert.toUpperCase())
			.map((b) => b.name)
			.join(", ");

	// fields the plan's buildings use, or with experts placed, come first
	const isUsed = (e: IExpertElement): boolean =>
		e.amount > 0 || fieldBuildings(e.name) !== "";
	const used: ComputedRef<IExpertElement[]> = computed(() =>
		Object.values(localExpertData.value).filter(isUsed)
	);
	const more: ComputedRef<IExpertElement[]> = computed(() =>
		Object.values(localExpertData.value).filter((e) => !isUsed(e))
	);
	const refShowMore: Ref<boolean> = ref(false);
	const shown: ComputedRef<IExpertElement[]> = computed(() =>
		props.showAll || refShowMore.value
			? [...used.value, ...more.value]
			: used.value
	);

	function update(expert: ExpertType, value: number): void {
		emit("update:expert", expert, value);
		trackPlanEdit({
			field: "expert",
			planet_natural_id: props.planetNaturalId,
			expert_type: expert,
			amount: value,
		});
	}

	const totalExperts = computed(() => {
		let total: number = 0;

		Object.keys(localExpertData.value).forEach((expertKey) => {
			total += localExpertData.value[expertKey as ExpertType].amount;
		});

		return total;
	});
</script>

<template>
	<!-- wider: 2 experts per line from about 450 px, 3 from 680 -->
	<div
		class="grid grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))] gap-x-6 gap-y-2 tabular-nums">
		<PNotice v-if="totalExperts > 6" type="warning" class="col-span-full">
			{{
				t("plan.components.experts.warning", {
					expert_number: totalExperts,
				})
			}}
		</PNotice>
		<div
			v-for="expert in shown"
			:key="expert.name"
			class="flex items-center gap-3 text-sm"
			data-expert-row>
			<div class="flex-1 min-w-0">
				<div class="text-ink-strong truncate">
					{{ t(`game.expertise.${expert.name.toUpperCase()}`) }}
				</div>
				<div
					class="text-xs truncate"
					:class="
						expert.bonus === 0 ? 'text-muted' : 'text-muted-strong'
					"
					data-bonus>
					<span v-if="fieldBuildings(expert.name)">
						{{ fieldBuildings(expert.name) }} ·
					</span>
					{{ formatNumber(expert.bonus * 100, 2, false, true) }} %
				</div>
			</div>
			<PInputNumber
				:aria-label="
					t('plan.components.experts.amount_label', {
						expert: t(
							`game.expertise.${expert.name.toUpperCase()}`
						),
					})
				"
				:value="localExpertData[expert.name].amount"
				:disabled="disabled"
				show-buttons
				size="sm"
				:min="0"
				:max="5"
				class="w-28"
				@update:value="
					(value) => {
						if (value !== null && value !== undefined)
							update(expert.name, value);
					}
				" />
		</div>
		<button
			v-if="more.length > 0 && !showAll"
			type="button"
			class="col-span-full justify-self-start min-h-6 pointer-coarse:min-h-11 text-xs text-muted-strong hover:text-white cursor-pointer"
			:aria-expanded="refShowMore ? 'true' : 'false'"
			@click="refShowMore = !refShowMore">
			{{
				refShowMore
					? t("plan.base.experts.fewer")
					: t("plan.base.experts.more", { n: more.length })
			}}
		</button>
	</div>
</template>
