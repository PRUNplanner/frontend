<script setup lang="ts">
	import { ComputedRef, PropType, computed } from "vue";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	const { getMaterialClass } = useMaterialData();

	// Components
	import EmpirePieChart from "@/ui/charts/EmpirePieChart.vue";

	// Types & Interfaces
	import {
		IEmpireMaterialIO,
		IEmpirePlanListData,
	} from "@/features/empire/empire.types";
	import { IChartEmpirePieElement } from "@/ui/charts/charts.types";

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

	const chartDataProfitablePlans: ComputedRef<IChartEmpirePieElement[]> =
		computed(() => {
			const data = localPlanListData.value.filter((f) => f.profit > 0);

			return data.map((e, index) => {
				return {
					name: e.name ?? "",
					value: Math.round(e.profit * 100) / 100,
					color: `hsl(${(index * 137.5) % 360}, 60%, 40%)`,
				};
			});
		});

	const chartDataMaterialProfit: ComputedRef<IChartEmpirePieElement[]> =
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

	const chartDataMaterialCost: ComputedRef<IChartEmpirePieElement[]> =
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

	const chartDataNetProduction: ComputedRef<IChartEmpirePieElement[]> =
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

	const chartDataNetConsumption: ComputedRef<IChartEmpirePieElement[]> =
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

	const chartDataExclusiveProduction: ComputedRef<IChartEmpirePieElement[]> =
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

	const chartDataExclusiveConsumption: ComputedRef<IChartEmpirePieElement[]> =
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
	<div class="border rounded-[3px] border-white/15 p-3">
		<div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
			<div class="col-span-2">
				<h2 class="text-lg font-bold">Profitable Plans</h2>
				<EmpirePieChart :data="chartDataProfitablePlans" />
			</div>
			<div>
				<h2 class="text-lg font-bold">Material Profits</h2>
				<EmpirePieChart :data="chartDataMaterialProfit" />
			</div>
			<div>
				<h2 class="text-lg font-bold">Material Costs</h2>
				<EmpirePieChart :data="chartDataMaterialCost" />
			</div>
			<div>
				<h2 class="text-lg font-bold">Net Production</h2>
				<EmpirePieChart :data="chartDataNetProduction" />
			</div>
			<div>
				<h2 class="text-lg font-bold">Net Consumption</h2>
				<EmpirePieChart :data="chartDataNetConsumption" />
			</div>
			<div>
				<h2 class="text-lg font-bold">Exclusive Production</h2>
				<EmpirePieChart :data="chartDataExclusiveProduction" />
			</div>
			<div>
				<h2 class="text-lg font-bold">Exclusive Consumption</h2>
				<EmpirePieChart :data="chartDataExclusiveConsumption" />
			</div>
		</div>
	</div>
</template>
