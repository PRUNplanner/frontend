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

	// Composables
	import { useCXManagement } from "@/features/exchanges/useManageCX";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type {
		CXDataTickerOption,
		CXPreferenceType,
	} from "@/features/api/schemas/cxData.schemas";

	// UI
	import { PSelect, PButton, PInputNumber, PTag, PTable } from "@/ui";
	import { PlusSharp, ClearSharp } from "@vicons/material";
	import { formatNumber } from "@/util/numbers";

	const props = defineProps({
		cxOptions: {
			type: Array as PropType<CXDataTickerOption[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:cxOptions", value: CXDataTickerOption[]): void;
	}>();

	const localCXOptions = computed({
		get: () => props.cxOptions,
		set: (val: CXDataTickerOption[]) => emit("update:cxOptions", val),
	});

	const {
		typeOptions,
		materialOptions,
		canAddTickerPreference,
		deleteTickerPreference,
		updateTickerPreference,
	} = useCXManagement();

	const sortedCXOptions: ComputedRef<CXDataTickerOption[]> = computed(() => {
		return [...localCXOptions.value].sort((a, b) =>
			a.ticker > b.ticker ? 1 : -1
		);
	});

	const selectedType: Ref<CXPreferenceType> = ref("BOTH");
	const selectedTicker: Ref<string> = ref("DW");
	const selectedValue: Ref<number> = ref(0);
</script>

<template>
	<div class="flex flex-row gap-x-1 w-full items-end">
		<div class="flex-0">
			<PSelect v-model:value="selectedType" :options="typeOptions" />
		</div>
		<div class="flex-1">
			<PSelect
				v-model:value="selectedTicker"
				:options="materialOptions"
				searchable
				size="small"
				:placeholder="
					t('exchanges.components.ticker.material_placeholder')
				"
				class="w-full" />
		</div>
		<div class="flex-1">
			<PInputNumber
				v-model:value="selectedValue"
				:min="0"
				decimals
				class="w-full" />
		</div>
		<div class="flex-none">
			<PButton
				:disabled="
					!canAddTickerPreference(
						localCXOptions,
						selectedTicker,
						selectedType
					).value
				"
				@click="
					localCXOptions = updateTickerPreference(
						localCXOptions,
						selectedTicker,
						selectedType,
						selectedValue
					)
				">
				<template #icon><PlusSharp /></template>
			</PButton>
		</div>
	</div>
	<div class="pt-3">
		<PTable striped>
			<tr
				v-for="preference in sortedCXOptions"
				:key="`${preference.type}#${preference.ticker}`">
				<td class="w-18.75">
					<PTag
						:type="
							preference.type === 'BUY'
								? 'success'
								: preference.type === 'SELL'
									? 'error'
									: 'primary'
						">
						{{ $t(`exchanges.preference_type.${preference.type}`) }}
					</PTag>
				</td>
				<td>
					<MaterialTile
						:key="`${preference.ticker}#${preference.type}`"
						:ticker="preference.ticker" />
				</td>
				<td class="text-right">
					{{ formatNumber(preference.value) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td>
					<div class="flex justify-end">
						<PButton
							size="sm"
							type="error"
							@click="
								localCXOptions = deleteTickerPreference(
									localCXOptions,
									preference.ticker,
									preference.type
								)
							">
							<template #icon><ClearSharp /></template>
						</PButton>
					</div>
				</td>
			</tr>
			<tr
				v-if="localCXOptions.length === 0"
				class="text-center child:text-white/50!">
				<td colspan="4">
					{{ $t("exchanges.components.ticker.no_data") }}
				</td>
			</tr>
		</PTable>
	</div>
</template>
