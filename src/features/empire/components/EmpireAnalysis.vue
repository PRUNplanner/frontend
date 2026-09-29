<script setup lang="ts">
	import { type ComputedRef, type PropType, computed } from "vue";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	const { getMaterialClass } = useMaterialData();

	// Components
	import EmpireBarChart from "@/ui/charts/EmpireBarChart.vue";

	// Types & Interfaces
	import type {
		IEmpireMaterialIO,
		IEmpirePlanListData,
	} from "@/features/empire/empire.types";
	import type { IChartBarItem } from "@/ui/charts/charts.types";

	const props = defineProps({
		empireMaterialIO: {
			type: Array as PropType<IEmpireMaterialIO[]>,
			required: true,
		},
		planListData: {
			type: Array as PropType<IEmpirePlanListData[]>,
			required: true,
		},
	});

	// Local State
	const localEmpireMaterialIO = computed(() => props.empireMaterialIO);
	const localPlanListData = computed(() => props.planListData);

	const materialColors: Record<string, string> = {
		"agricultural-products": "#003800",
		alloys: "#7b4c1e",
		chemicals: "#b72e5b",
		"construction-materials": "#185bd3",
		"construction-parts": "#294d6b",
		"construction-prefabs": "#0f1e62",
		"consumable-bundles": "#3e0a11",
		"consumables-basic": "#a62c2a",
		"consumables-luxury": "#680000",
		drones: "#8c3412",
		"electronic-devices": "#561493",
		"electronic-parts": "#5b2eb7",
		"electronic-pieces": "#7752bd",
		"electronic-systems": "#331a4c",
		elements: "#3d2e20",
		"energy-systems": "#153e27",
		fuels: "#548d22",
		gases: "#00696b",
		liquids: "#67a8da",
		"medical-equipment": "#55aa55",
		metals: "#363636",
		minerals: "#997149",
		ores: "#525761",
		plastics: "#791f62",
		"ship-engines": "#992900",
		"ship-kits": "#995400",
		"ship-parts": "#996300",
		"ship-shields": "#bf740a",
		"software-components": "#88792f",
		"software-systems": "#3c3505",
		"software-tools": "#816213",
		textiles: "#525a21",
		"unit-prefabs": "#1d1b1c",
		utility: "#a19488",
	};

	function getMaterialColor(materialTicker: string): string {
		return materialColors[
			getMaterialClass(materialTicker).replace("material-category-", "")
		];
	}

	// every plan, losses included; the sign picks the bar colour
	const chartDataPlanProfit: ComputedRef<IChartBarItem[]> = computed(() =>
		localPlanListData.value.map((e) => ({
			name: e.name || e.planet,
			value: Math.round(e.profit * 100) / 100,
		}))
	);

	const chartDataMaterialProfit: ComputedRef<IChartBarItem[]> =
		computed(() => {
			const data = localEmpireMaterialIO.value.filter(
				(f) => f.deltaPrice > 0
			);

			return data.map((e) => {
				return {
					name: e.ticker,
					value: Math.round(e.deltaPrice * 100) / 100,
					color: getMaterialColor(e.ticker),
				};
			});
		});

	const chartDataMaterialCost: ComputedRef<IChartBarItem[]> =
		computed(() => {
			const data = localEmpireMaterialIO.value.filter(
				(f) => f.deltaPrice < 0
			);

			return data.map((e) => {
				return {
					name: e.ticker,
					value: (Math.round(e.deltaPrice * 100) / 100) * -1,
					color: getMaterialColor(e.ticker),
				};
			});
		});

	const chartDataNetProduction: ComputedRef<IChartBarItem[]> =
		computed(() => {
			const data = localEmpireMaterialIO.value.filter((f) => f.delta > 0);

			return data.map((e) => {
				return {
					name: e.ticker,
					value: Math.round(e.delta * 100) / 100,
					color: getMaterialColor(e.ticker),
				};
			});
		});

	const chartDataNetConsumption: ComputedRef<IChartBarItem[]> =
		computed(() => {
			const data = localEmpireMaterialIO.value.filter((f) => f.delta < 0);

			return data.map((e) => {
				return {
					name: e.ticker,
					value: (Math.round(e.delta * 100) / 100) * -1,
					color: getMaterialColor(e.ticker),
				};
			});
		});

	const chartDataExclusiveProduction: ComputedRef<IChartBarItem[]> =
		computed(() => {
			const data = localEmpireMaterialIO.value.filter(
				(f) => f.output > 0 && f.input === 0
			);

			return data.map((e) => {
				return {
					name: e.ticker,
					value: Math.round(e.delta * 100) / 100,
					color: getMaterialColor(e.ticker),
				};
			});
		});

	const chartDataExclusiveConsumption: ComputedRef<IChartBarItem[]> =
		computed(() => {
			const data = localEmpireMaterialIO.value.filter(
				(f) => f.output === 0 && f.input > 0
			);

			return data.map((e) => {
				return {
					name: e.ticker,
					value: (Math.round(e.delta * 100) / 100) * -1,
					color: getMaterialColor(e.ticker),
				};
			});
		});
</script>

<template>
	<div class="@container border rounded-[3px] border-white/15 p-3">
		<!-- columns follow the panel, not the viewport: beside the empire
			table it is only ~400px wide at 1440 -->
		<div class="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
			<div v-if="chartDataPlanProfit.length" class="@3xl:col-span-2 min-w-0">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("empire.analysis.plan_profit") }}
				</h2>
				<EmpireBarChart :items="chartDataPlanProfit" />
			</div>
			<div class="min-w-0">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("empire.analysis.material_profits") }}
				</h2>
				<EmpireBarChart :items="chartDataMaterialProfit" />
			</div>
			<div class="min-w-0">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("empire.analysis.material_costs") }}
				</h2>
				<EmpireBarChart :items="chartDataMaterialCost" />
			</div>
			<div class="min-w-0">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("empire.analysis.net_production") }}
				</h2>
				<EmpireBarChart :items="chartDataNetProduction" />
			</div>
			<div class="min-w-0">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("empire.analysis.net_consumption") }}
				</h2>
				<EmpireBarChart :items="chartDataNetConsumption" />
			</div>
			<div class="min-w-0">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("empire.analysis.exclusive_production") }}
				</h2>
				<EmpireBarChart :items="chartDataExclusiveProduction" />
			</div>
			<div class="min-w-0">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("empire.analysis.exclusive_consumption") }}
				</h2>
				<EmpireBarChart :items="chartDataExclusiveConsumption" />
			</div>
		</div>
	</div>
</template>
