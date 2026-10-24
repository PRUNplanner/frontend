<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";

	// Util
	import { formatQty } from "@/features/production_chain/productionChain.util";
	import { formatMaterialName } from "@/util/text";

	// Types & Interfaces
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { ICheckSold } from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PButton, PInputNumber, PSegmented, PSelect } from "@/ui";

	const { empires, empire, targets, sold, net } = defineProps<{
		empires: PlanEmpireElement[];
		empire: string | undefined;
		targets: string[];
		/** what the empire sells, null before its plans are calculated */
		sold: ICheckSold[] | null;
		net: Record<string, number>;
	}>();

	const cxUuid = defineModel<string | undefined>("cxUuid", {
		required: true,
	});
	const setup = defineModel<boolean>("setup", { required: true });
	const min = defineModel<number>("min", { required: true });
	const payback = defineModel<number>("payback", { required: true });

	const emit = defineEmits<{
		(e: "empire", uuid: string): void;
		(e: "targets", tickers: string[]): void;
		(e: "add-all"): void;
	}>();

	const { materialsMap } = useMaterialData();
	const nameOf = (ticker: string) =>
		formatMaterialName(materialsMap.value[ticker]?.name ?? ticker, ticker);

	const empireOptions = computed(() =>
		empires.map((e) => ({
			value: e.uuid,
			label: t(
				"production_chains.check.empire_option",
				{ name: e.empire_name, n: e.plans.length },
				e.plans.length
			),
		}))
	);

	const left = computed(() =>
		(sold ?? []).filter((s) => !targets.includes(s.ticker))
	);
	const addOptions = computed(() =>
		left.value.map((s) => ({
			value: s.ticker,
			label: t("production_chains.check.add_option", {
				ticker: s.ticker,
				name: nameOf(s.ticker),
				n: formatQty(s.perDay),
			}),
		}))
	);

	const setupOptions = computed(() => [
		{ value: "show", label: t("production_chains.check.show") },
		{ value: "hide", label: t("production_chains.check.hide") },
	]);
	const setupValue = computed({
		get: () => (setup.value ? "show" : "hide"),
		set: (v: string) => (setup.value = v === "show"),
	});

	function add(ticker: string | number | null | undefined): void {
		if (typeof ticker === "string" && ticker)
			emit("targets", [...targets, ticker]);
	}
	function remove(ticker: string): void {
		emit(
			"targets",
			targets.filter((x) => x !== ticker)
		);
	}
</script>

<template>
	<div class="flex flex-col gap-3" data-testid="check-bar">
		<div class="flex flex-wrap items-end gap-x-6 gap-y-3">
			<label class="flex flex-col gap-1 w-full sm:w-auto">
				<span class="text-xs uppercase tracking-wide text-muted">{{
					$t("production_chains.check.empire")
				}}</span>
				<PSelect
					:value="empire"
					:options="empireOptions"
					size="sm"
					class="w-full sm:w-64"
					:aria-label="t('production_chains.check.empire')"
					data-testid="check-empire"
					@update:value="(v) => typeof v === 'string' && emit('empire', v)" />
			</label>
			<div class="flex flex-col gap-1 min-w-0 flex-1">
				<span class="text-xs uppercase tracking-wide text-muted">{{
					$t("production_chains.check.chains")
				}}</span>
				<div class="flex flex-wrap items-center gap-2">
					<span
						v-for="x in targets"
						:key="x"
						class="inline-flex items-center gap-1 rounded-control border border-line pl-1"
						:data-testid="`check-target-${x}`">
						<MaterialTile :ticker="x" />
						<span class="text-sm tabular-nums text-muted">{{
							$t("production_chains.check.per_day", {
								n: formatQty(Math.max(net[x] ?? 0, 0)),
							})
						}}</span>
						<PButton
							type="ghost"
							size="sm"
							:aria-label="t('production_chains.check.remove', { ticker: x })"
							@click="remove(x)">
							×
						</PButton>
					</span>
					<PSelect
						v-if="left.length"
						:value="null"
						:options="addOptions"
						searchable
						size="sm"
						class="w-full sm:w-64"
						:placeholder="t('production_chains.check.add')"
						:aria-label="t('production_chains.check.add')"
						data-testid="check-add"
						@update:value="add" />
					<PButton
						v-if="left.length"
						type="secondary"
						size="sm"
						data-testid="check-add-all"
						@click="emit('add-all')">
						{{
							$t("production_chains.check.add_all", {
								n: sold?.length ?? 0,
							})
						}}
					</PButton>
					<PButton
						v-if="targets.length"
						type="secondary"
						size="sm"
						data-testid="check-clear"
						@click="emit('targets', [])">
						{{ $t("production_chains.check.clear") }}
					</PButton>
				</div>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			<div class="flex items-center gap-2">
				<span class="text-xs uppercase tracking-wide text-muted">
					{{ $t("production_chains.check.prices") }}
				</span>
				<CXPreferenceSelector
					:cx-uuid="cxUuid"
					:follow-default="false"
					size="sm"
					select-class="w-52"
					@update:cxuuid="(v) => (cxUuid = v)" />
			</div>
			<div class="flex items-center gap-2">
				<span class="text-xs uppercase tracking-wide text-muted">
					{{ $t("production_chains.check.setup") }}
				</span>
				<PSegmented
					v-model:value="setupValue"
					:options="setupOptions"
					size="sm"
					:label="t('production_chains.check.setup')"
					data-testid="check-setup" />
			</div>
			<label class="flex items-center gap-2">
				<span class="text-xs uppercase tracking-wide text-muted">
					{{ $t("production_chains.check.min") }}
				</span>
				<PInputNumber
					:value="min"
					:min="0"
					size="sm"
					class="w-24"
					:aria-label="t('production_chains.check.min')"
					data-testid="check-min"
					@update:value="(v) => v != null && v >= 0 && (min = v)" />
				<span class="text-muted">{{ $t("production_chains.check.min_unit") }}</span>
			</label>
			<label class="flex items-center gap-2">
				<span class="text-xs uppercase tracking-wide text-muted">
					{{ $t("production_chains.check.pay") }}
				</span>
				<PInputNumber
					:value="payback"
					:min="0"
					size="sm"
					class="w-20"
					:aria-label="t('production_chains.check.pay')"
					data-testid="check-pay"
					@update:value="(v) => v != null && v >= 0 && (payback = v)" />
				<span class="text-muted">{{ $t("production_chains.check.pay_unit") }}</span>
			</label>
		</div>
	</div>
</template>
