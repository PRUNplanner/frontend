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

	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

	// UI
	import { PInputNumber, PSegmented, PSelect, PSpin } from "@/ui";

	const {
		followDefault,
		empires = [],
		ownEmpire = undefined,
		ownLoading = false,
		ownError = null,
	} = defineProps<{
		/** false: a CX from a link wins over the user's default */
		followDefault: boolean;
		/** the user's empires, for Own production */
		empires?: PlanEmpireElement[];
		/** the picked empire, undefined for none */
		ownEmpire?: string;
		ownLoading?: boolean;
		/** the empire whose plans failed to load */
		ownError?: string | null;
	}>();

	const emit = defineEmits<{
		(e: "own", uuid: string | undefined): void;
	}>();

	const NONE = "";
	const ownOptions = computed(() => [
		{ value: NONE, label: t("production_chains.have.none") },
		...empires.map((e) => ({ value: e.uuid, label: e.empire_name })),
	]);
	const ownName = computed(
		() => empires.find((e) => e.uuid === ownEmpire)?.empire_name ?? ""
	);

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
		{
			value: "cover" as const,
			label: t("production_chains.settings.cover"),
		},
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
				v-model:cx-uuid="cxUuid"
				:follow-default="followDefault"
				size="sm"
				select-class="w-52" />
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
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-xs uppercase tracking-wide text-muted">
				{{ $t("production_chains.have.own_production") }}
			</span>
			<PSelect
				:value="ownEmpire ?? NONE"
				:options="ownOptions"
				size="sm"
				class="w-44"
				:aria-label="t('production_chains.have.own_production')"
				data-testid="chain-own-production"
				@update:value="(v) => emit('own', v ? String(v) : undefined)" />
			<span
				v-if="ownLoading"
				class="flex items-center gap-1 text-xs text-muted"
				role="status">
				<PSpin size="xs" color="muted" />
				{{ $t("production_chains.have.loading", { name: ownName }) }}
			</span>
			<span
				v-else-if="ownError"
				class="text-xs text-negative"
				role="alert">
				{{ $t("production_chains.have.error", { name: ownError }) }}
			</span>
		</div>
	</div>
</template>
