<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { useXITAction } from "@/features/xit/useXITAction";
	const { materials } = useMaterialData();
	const { transferJSON } = useXITAction();

	// Util
	import {
		buyList,
		formatMoney,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";
	import { copyToClipboard } from "@/util/data";
	import { XITSTATIONWAREHOUSESTOCX } from "@/features/xit/xitConstants";

	// Types & Interfaces
	import type { IChainResult } from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import { PButton, PInputNumber, useToast } from "@/ui";

	const { result } = defineProps<{ result: IChainResult }>();

	const emit = defineEmits<{
		(e: "xit"): void;
	}>();

	const toast = useToast();
	const DEFAULT_DAYS = 10;
	const days = ref(DEFAULT_DAYS);

	const materialMap = computed(
		() => new Map((materials.value ?? []).map((m) => [m.ticker, m]))
	);
	const list = computed(() => buyList(result, materialMap.value, days.value));

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });

	/** the CX most bought rows are priced on, its station's warehouse */
	const origin = computed(() => {
		const counts = new Map<string, number>();
		for (const i of list.value.items) {
			const cx = result.rows[i.ticker].exchange;
			if (cx) counts.set(cx, (counts.get(cx) ?? 0) + 1);
		}
		const cx = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
		return Object.entries(XITSTATIONWAREHOUSESTOCX).find(
			([, code]) => code === cx
		)?.[0];
	});

	function setDays(v: number | null | undefined): void {
		if (v != null && v >= 1) days.value = v;
	}

	function copyXIT(): void {
		copyToClipboard(
			transferJSON(
				list.value.items.map((i) => ({ ticker: i.ticker, value: i.units })),
				{
					name: t("production_chains.buy_list.xit_name"),
					origin: origin.value,
					buy: true,
				}
			).value
		);
		toast(t("production_chains.buy_list.xit_copied"));
		emit("xit");
	}
</script>

<template>
	<section class="rounded-panel border border-line p-3 flex flex-col gap-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="font-bold">{{ $t("production_chains.buy_list.title") }}</h2>
			<label class="flex items-center gap-2 text-xs text-muted">
				{{ $t("production_chains.buy_list.for") }}
				<PInputNumber
					:value="days"
					:min="1"
					size="sm"
					class="w-16"
					:aria-label="t('production_chains.buy_list.days_label')"
					@update:value="setDays" />
				{{ $t("production_chains.buy_list.days") }}
			</label>
		</div>
		<p v-if="!list.items.length" class="text-muted">
			{{ $t("production_chains.buy_list.nothing") }}
		</p>
		<table v-else class="w-full tabular-nums" data-testid="chain-buy-list">
			<thead class="text-xs uppercase text-muted">
				<tr>
					<th class="text-left font-normal">
						<span class="sr-only">{{ $t("production_chains.buy_list.material") }}</span>
					</th>
					<th class="text-right font-normal">{{ $t("production_chains.buy_list.units") }}</th>
					<th class="text-right font-normal">{{ $t("production_chains.buy_list.weight") }}</th>
					<th class="text-right font-normal">{{ $t("production_chains.buy_list.cost") }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="i in list.items" :key="i.ticker">
					<td class="py-0.5"><MaterialTile :key="i.ticker" :ticker="i.ticker" /></td>
					<td class="text-right">{{ formatNumber(i.units, 0) }}</td>
					<td class="text-right">{{ $t("production_chains.buy_list.tons", { n: formatNumber(i.weight, 1) }) }}</td>
					<td class="text-right">{{ money(i.cost) }}</td>
				</tr>
				<tr class="border-t border-line font-bold">
					<td class="pt-1">{{ $t("production_chains.buy_list.total") }}</td>
					<td />
					<td class="text-right pt-1">{{ $t("production_chains.buy_list.tons", { n: formatNumber(list.weight, 1) }) }}</td>
					<td class="text-right pt-1">{{ money(list.cost) }}</td>
				</tr>
			</tbody>
		</table>
		<p v-if="list.items.length" class="text-xs text-muted">
			{{ $t("production_chains.buy_list.volume", { n: formatNumber(list.volume, 0) }) }}
		</p>
		<p class="text-xs text-muted">
			{{
				$t("production_chains.buy_list.targets_out", {
					t: formatNumber(list.targetsWeight, 0),
					m: formatNumber(list.targetsVolume, 0),
				})
			}}
		</p>
		<div v-if="list.items.length">
			<PButton size="sm" type="secondary" @click="copyXIT">
				{{ $t("production_chains.buy_list.xit") }}
			</PButton>
		</div>
	</section>
</template>
