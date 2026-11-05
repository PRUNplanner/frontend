<script setup lang="ts">
	import { computed, type Ref, type WritableComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// UI
	import { PForm, PFormItem, PSegmented, PSelectMultiple } from "@/ui";

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
					<PSegmented
						:value="localLoadBalance ? 'loadbalance' : 'all'"
						:options="[
							{ value: 'all', label: t('empire.filters.all') },
							{
								value: 'loadbalance',
								label: t('empire.filters.loadbalance'),
							},
						]"
						:label="t('empire.filters.display')"
						@update:value="
							(v) => (localLoadBalance = v === 'loadbalance')
						" />
				</PFormItem>
				<PFormItem :label="t('empire.filters.consumables')">
					<PSegmented
						:value="localHideConsumables ? 'hide' : 'show'"
						:options="[
							{ value: 'show', label: t('common.buttons.show') },
							{ value: 'hide', label: t('common.buttons.hide') },
						]"
						:label="t('empire.filters.consumables')"
						@update:value="
							(v) => (localHideConsumables = v === 'hide')
						" />
				</PFormItem>
				<PFormItem
					v-if="showExpandAll"
					:label="t('empire.material_io.planets')">
					<!-- Summary also closes open rows when already picked -->
					<PSegmented
						:value="expandAll ? 'expand' : 'summary'"
						:options="[
							{
								value: 'summary',
								label: t('empire.material_io.summary'),
							},
							{
								value: 'expand',
								label: t('empire.material_io.expand_all'),
							},
						]"
						:label="t('empire.material_io.planets')"
						@select="
							(v) =>
								v === 'expand' ? (expandAll = true) : summary()
						" />
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
