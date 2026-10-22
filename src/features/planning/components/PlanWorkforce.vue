<script setup lang="ts">
	import { computed, type ComputedRef, type PropType } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackPlanEdit } from "@/lib/analytics/useAnalytics";

	// Utils
	import { capitalizeString } from "@/util/text";
	import { formatAmount, formatNumber } from "@/util/numbers";
	import { WORKFORCE_CONSUMPTION_MAP } from "../calculations/workforceCalculations";

	// Types & Interfaces
	import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
	import type {
		IWorkforceElement,
		IWorkforceRecord,
	} from "@/features/planning/usePlanCalculation.types";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// UI
	import PMeter from "@/ui/charts/PMeter.vue";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		workforceData: {
			type: Object as PropType<IWorkforceRecord>,
			required: true,
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
	});

	const emit = defineEmits<{
		(
			e: "update:lux",
			workforce: WorkforceType,
			luxType: "lux1" | "lux2",
			value: boolean
		): void;
	}>();

	// tiers the plan needs or houses get a row, the rest one muted line
	const used: ComputedRef<IWorkforceElement[]> = computed(() =>
		Object.values(props.workforceData).filter(
			(w) => w.required > 0 || w.capacity > 0
		)
	);
	const unused: ComputedRef<string> = computed(() =>
		Object.values(props.workforceData)
			.filter((w) => w.required === 0 && w.capacity === 0)
			.map((w) => capitalizeString(t(`game.workforce_type.${w.name}`)))
			.join(", ")
	);

	// Click Handlers
	function updateLux(
		workforce: WorkforceType,
		luxType: "lux1" | "lux2",
		value: boolean
	) {
		emit("update:lux", workforce, luxType, value);
		trackPlanEdit({
			field: "workforce",
			planet_natural_id: props.planetNaturalId,
			workforce_type: workforce,
			lux_type: luxType === "lux1" ? "Lux1" : "Lux2",
			value: value,
		});
	}

	function getLuxuryTicker(
		workforce: WorkforceType,
		luxType: "lux1" | "lux2"
	): string {
		return (
			WORKFORCE_CONSUMPTION_MAP[workforce].find((e) => e[luxType])
				?.ticker ?? "N/A"
		);
	}
</script>

<template>
	<div class="flex flex-col gap-3 tabular-nums">
		<div v-for="workforce in used" :key="workforce.name">
			<div class="flex items-baseline justify-between gap-2 text-sm">
				<span class="text-ink-strong">
					{{ capitalizeString(t(`game.workforce_type.${workforce.name}`)) }}
				</span>
				<span class="text-xs text-muted">
					{{
						t("plan.base.workforce.need_housed", {
							need: formatAmount(workforce.required),
							housed: formatAmount(workforce.capacity),
						})
					}}
					·
					<span
						class="text-ink-strong"
						:title="t('plan.base.workforce.efficiency')">
						{{ formatNumber(workforce.efficiency * 100) }} %
					</span>
				</span>
			</div>
			<PMeter
				class="mt-1 mb-1.5"
				:value="workforce.required"
				:max="workforce.capacity"
				:label="
					capitalizeString(t(`game.workforce_type.${workforce.name}`))
				" />
			<div class="flex items-center gap-1">
				<span class="text-xs text-muted pr-1">
					{{ t("plan.base.workforce.luxuries") }}
				</span>
				<button
					v-for="lux in ['lux1', 'lux2'] as const"
					:key="lux"
					type="button"
					:disabled="disabled"
					:aria-pressed="workforce[lux] ? 'true' : 'false'"
					:aria-label="
						t('plan.base.workforce.supply', {
							ticker: getLuxuryTicker(workforce.name, lux),
						})
					"
					class="inline-flex min-h-6 pointer-coarse:min-h-11 items-center rounded-control border border-dashed cursor-pointer disabled:cursor-default"
					:class="
						workforce[lux]
							? 'border-transparent'
							: 'opacity-40 line-through border-line-strong'
					"
					@click="updateLux(workforce.name, lux, !workforce[lux])">
					<MaterialTile
						:key="getLuxuryTicker(workforce.name, lux)"
						:ticker="getLuxuryTicker(workforce.name, lux)"
						disable-drawer
						:enable-popover="false" />
				</button>
				<span class="grow" />
				<span
					class="text-xs"
					:class="workforce.left < 0 ? 'text-negative' : 'text-muted'">
					{{
						t("plan.base.workforce.beds_free", {
							n: formatAmount(workforce.left),
						})
					}}
				</span>
			</div>
		</div>
		<div v-if="unused" class="text-xs text-muted">
			{{ t("plan.base.workforce.not_needed", { tiers: unused }) }}
		</div>
	</div>
</template>
