<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		nextTick,
		type PropType,
		ref,
		type Ref,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useXITAction } from "@/features/xit/useXITAction";
	const { transferJSON } = useXITAction();
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { burnOrigin, defaultBuyItemsFromCX } = usePreferences();
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { copyToClipboard } from "@/util/data";
	import { formatAmount } from "@/util/numbers";

	// Constants
	import { XITSTATIONWAREHOUSES } from "@/features/xit/xitConstants";

	// Types & Interfaces
	import type { IXITTransferMaterial } from "@/features/xit/xitAction.types";

	// UI
	import {
		PButton,
		PCheckbox,
		PForm,
		PFormItem,
		PInput,
		PSelect,
		PTable,
	} from "@/ui";
	import { NDrawer, NDrawerContent } from "naive-ui";

	const props = defineProps({
		elements: {
			type: Array as PropType<IXITTransferMaterial[]>,
			required: true,
		},
		transferName: {
			type: String,
			required: false,
			default: "Transfer",
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
		buttonSecondary: {
			type: Boolean,
			required: false,
			default: false,
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
			default: 650,
		},
	});

	// local elements
	const localElements: ComputedRef<IXITTransferMaterial[]> = computed(() =>
		props.elements.filter((f) => f.value > 0)
	);

	// Drawer Display
	const loadDrawer: Ref<boolean> = ref(false);
	const showDrawer: Ref<boolean> = ref(false);

	function show(): void {
		if (!showDrawer.value) {
			trackEvent("xit_transfer_show");
			loadDrawer.value = true;
			nextTick().then(() => (showDrawer.value = true));
		}
	}
</script>

<template>
	<PButton
		:size="buttonSize"
		:type="buttonSecondary ? 'secondary' : 'primary'"
		@click="show">
		{{ buttonText }}
	</PButton>

	<n-drawer v-if="loadDrawer" v-model:show="showDrawer" :width="drawerWidth">
		<n-drawer-content closable body-class="bg-black">
			<template #header> {{ drawerTitle }} </template>

			<PForm>
				<PFormItem :label="t('xit.form.origin')">
					<PSelect
						v-model:value="burnOrigin"
						:options="XITSTATIONWAREHOUSES" />
				</PFormItem>
				<PFormItem :label="t('xit.form.buy_from_cx')">
					<div
						class="w-full flex flex-row gap-1 my-3 h-8 items-center">
						<PCheckbox
							v-model:checked="defaultBuyItemsFromCX"
							:disabled="
								burnOrigin === 'Configure on Execution'
							" />

						<div
							v-if="burnOrigin === 'Configure on Execution'"
							class="pl-3 text-xs text-white/50">
							{{ $t("xit.form.buy_from_cx_warning") }}
						</div>
					</div>
				</PFormItem>
				<PFormItem :label="t('xit.form.json')">
					<div class="w-full flex flex-row gap-1">
						<div class="grow">
							<PInput
								:value="
									transferJSON(localElements, {
										name: transferName,
										origin: burnOrigin,
										buy: defaultBuyItemsFromCX,
									}).value
								"
								type="textarea"
								class="w-full" />
						</div>
						<div>
							<PButton
								@click="
									() => {
										trackEvent('xit_transfer_copy');
										copyToClipboard(
											transferJSON(localElements, {
												name: transferName,
												origin: burnOrigin,
												buy: defaultBuyItemsFromCX,
											}).value
										);
									}
								">
								{{ $t("xit.buttons.copy") }}
							</PButton>
						</div>
					</div>
				</PFormItem>
			</PForm>

			<PTable striped class="mt-3">
				<thead>
					<tr>
						<th>{{ $t("xit.table.ticker") }}</th>
						<th>{{ $t("xit.table.amount") }}</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="element in localElements"
						:key="`TRANSFER#${element.ticker}`">
						<td>
							<MaterialTile
								:key="element.ticker"
								:ticker="element.ticker" />
						</td>
						<td>{{ formatAmount(element.value) }}</td>
					</tr>
				</tbody>
			</PTable>
		</n-drawer-content>
	</n-drawer>
</template>
