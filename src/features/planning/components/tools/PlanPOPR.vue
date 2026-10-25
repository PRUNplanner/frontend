<script setup lang="ts">
	import { computed, onMounted, type PropType, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Components
	import PlanetPOPRTable from "@/features/government/components/PlanetPOPRTable.vue";

	// Util
	import { poprAvailable, poprCovers } from "@/features/government/popr.util";
	import { formatAmount } from "@/util/numbers";

	// Types & Interfaces
	import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";
	import type { PopulationReport } from "@/features/api/schemas/gameData.schemas";

	// UI
	import { PSpin } from "@/ui";

	const props = defineProps({
		planetNaturalId: {
			type: String,
			required: true,
		},
		workforceData: {
			type: Object as PropType<IWorkforceRecord>,
			required: true,
		},
	});

	const isLoading: Ref<boolean> = ref(true);
	const hasError: Ref<boolean> = ref(false);
	const poprData: Ref<PopulationReport | null> = ref(null);

	async function fetchPOPR(planetNaturalId: string) {
		isLoading.value = true;
		try {
			await useQuery("GetPlanetLastPOPR", {
				planetNaturalId: planetNaturalId,
			})
				.execute()
				.then((data: PopulationReport | null) => (poprData.value = data))
				.finally(() => (isLoading.value = false));
		} catch {
			hasError.value = true;
		}
	}

	onMounted(() => fetchPOPR(props.planetNaturalId));

	const TIERS = [
		"pioneer",
		"settler",
		"technician",
		"engineer",
		"scientist",
	] as const;

	// one bar per tier on its own scale: the question is "enough?", not
	// how the tiers compare
	const chartRows = computed(() => {
		const popr = poprData.value;
		if (!popr) return [];
		return TIERS.map((tier) => {
			const free = popr[`free_${tier}`];
			const openJobs = popr[`open_jobs_${tier}`];
			const available = poprAvailable(free, openJobs);
			const need = props.workforceData[tier].required;
			const axis = Math.max(available, need) * 1.1 || 1;
			const values = {
				tier: t(`game.workforce_type.${tier}`),
				available: formatAmount(available),
				need: formatAmount(need),
			};
			return {
				tier,
				label: values.tier,
				covered: poprCovers(free, openJobs, need),
				need,
				barPct: (available / axis) * 100,
				needPct: (need / axis) * 100,
				aria: t("plan.tools.popr.chart.row", values),
				text: t("plan.tools.popr.chart.value", values),
			};
		});
	});
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h2 class="text-white/80 font-bold text-lg">
				{{ $t("plan.tools.popr.title") }}
			</h2>
			<span class="text-sm text-muted">
				{{ $t("plan.tools.popr.subtitle") }}
			</span>
		</div>
		<p v-if="hasError" class="text-muted">
			{{ $t("plan.tools.popr.error") }}
		</p>
		<p v-else-if="!isLoading && !poprData" class="text-muted">
			{{ $t("plan.tools.popr.empty") }}
		</p>
		<div
			v-else-if="isLoading"
			class="flex flex-col items-center gap-2 py-6 text-muted">
			<PSpin size="lg" />
			{{ $t("plan.tools.popr.loading") }}
		</div>
		<template v-else-if="poprData">
			<figure class="flex flex-col gap-2 max-w-3xl" data-popr-chart>
				<figcaption class="text-sm font-medium text-ink-strong">
					{{ t("plan.tools.popr.chart.label") }}
					<span class="block text-xs font-normal text-muted">
						{{ t("plan.tools.popr.chart.legend") }}
					</span>
				</figcaption>
				<div
					v-for="row in chartRows"
					:key="row.tier"
					class="grid grid-cols-[6.5rem_minmax(0,1fr)] @md:grid-cols-[6.5rem_minmax(0,1fr)_11rem] items-center gap-x-3 gap-y-0.5 text-sm"
					:data-tier="row.tier">
					<span class="text-muted-strong">{{ row.label }}</span>
					<div
						role="img"
						:aria-label="row.aria"
						class="relative h-2.5 rounded-full bg-white/10">
						<div
							class="h-full rounded-full"
							:class="
								!row.need
									? 'bg-(--chart-ink)/40'
									: row.covered
										? 'bg-positive'
										: 'bg-negative'
							"
							:style="{ width: `${row.barPct}%` }" />
						<div
							v-if="row.need"
							class="absolute -inset-y-1 border-l-2 border-ink-strong"
							:style="{ left: `${row.needPct}%` }"
							data-need />
					</div>
					<span
						class="col-start-2 @md:col-start-auto text-xs tabular-nums text-nowrap"
						:class="
							row.need && !row.covered
								? 'text-negative'
								: 'text-muted'
						"
						aria-hidden="true">
						{{ row.text }}
					</span>
				</div>
			</figure>
			<PlanetPOPRTable
				:planet-natural-id="planetNaturalId"
				:popr-data="poprData"
				:workforce-data="workforceData" />
		</template>
	</div>
</template>
