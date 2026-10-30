<script setup lang="ts">
	import { computed, type Ref, type WritableComputedRef } from "vue";

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
	import type { PSelectOption } from "@/ui/ui.types";

	const {
		// the Planets control only applies to the Material I/O table
		showExpandAll = false,
	} = defineProps<{
		showExpandAll?: boolean;
		materialOptions: PSelectOption[];
		planetOptions: PSelectOption[];
	}>();

	const emit = defineEmits<{
		(e: "applyFilter"): void;
		(e: "collapseAll"): void;
	}>();

	const loadBalance = defineModel<boolean>("loadBalance", { required: true });
	const hideConsumables = defineModel<boolean>("hideConsumables", {
		required: true,
	});
	// display only, the data is unchanged
	const expandAll = defineModel<boolean>("expandAll", { required: true });
	const filterMaterials = defineModel<string[]>("filterMaterials", {
		required: true,
	});
	const filterPlanets = defineModel<string[]>("filterPlanets", {
		required: true,
	});

	/** a changed filter re-applies it, after the parent has the new value */
	function applying<T>(model: Ref<T>): WritableComputedRef<T> {
		return computed({
			get: () => model.value,
			set: (v: T) => {
				model.value = v;
				emit("applyFilter");
			},
		});
	}

	const localLoadBalance = applying(loadBalance);
	const localHideConsumables = applying(hideConsumables);
	const localFilterMaterials = applying(filterMaterials);
	const localFilterPlanets = applying(filterPlanets);

	// Summary closes every row, also when it is already selected
	function summary(): void {
		expandAll.value = false;
		emit("collapseAll");
	}
</script>

<template>
	<!-- the selects wrap below the buttons when there is less than 15rem left -->
	<div class="flex flex-wrap gap-6">
		<div class="max-w-full">
			<PForm>
				<PFormItem :label="t('empire.filters.display')">
					<PButtonGroup>
						<PButton
							:pressed="!localLoadBalance"
							@click="localLoadBalance = false">
							{{ $t("empire.filters.all") }}
						</PButton>
						<PButton
							:pressed="localLoadBalance"
							@click="localLoadBalance = true">
							{{ $t("empire.filters.loadbalance") }}
						</PButton>
					</PButtonGroup>
				</PFormItem>
				<PFormItem :label="t('empire.filters.consumables')">
					<PButtonGroup>
						<PButton
							:pressed="!localHideConsumables"
							@click="localHideConsumables = false">
							{{ $t("common.buttons.show") }}
						</PButton>
						<PButton
							:pressed="localHideConsumables"
							@click="localHideConsumables = true">
							{{ $t("common.buttons.hide") }}
						</PButton>
					</PButtonGroup>
				</PFormItem>
				<PFormItem
					v-if="showExpandAll"
					:label="t('empire.material_io.planets')">
					<PButtonGroup>
						<PButton :pressed="!expandAll" @click="summary">
							{{ $t("empire.material_io.summary") }}
						</PButton>
						<PButton :pressed="expandAll" @click="expandAll = true">
							{{ $t("empire.material_io.expand_all") }}
						</PButton>
					</PButtonGroup>
				</PFormItem>
			</PForm>
		</div>
		<div class="grow basis-60">
			<PForm>
				<PFormItem :label="t('terms.materials', 2)">
					<PSelectMultiple
						v-model:value="localFilterMaterials"
						searchable
						clearable
						class="w-full"
						:options="materialOptions" />
				</PFormItem>
				<PFormItem :label="t('terms.planets', 2)">
					<PSelectMultiple
						v-model:value="localFilterPlanets"
						searchable
						clearable
						class="w-full"
						:options="planetOptions" />
				</PFormItem>
			</PForm>
		</div>
	</div>
</template>
