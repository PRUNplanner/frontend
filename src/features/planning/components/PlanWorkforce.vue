<script setup lang="ts">
	import { computed, type ComputedRef, type PropType, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackEvent, trackPlanEdit } from "@/lib/analytics/useAnalytics";

	// Utils
	import { capitalizeString } from "@/util/text";
	import { formatAmount, formatNumber } from "@/util/numbers";
	import { WORKFORCE_CONSUMPTION_MAP } from "@/features/planning/engine/workforce";

	// Types & Interfaces
	import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
	import type {
		IWorkforceElement,
		IWorkforceRecord,
	} from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PButton, PTable } from "@/ui";
	import PMeter from "@/ui/charts/PMeter.vue";
	import { BlockOutlined, CheckSharp } from "@vicons/material";

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
		// the layout's "everything open": every tier, no toggle
		showAll: {
			type: Boolean,
			default: false,
		},
		// the layout shows it as a table: a row per tier
		table: {
			type: Boolean,
			default: false,
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

	// tiers the plan needs workers of get a row; the rest (housed or not)
	// stay behind a link that shows them
	const refShowAll = ref(false);
	function toggleUnneeded(): void {
		refShowAll.value = !refShowAll.value;
		trackEvent("plan:workforce_unneeded_toggle", {
			is_shown: refShowAll.value,
		});
	}
	const used: ComputedRef<IWorkforceElement[]> = computed(() =>
		Object.values(props.workforceData).filter(
			(w) => props.showAll || refShowAll.value || w.required > 0
		)
	);
	const tierName = (name: WorkforceType): string =>
		capitalizeString(t(`game.workforce_type.${name}`));
	const unused: ComputedRef<string> = computed(() =>
		Object.values(props.workforceData)
			.filter((w) => w.required === 0)
			.map((w) => tierName(w.name))
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
	<div class="tabular-nums">
		<!-- a row per tier; a box narrower than the table scrolls sideways -->
		<PTable v-if="table" striped class="[&_table]:min-w-[520px]" data-table>
			<thead>
				<tr>
					<th>{{ t("plan.base.workforce.table.tier") }}</th>
					<th>{{ t("plan.base.workforce.table.need_housed") }}</th>
					<th class="numeric">
						{{ t("plan.base.workforce.table.free") }}
					</th>
					<th>{{ t("plan.base.workforce.table.luxuries") }}</th>
					<th class="numeric">
						{{ t("plan.base.workforce.table.efficiency") }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="workforce in used" :key="workforce.name" data-tier>
					<td class="font-bold">{{ tierName(workforce.name) }}</td>
					<td class="min-w-32">
						<div class="flex justify-between gap-2 text-sm">
							<span
								:class="
									workforce.required === 0 ? 'text-muted' : ''
								">
								{{ formatAmount(workforce.required) }}
							</span>
							<span class="text-muted">
								{{ formatAmount(workforce.capacity) }}
							</span>
						</div>
						<PMeter
							:value="workforce.required"
							:max="workforce.capacity"
							:label="tierName(workforce.name)" />
					</td>
					<td
						class="numeric"
						:class="
							workforce.left < 0
								? 'text-negative!'
								: workforce.left === 0
									? 'text-muted!'
									: ''
						"
						:data-short="workforce.left < 0">
						{{ formatAmount(workforce.left) }}
					</td>
					<td>
						<div class="flex gap-1">
							<PButton
								v-for="lux in ['lux1', 'lux2'] as const"
								:key="lux"
								size="sm"
								class="pointer-coarse:h-11"
								:disabled="disabled"
								:pressed="workforce[lux]"
								:aria-label="
									t('plan.base.workforce.supply', {
										ticker: getLuxuryTicker(
											workforce.name,
											lux
										),
									})
								"
								@click="
									updateLux(
										workforce.name,
										lux,
										!workforce[lux]
									)
								">
								<template #icon>
									<CheckSharp v-if="workforce[lux]" />
									<BlockOutlined v-else />
								</template>
								<span class="inline-block w-[4ch]">
									{{ getLuxuryTicker(workforce.name, lux) }}
								</span>
							</PButton>
						</div>
					</td>
					<td
						class="numeric"
						:class="
							workforce.efficiency === 0 ? 'text-muted!' : ''
						">
						{{ formatNumber(workforce.efficiency * 100) }}
					</td>
				</tr>
			</tbody>
		</PTable>
		<!-- wider: tiers side by side, not taller -->
		<div
			v-else
			class="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-6 gap-y-3"
			data-cards>
			<div v-for="workforce in used" :key="workforce.name" data-tier>
				<div class="flex items-baseline justify-between gap-2 text-sm">
					<span class="text-ink-strong">
						{{ tierName(workforce.name) }}
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
					:label="tierName(workforce.name)" />
				<div class="flex items-center gap-1">
					<span class="text-xs text-muted pr-1">
						{{ t("plan.base.workforce.luxuries") }}
					</span>
					<PButton
						v-for="lux in ['lux1', 'lux2'] as const"
						:key="lux"
						size="sm"
						class="pointer-coarse:h-11"
						:disabled="disabled"
						:pressed="workforce[lux]"
						:aria-label="
							t('plan.base.workforce.supply', {
								ticker: getLuxuryTicker(workforce.name, lux),
							})
						"
						@click="
							updateLux(workforce.name, lux, !workforce[lux])
						">
						<template #icon>
							<CheckSharp v-if="workforce[lux]" />
							<BlockOutlined v-else />
						</template>
						<span class="inline-block w-[4ch]">
							{{ getLuxuryTicker(workforce.name, lux) }}
						</span>
					</PButton>
					<span class="grow" />
					<span
						class="text-xs"
						:class="
							workforce.left < 0 ? 'text-negative' : 'text-muted'
						"
						:data-short="workforce.left < 0">
						{{
							t("plan.base.workforce.beds_free", {
								n: formatAmount(workforce.left),
							})
						}}
					</span>
				</div>
			</div>
		</div>
		<button
			v-if="unused && !showAll"
			type="button"
			class="mt-3 min-h-6 text-left text-xs text-link hover:underline cursor-pointer pointer-coarse:min-h-11"
			:aria-expanded="refShowAll ? 'true' : 'false'"
			data-unneeded-toggle
			@click="toggleUnneeded">
			{{
				refShowAll
					? t("plan.base.workforce.hide_not_needed")
					: t("plan.base.workforce.show_not_needed", {
							tiers: unused,
						})
			}}
		</button>
	</div>
</template>
