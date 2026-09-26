<script setup lang="ts">
	import { computed, PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// UI
	import {
		PButton,
		PButtonGroup,
		PSelectMultiple,
		PForm,
		PFormItem,
	} from "@/ui";

	// Types & Interfaces
	import { PSelectOption } from "@/ui/ui.types";

	const props = defineProps({
		loadBalance: {
			type: Boolean,
			required: true,
		},
		hideConsumables: {
			type: Boolean,
			required: true,
		},
		filterMaterials: {
			type: Array as PropType<string[]>,
			required: true,
		},
		filterPlanets: {
			type: Array as PropType<string[]>,
			required: true,
		},
		materialOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
		planetOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "applyFilter"): void;
		(e: "update:loadBalance", value: boolean): void;
		(e: "update:hideConsumables", value: boolean): void;
		(e: "update:filterMaterials", value: string[]): void;
		(e: "update:filterPlanets", value: string[]): void;
	}>();

	const localLoadBalance = computed({
		get: () => props.loadBalance,
		set: (v: boolean) => {
			emit("update:loadBalance", v);
			emit("applyFilter");
		},
	});

	const localHideConsumables = computed({
		get: () => props.hideConsumables,
		set: (v: boolean) => {
			emit("update:hideConsumables", v);
			emit("applyFilter");
		},
	});

	const localFilterMaterials = computed({
		get: () => props.filterMaterials,
		set: (v: string[]) => {
			emit("update:filterMaterials", v);
			emit("applyFilter");
		},
	});

	const localFilterPlanets = computed({
		get: () => props.filterPlanets,
		set: (v: string[]) => {
			emit("update:filterPlanets", v);
			emit("applyFilter");
		},
	});
</script>

<template>
	<div class="grid grid-cols-1 xl:grid-cols-[max-content_auto] gap-6">
		<div>
			<PForm>
				<PFormItem :label="t('empire.filters.display')">
					<PButtonGroup>
						<PButton
							:type="localLoadBalance ? 'secondary' : 'primary'"
							@click="localLoadBalance = false">
							{{ $t("empire.filters.all") }}
						</PButton>
						<PButton
							:type="!localLoadBalance ? 'secondary' : 'primary'"
							@click="localLoadBalance = true">
							{{ $t("empire.filters.loadbalance") }}
						</PButton>
					</PButtonGroup>
				</PFormItem>
				<PFormItem :label="t('empire.filters.consumables')">
					<PButtonGroup>
						<PButton
							:type="
								localHideConsumables ? 'secondary' : 'primary'
							"
							@click="localHideConsumables = false">
							{{ $t("common.buttons.show") }}
						</PButton>
						<PButton
							:type="
								!localHideConsumables ? 'secondary' : 'primary'
							"
							@click="localHideConsumables = true">
							{{ $t("common.buttons.hide") }}
						</PButton>
					</PButtonGroup>
				</PFormItem>
			</PForm>
		</div>
		<div class="">
			<PForm>
				<PFormItem :label="t('terms.materials', 2)">
					<PSelectMultiple
						v-model:value="localFilterMaterials"
						multiple
						searchable
						clearable
						class="w-full"
						:options="materialOptions" />
				</PFormItem>
				<PFormItem :label="t('terms.planets', 2)">
					<PSelectMultiple
						v-model:value="localFilterPlanets"
						multiple
						searchable
						clearable
						class="w-full"
						:options="planetOptions" />
				</PFormItem>
			</PForm>
		</div>
	</div>
</template>
