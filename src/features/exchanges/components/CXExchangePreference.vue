<script setup lang="ts">
	import { computed, type PropType, ref, type Ref } from "vue";

	// Composables
	import { useCXManagement } from "@/features/exchanges/useManageCX";

	// Types & Interfaces
	import type {
		CXDataExchangeOption,
		CXExchangeOptionType,
		CXPreferenceType,
	} from "@/features/api/schemas/cxData.schemas";

	// UI
	import { PSelect, PButton, PTag, PTable } from "@/ui";
	import { PlusSharp, ClearSharp } from "@vicons/material";

	const props = defineProps({
		cxOptions: {
			type: Array as PropType<CXDataExchangeOption[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:cxOptions", value: CXDataExchangeOption[]): void;
	}>();

	const localCXOptions = computed({
		get: () => props.cxOptions,
		set: (val: CXDataExchangeOption[]) => emit("update:cxOptions", val),
	});

	const {
		typeOptions,
		exchangeOptions,
		canAddExchangePreference,
		updateExchangePreference,
		deleteExchangePreference,
	} = useCXManagement();

	const selectedType: Ref<CXPreferenceType> = ref("BOTH");
	const selectedExchange: Ref<CXExchangeOptionType> = ref("UNIVERSE_30D");
</script>

<template>
	<div class="flex flex-row gap-x-1 w-full items-end">
		<div class="flex-0">
			<PSelect
				v-model:value="selectedType"
				:options="typeOptions"
				class="w-full" />
		</div>
		<div class="flex-1">
			<PSelect
				v-model:value="selectedExchange"
				class="w-full"
				searchable
				:options="exchangeOptions" />
		</div>
		<div class="flex-none">
			<PButton
				:disabled="
					!canAddExchangePreference(localCXOptions, selectedType)
						.value
				"
				@click="
					localCXOptions = updateExchangePreference(
						localCXOptions,
						selectedType,
						selectedExchange
					)
				">
				<template #icon><PlusSharp /></template>
			</PButton>
		</div>
	</div>
	<div class="pt-3">
		<PTable striped>
			<tr
				v-for="preference in localCXOptions"
				:key="`${preference.type}#${preference.exchange}`">
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
				<td>{{ preference.exchange }}</td>
				<td>
					<div class="flex justify-end">
						<PButton
							size="sm"
							type="error"
							@click="
								localCXOptions = deleteExchangePreference(
									localCXOptions,
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
				class="text-center child:text-muted!">
				<td colspan="3">
					{{ $t("exchanges.components.exchanges.no_data") }}
				</td>
			</tr>
		</PTable>
	</div>
</template>
