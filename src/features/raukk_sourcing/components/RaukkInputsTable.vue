<script setup lang="ts">
	import { computed, ComputedRef, PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import RaukkSourceCell from "@/features/raukk_sourcing/components/RaukkSourceCell.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PSelect, PTable, PTag } from "@/ui";
	import { PSelectOption } from "@/ui/ui.types";

	// Types & Interfaces
	import {
		IRaukkTickerSource,
		RAUKK_PRICE_MODE,
	} from "@/features/raukk_sourcing/raukkSourcing.types";
	import {
		IRaukkInputRow,
		IRaukkSourceOption,
	} from "@/features/raukk_sourcing/raukkSourcingUi.types";

	/** Sentinel of the "no configuration, use CX preference" entry */
	const DEFAULT_MODE: string = "DEFAULT";

	const props = defineProps({
		rows: {
			type: Array as PropType<IRaukkInputRow[]>,
			required: true,
		},
		sourceOptions: {
			type: Function as PropType<
				(ticker: string, unitsPerDay: number) => IRaukkSourceOption[]
			>,
			required: true,
		},
		repairCostPerDay: {
			type: Number,
			required: true,
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const emit = defineEmits<{
		(
			e: "update:source",
			ticker: string,
			source: IRaukkTickerSource | undefined
		): void;
	}>();

	const priceModeOptions: ComputedRef<PSelectOption[]> = computed(() => [
		{ label: t("raukk_sourcing.price_modes.default"), value: DEFAULT_MODE },
		{ label: t("raukk_sourcing.price_modes.BID"), value: "BID" },
		{ label: t("raukk_sourcing.price_modes.ASK"), value: "ASK" },
		{ label: t("raukk_sourcing.price_modes.MID"), value: "MID" },
		{ label: t("raukk_sourcing.price_modes.AVG7D"), value: "AVG7D" },
		{ label: t("raukk_sourcing.price_modes.AVG30D"), value: "AVG30D" },
	]);

	function priceModeValue(row: IRaukkInputRow): string {
		return row.source?.mode === "market" ? row.source.priceMode : DEFAULT_MODE;
	}

	function changePriceMode(row: IRaukkInputRow, value: string): void {
		if (value === DEFAULT_MODE) {
			emit("update:source", row.ticker, undefined);
			return;
		}

		emit("update:source", row.ticker, {
			mode: "market",
			priceMode: value as RAUKK_PRICE_MODE,
		});
	}

	const totalCostPerDay: ComputedRef<number> = computed(() =>
		props.rows.reduce((sum, row) => sum + row.costPerDay, 0)
	);
</script>

<template>
	<PTable striped>
		<thead>
			<tr>
				<th>{{ $t("raukk_sourcing.inputs.ticker") }}</th>
				<th>{{ $t("raukk_sourcing.inputs.buckets") }}</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.inputs.daily_need") }}
				</th>
				<th>{{ $t("raukk_sourcing.inputs.price_mode") }}</th>
				<th>{{ $t("raukk_sourcing.inputs.source") }}</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.inputs.effective_price") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.inputs.line_cost") }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="row in rows" :key="`RAUKKINPUT#${row.ticker}`">
				<td>
					<MaterialTile
						:key="`RAUKKSOURCING#Material#${row.ticker}`"
						:ticker="row.ticker" />
				</td>
				<td>
					<div class="flex flex-row gap-x-1">
						<PTag v-if="row.buckets.production" size="sm">
							{{ $t("raukk_sourcing.buckets.production") }}
						</PTag>
						<PTag
							v-if="row.buckets.workforce"
							size="sm"
							type="secondary">
							{{ $t("raukk_sourcing.buckets.workforce") }}
						</PTag>
						<PTag v-if="row.buckets.repair" size="sm" type="warning">
							{{ $t("raukk_sourcing.buckets.repair") }}
						</PTag>
					</div>
				</td>
				<td class="text-right">
					{{ formatNumber(row.unitsPerDay) }}
				</td>
				<td>
					<PSelect
						class="w-37.5!"
						:value="priceModeValue(row)"
						:options="priceModeOptions"
						:disabled="disabled || row.source?.mode === 'plan'"
						@update:value="
							(v) => changePriceMode(row, String(v ?? DEFAULT_MODE))
						" />
				</td>
				<td>
					<RaukkSourceCell
						:source="row.source"
						:options="sourceOptions(row.ticker, row.unitsPerDay)"
						:disabled="disabled"
						@update:source="
							(source) => emit('update:source', row.ticker, source)
						" />
				</td>
				<td class="text-right">
					{{ formatNumber(row.price) }}
				</td>
				<td class="text-right">
					{{ formatNumber(row.costPerDay) }}
				</td>
			</tr>
			<tr v-if="rows.length === 0">
				<td colspan="7" class="text-center text-white/50">
					{{ $t("raukk_sourcing.inputs.empty") }}
				</td>
			</tr>
		</tbody>
		<tfoot v-if="rows.length > 0">
			<tr class="font-bold">
				<td colspan="6">
					{{ $t("raukk_sourcing.inputs.total_cost") }}
				</td>
				<td class="text-right">
					{{ formatNumber(totalCostPerDay) }}
				</td>
			</tr>
			<tr>
				<td colspan="6">
					{{ $t("raukk_sourcing.inputs.repair_cost") }}
				</td>
				<td class="text-right">
					{{ formatNumber(repairCostPerDay) }}
				</td>
			</tr>
		</tfoot>
	</PTable>
</template>
