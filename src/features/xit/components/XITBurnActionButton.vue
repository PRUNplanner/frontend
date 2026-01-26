<script setup lang="ts">
	import { computed, ComputedRef, nextTick, PropType, ref, Ref } from "vue";

	// Composables
	import { useBurnXITAction } from "@/features/xit/useBurnXITAction";
	import { useXITAction } from "@/features/xit/useXITAction";
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	const {
		burnResupplyDays,
		burnOrigin,
		getBurnDisplayClass,
		defaultBuyItemsFromCX,
	} = usePreferences();
	const { transferJSON } = useXITAction();

	// Util
	import { copyToClipboard } from "@/util/data";
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// UI
	import {
		PButton,
		PButtonGroup,
		PForm,
		PFormItem,
		PInputNumber,
		PCheckbox,
		PSelect,
		PInput,
		PTable,
	} from "@/ui";
	import { NDrawer, NDrawerContent } from "naive-ui";

	// Constants
	import { XITSTATIONWAREHOUSES } from "@/features/xit/xitConstants";

	// Types & Interfaces
	import { IXITActionElement } from "@/features/xit/xitAction.types";

	const props = defineProps({
		elements: {
			type: Array as PropType<IXITActionElement[]>,
			required: true,
		},
		// Button Definitions
		buttonText: {
			type: String,
			required: false,
			default: "XIT",
		},
		buttonSize: {
			type: String as PropType<"sm" | "md">,
			required: false,
			default: "md",
		},
		// Drawer Definitions
		drawerTitle: {
			type: String,
			required: false,
			default: "XIT Action",
		},
		drawerWidth: {
			type: Number,
			required: false,
			default: 700,
		},
	});

	// Drawer Display
	const loadDrawer: Ref<boolean> = ref(false);
	const showDrawer: Ref<boolean> = ref(false);

	function show(): void {
		if (!showDrawer.value) {
			trackEvent("xit_burn_show");

			loadDrawer.value = true;
			nextTick().then(() => (showDrawer.value = true));
		}
	}

	// Local State & Watcher
	const localElements: ComputedRef<IXITActionElement[]> = computed(
		() => props.elements
	);

	const fitOptions: { weight: number; volume: number; label: string }[] = [
		{ weight: 500, volume: 500, label: "500" },
		{ weight: 1000, volume: 1000, label: "1k" },
		{ weight: 2000, volume: 2000, label: "2k" },
		{ weight: 3000, volume: 1000, label: "3k/1k" },
		{ weight: 1000, volume: 3000, label: "1k/3k" },
		{ weight: 5000, volume: 5000, label: "5k" },
	];

	const refHideInfinite: Ref<boolean> = ref(false);
	const refMaterialOverrides: Ref<Record<string, number>> = ref({});
	const refMaterialInactives: Ref<Set<string>> = ref(new Set([]));

	const { materialTable, totalWeightVolume, totalPrice, fit } =
		await useBurnXITAction(
			localElements,
			burnResupplyDays,
			refHideInfinite,
			refMaterialOverrides,
			refMaterialInactives,
			ref(undefined),
			ref(undefined)
		);
</script>

<template>
	<PButton :size="buttonSize" @click="show">
		{{ buttonText }}
	</PButton>

	<n-drawer v-if="loadDrawer" v-model:show="showDrawer" :width="drawerWidth">
		<n-drawer-content closable body-class="bg-black">
			<template #header> {{ drawerTitle }} </template>

			<div class="mb-3 grid grid-cols-1 xl:grid-cols-[60%_auto] gap-3">
				<div>
					<PForm>
						<PFormItem label="Origin">
							<PSelect
								v-model:value="burnOrigin"
								:options="XITSTATIONWAREHOUSES"
								class="w-full" />
						</PFormItem>
						<PFormItem label="Target Days">
							<PInputNumber
								v-model:value="burnResupplyDays"
								:min="0"
								show-buttons
								class="w-full" />
						</PFormItem>
						<PFormItem label="Buy From CX">
							<p
								v-if="burnOrigin === 'Configure on Execution'"
								class="text-xs text-negative">
								Only warehouse origin allows purchasing.
							</p>
							<PCheckbox
								v-else
								v-model:checked="defaultBuyItemsFromCX"
								:disabled="
									burnOrigin === 'Configure on Execution'
								" />
						</PFormItem>
						<PFormItem label="Fit Ship">
							<PButtonGroup>
								<PButton
									v-for="fitOption in fitOptions"
									:key="fitOption.label"
									@click="
										() => {
											fit(
												fitOption.weight,
												fitOption.volume
											);
											trackEvent('xit_burn_fit_ship', {
												weight: fitOption.weight,
												volume: fitOption.volume,
											});
										}
									">
									{{ fitOption.label }}
								</PButton>
							</PButtonGroup>
						</PFormItem>
						<PFormItem label="Hide Infinite">
							<PCheckbox v-model:checked="refHideInfinite" />
						</PFormItem>
					</PForm>
				</div>
				<div class="flex flex-col gap-3 pb-3 items-end">
					<div>
						<PButton
							@click="
								() => {
									trackEvent('xit_burn_copy');

									copyToClipboard(
										transferJSON(
											materialTable
												.filter(
													(mt) =>
														mt.total !== Infinity &&
														mt.total > 0 &&
														mt.active
												)
												.map((m) => {
													return {
														ticker: m.ticker,
														value: m.total,
													};
												}),
											{
												name: 'Burn Supply',
												origin: burnOrigin,
												buy: defaultBuyItemsFromCX,
											}
										).value
									);
								}
							">
							Copy XIT JSON
						</PButton>
					</div>
					<PInput
						v-model:value="
							transferJSON(
								materialTable
									.filter(
										(mt) =>
											mt.total !== Infinity &&
											mt.total > 0 &&
											mt.active
									)
									.map((m) => {
										return {
											ticker: m.ticker,
											value: m.total,
										};
									}),
								{
									name: 'Burn Supply',
									origin: burnOrigin,
									buy: defaultBuyItemsFromCX,
								}
							).value
						"
						type="textarea"
						class="w-full" />
				</div>
			</div>

			<PTable striped>
				<thead>
					<tr>
						<th></th>
						<th>Ticker</th>
						<th>Stock</th>
						<th>Delta</th>
						<th>Burn</th>
						<th>Amount</th>
						<th>Override</th>
					</tr>
				</thead>
				<tbody>
					<tr class="child:border-b!">
						<td colspan="7">
							<div class="flex flex-row justify-between">
								<div>
									Weight:
									{{
										formatNumber(
											totalWeightVolume.totalWeight
										)
									}}
									<span class="pl-1 font-light text-white/50">
										t
									</span>
								</div>
								<div>
									Volume:
									{{
										formatNumber(
											totalWeightVolume.totalVolume
										)
									}}
									<span class="pl-1 font-light text-white/50">
										m³
									</span>
								</div>
								<div>
									Price:
									{{ formatNumber(totalPrice) }}
									<span class="pl-1 font-light text-white/50">
										$
									</span>
								</div>
							</div>
						</td>
					</tr>
				</tbody>
				<tbody>
					<tr v-for="e in materialTable" :key="e.ticker">
						<td>
							<PCheckbox
								v-model:checked="e.active"
								@update:checked="
									(value) => {
										if (value)
											refMaterialInactives.delete(
												e.ticker
											);
										else refMaterialInactives.add(e.ticker);
									}
								" />
						</td>
						<td>
							<MaterialTile :key="e.ticker" :ticker="e.ticker" />
						</td>
						<td>{{ formatAmount(e.stock) }}</td>
						<td>{{ formatNumber(e.delta) }}</td>
						<td>
							<span
								:class="
									getBurnDisplayClass(e.burn).value != ''
										? `${
												getBurnDisplayClass(e.burn)
													.value
											} px-2 py-0.75`
										: ''
								">
								{{ formatNumber(e.burn) }}
							</span>
						</td>
						<td>{{ formatAmount(e.total) }}</td>
						<td>
							<PInputNumber
								v-model:value="refMaterialOverrides[e.ticker]"
								size="sm"
								:min="0"
								class="max-w-25" />
						</td>
					</tr>
				</tbody>
			</PTable>
		</n-drawer-content>
	</n-drawer>
</template>
