<script setup lang="ts">
	import { computed, type PropType, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Utils
	import { formatNumber } from "@/util/numbers";

	// Components
	import CXExchangePreference from "@/features/exchanges/components/CXExchangePreference.vue";
	import CXTickerPreference from "@/features/exchanges/components/CXTickerPreference.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { ICXPlanetMap } from "@/features/exchanges/manageCX.types";

	// UI
	import { PButton, PDataTable, PTag } from "@/ui";
	import type { PDataTableColumn } from "@/ui/ui.types";
	import { EditSharp } from "@vicons/material";

	const { planetName } = usePlanetData();

	const props = defineProps({
		planetMap: {
			type: Object as PropType<ICXPlanetMap>,
			required: true,
		},
	});

	const localMap = computed({
		get: () => props.planetMap,
		set: (val: ICXPlanetMap) => emit("update:planetMap", val),
	});

	const emit = defineEmits<{
		(e: "update:planetMap", value: ICXPlanetMap): void;
	}>();

	function updatePlanetSubProperty<K extends keyof ICXPlanetMap[string]>(
		planetId: string | null,
		key: K,
		newValue: ICXPlanetMap[string][K]
	) {
		if (!planetId || !localMap.value[planetId]) return;

		localMap.value = {
			...localMap.value,
			[planetId]: {
				...localMap.value[planetId],
				[key]: newValue,
			},
		};
	}

	const selectedPlanet: Ref<string | null> = ref(null);

	type PlanetRow = ICXPlanetMap[string];
	const columns = computed<PDataTableColumn<PlanetRow>[]>(() => [
		{ key: "buttons", title: "", width: 50 },
		{
			key: "planet",
			title: t("exchanges.components.planet_preferences.table.planet"),
			// by the name shown, not the id
			sorter: (a, b) =>
				planetName(a.planet).localeCompare(planetName(b.planet)),
		},
		{
			key: "exchanges",
			title: t(
				"exchanges.components.planet_preferences.table.exchange_preference"
			),
			width: "20%",
		},
		{
			key: "ticker",
			title: t(
				"exchanges.components.planet_preferences.table.ticker_preference"
			),
			width: "50%",
		},
	]);
</script>

<template>
	<h2 class="text-xl font-bold my-auto pb-3">
		{{ $t("exchanges.components.planet_preferences.title")
		}}<span v-if="selectedPlanet"
			>:
			{{ planetName(selectedPlanet) }}
		</span>
	</h2>
	<div
		v-if="selectedPlanet"
		class="grid grid-cols-1 xl:grid-cols-[40%_auto] gap-3 pb-3">
		<div>
			<h3 class="text-lg font-bold pb-3">
				{{
					$t("exchanges.components.planet_preferences.form.exchange")
				}}
			</h3>
			<CXExchangePreference
				:key="`Exchanges#${selectedPlanet}`"
				:cx-options="localMap[selectedPlanet].exchanges"
				@update:cx-options="
					(val) =>
						updatePlanetSubProperty(
							selectedPlanet,
							'exchanges',
							val
						)
				" />
		</div>
		<div>
			<h3 class="text-lg font-bold pb-3">
				{{ $t("exchanges.components.planet_preferences.form.ticker") }}
			</h3>
			<CXTickerPreference
				:key="`Ticker#${selectedPlanet}`"
				:cx-options="localMap[selectedPlanet].ticker"
				@update:cx-options="
					(val) =>
						updatePlanetSubProperty(selectedPlanet, 'ticker', val)
				" />
		</div>
	</div>
	<PDataTable :columns="columns" :data="Object.values(localMap)" striped>
		<template #cell-buttons="{ row }">
				<PButton
					:aria-label="$t('common.buttons.edit')"
					size="sm"
					:type="
						selectedPlanet === row.planet
							? 'success'
							: 'primary'
					"
					@click="
						selectedPlanet === row.planet
							? (selectedPlanet = null)
							: (selectedPlanet = row.planet)
					">
					<template #icon><EditSharp /></template>
				</PButton>
		</template>
		<template #cell-planet="{ row }">
				{{ planetName(row.planet) }}
		</template>
		<template #cell-exchanges="{ row }">
				<div class="flex flex-col gap-y-1">
					<div
						v-for="exchange in row.exchanges"
						:key="`${row.planet}#${exchange.type}#${exchange.exchange}`">
						<PTag
							:type="
								exchange.type === 'BUY'
									? 'success'
									: exchange.type === 'SELL'
										? 'error'
										: 'primary'
							">
							{{
								$t(
									`exchanges.preference_type.${exchange.type}`
								)
							}}:
							<strong>{{ exchange.exchange }}</strong>
						</PTag>
					</div>
				</div>
		</template>
		<template #cell-ticker="{ row }">
				<div class="flex flex-wrap gap-3">
					<div
						v-for="ticker in row.ticker"
						:key="`${row.planet}#${ticker.type}#${ticker.value}`"
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
							{{
								$t(`exchanges.preference_type.${ticker.type}`)
							}}:
							<strong>{{ formatNumber(ticker.value) }}</strong>
							<span class="pl-1 font-light opacity-50">ȼ</span>
						</PTag>
					</div>
				</div>
		</template>
	</PDataTable>
</template>
