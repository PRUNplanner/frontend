<script setup lang="ts">
	import { computed, PropType, ref, Ref } from "vue";

	// Composables
	import { exchangeLabels, useCXManagement } from "@/features/exchanges/useManageCX";

	// Types & Interfaces
	import { ICXDataExchangeOption } from "@/stores/planningStore.types";
	import { ExchangeType, PreferenceType } from "../manageCX.types";

	// UI
	import { PSelect, PButton, PTag, PTable } from "@/ui";
	import { PlusSharp, ClearSharp } from "@vicons/material";

	const props = defineProps({
		cxOptions: {
			type: Array as PropType<ICXDataExchangeOption[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:cxOptions", value: ICXDataExchangeOption[]): void;
	}>();

	const localCXOptions = computed({
		get: () => props.cxOptions,
		set: (val: ICXDataExchangeOption[]) => emit("update:cxOptions", val),
	});

	const {
		typeOptions,
		exchangeOptions,
		canAddExchangePreference,
		updateExchangePreference,
		deleteExchangePreference,
	} = await useCXManagement();

	const selectedType: Ref<PreferenceType> = ref("BOTH");
	const selectedExchange: Ref<ExchangeType> = ref("PP30D_UNIVERSE");
</script>

<template>
	<div class="flex flex-row gap-x-1">
		<PSelect
			v-model:value="selectedType"
			:options="typeOptions"
			class="w-25!" />

		<PSelect
			v-model:value="selectedExchange"
			class="w-full"
			searchable
			:options="exchangeOptions" />
		<div>
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
						{{ preference.type }}
					</PTag>
				</td>
				<td>{{ exchangeLabels[preference.exchange] }}</td>
				<td class="text-right">
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
				</td>
			</tr>
			<tr
				v-if="localCXOptions.length === 0"
				class="text-center child:text-white/50!">
				<td colspan="3">No Exchange Preference Configured</td>
			</tr>
		</PTable>
	</div>
</template>
