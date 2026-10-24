<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";

	// Types & Interfaces
	import type {
		ChainByproductMode,
		ChainRawSource,
	} from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import { PInputNumber, PSegmented } from "@/ui";

	const { followDefault } = defineProps<{
		/** false: a CX from a link wins over the user's default */
		followDefault: boolean;
	}>();

	const efficiency = defineModel<number>("efficiency", { required: true });
	const rawSource = defineModel<ChainRawSource>("rawSource", {
		required: true,
	});
	const byproducts = defineModel<ChainByproductMode>("byproducts", {
		required: true,
	});
	const cxUuid = defineModel<string | undefined>("cxUuid", {
		required: true,
	});

	const rawOptions = computed(() => [
		{ value: "buy" as const, label: t("production_chains.settings.buy") },
		{
			value: "extract" as const,
			label: t("production_chains.settings.extract"),
		},
	]);
	const byproductOptions = computed(() => [
		{ value: "cover" as const, label: t("production_chains.settings.cover") },
		{ value: "sell" as const, label: t("production_chains.settings.sell") },
	]);

	function setEfficiency(v: number | null | undefined): void {
		if (v != null && v >= 1) efficiency.value = v;
	}
</script>

<template>
	<div class="flex flex-wrap items-center gap-x-6 gap-y-4">
		<label class="flex items-center gap-2">
			<span class="text-xs uppercase tracking-wide text-muted">
				{{ $t("production_chains.settings.efficiency") }}
			</span>
			<PInputNumber
				:value="efficiency"
				:min="1"
				:max="1000"
				size="sm"
				class="w-20"
				:aria-label="t('production_chains.settings.efficiency')"
				@update:value="setEfficiency" />
			<span class="text-muted">%</span>
		</label>
		<div class="flex items-center gap-2">
			<span class="text-xs uppercase tracking-wide text-muted">
				{{ $t("production_chains.settings.prices") }}
			</span>
			<CXPreferenceSelector
				:cx-uuid="cxUuid"
				:follow-default="followDefault"
				size="sm"
				select-class="w-52"
				@update:cxuuid="(v) => (cxUuid = v)" />
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs uppercase tracking-wide text-muted">
				{{ $t("production_chains.settings.raw") }}
			</span>
			<PSegmented
				v-model:value="rawSource"
				:options="rawOptions"
								:label="t('production_chains.settings.raw')" />
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs uppercase tracking-wide text-muted">
				{{ $t("production_chains.settings.byproducts") }}
			</span>
			<PSegmented
				v-model:value="byproducts"
				:options="byproductOptions"
								:label="t('production_chains.settings.byproducts')" />
		</div>
	</div>
</template>
