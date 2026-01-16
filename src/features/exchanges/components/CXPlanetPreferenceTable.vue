<script setup lang="ts">
	import { PropType, ref, Ref, watch } from "vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Utils
	import { exchangeLabels } from "@/features/exchanges/useManageCX";
	import { formatNumber } from "@/util/numbers";

	// Components
	import CXExchangePreference from "@/features/exchanges/components/CXExchangePreference.vue";
	import CXTickerPreference from "@/features/exchanges/components/CXTickerPreference.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import { ICXPlanetMap, type ExchangeType } from "@/features/exchanges/manageCX.types";

	// UI
	import { PButton, PTag } from "@/ui";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { EditSharp } from "@vicons/material";

	const { planetNames, loadPlanetName } = usePlanetData();

	const props = defineProps({
		planetMap: {
			type: Object as PropType<ICXPlanetMap>,
			required: true,
		},
	});

	const localMap: Ref<ICXPlanetMap> = ref(props.planetMap);

	watch(
		() => props.planetMap,
		(newMap: ICXPlanetMap) => {
			localMap.value = newMap;
		}
	);

	const selectedPlanet: Ref<string | null> = ref(null);
</script>

<template>
	<h2 class="text-xl font-bold my-auto pb-3">
		Planet Preferences<span v-if="selectedPlanet"
			>:
			{{
				planetNames[selectedPlanet] ||
				loadPlanetName(selectedPlanet) ||
				"Loading"
			}}
		</span>
	</h2>
	<div
		v-if="selectedPlanet"
		class="grid grid-cols-1 xl:grid-cols-[40%_auto] gap-3 pb-3">
		<div>
			<h3 class="text-lg font-bold pb-3">Exchange</h3>
			<CXExchangePreference
				:key="`Exchanges#${selectedPlanet}`"
				v-model:cx-options="localMap[selectedPlanet].exchanges" />
		</div>
		<div>
			<h3 class="text-lg font-bold pb-3">Ticker</h3>
			<CXTickerPreference
				:key="`Ticker#${selectedPlanet}`"
				v-model:cx-options="localMap[selectedPlanet].ticker" />
		</div>
	</div>
	<XNDataTable :data="Object.values(localMap)" striped>
		<XNDataTableColumn key="buttons" title="" width="50">
			<template #render-cell="{ rowData }">
				<PButton
					size="sm"
					:type="
						selectedPlanet === rowData.planet
							? 'success'
							: 'primary'
					"
					@click="
						selectedPlanet === rowData.planet
							? (selectedPlanet = null)
							: (selectedPlanet = rowData.planet)
					">
					<template #icon><EditSharp /></template>
				</PButton>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="planet" title="Planet" sorter="default">
			<template #render-cell="{ rowData }">
				{{
					planetNames[rowData.planet] ||
					loadPlanetName(rowData.planet) ||
					"Loading..."
				}}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="exchanges" title="Exchanges" max-width="20%">
			<template #render-cell="{ rowData }">
				<div class="flex flex-col gap-y-1">
					<div
						v-for="exchange in rowData.exchanges"
						:key="`${rowData.planet}#${exchange.type}#${exchange.exchange}`">
						<PTag
							:type="
								exchange.type === 'BUY'
									? 'success'
									: exchange.type === 'SELL'
									? 'error'
									: 'primary'
							">
							{{ exchange.type }}:
							<strong>{{ exchangeLabels[exchange.exchange as ExchangeType] }}</strong>
						</PTag>
					</div>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="ticker" title="Ticker" max-width="50%">
			<template #render-cell="{ rowData }">
				<div class="flex flex-wrap gap-3">
					<div
						v-for="ticker in rowData.ticker"
						:key="`${rowData.planet}#${ticker.type}#${ticker.value}`"
						class="flex flex-row gap-x-1">
						<MaterialTile
							:key="ticker.ticker"
							:ticker="ticker.ticker" />
						<PTag
							:type="
								ticker.type === 'BUY'
									? 'success'
									: ticker.type === 'SELL'
									? 'error'
									: 'primary'
							">
							{{ ticker.type }}:
							<strong>{{ formatNumber(ticker.value) }}</strong>
							<span class="pl-1 font-light opacity-50">$</span>
						</PTag>
					</div>
				</div>
			</template>
		</XNDataTableColumn>
	</XNDataTable>
</template>
