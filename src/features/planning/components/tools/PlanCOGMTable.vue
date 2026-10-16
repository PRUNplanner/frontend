<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	import { RouterLink } from "vue-router";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { humanizeTimeMs } from "@/util/date";
	import { formatNumber } from "@/util/numbers";
	import {
		CX_DOT_COLOR,
		isNoPrice,
		priceSourceLabel,
	} from "@/features/exchanges/exchangeLabel.util";
	import { ALL_PLANETS } from "@/features/exchanges/cxEdit.util";

	// Types & Interfaces
	import type { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
	import type { IPriceBook, IPriceSource } from "@/features/cx/priceBook";

	// UI
	import { PTable, PTag } from "@/ui";

	const {
		data,
		prices = undefined,
		market = undefined,
		cxUuid = undefined,
		planetId = undefined,
	} = defineProps<{
		data: IProductionBuildingRecipeCOGM;
		// the plan's prices: each input shows where its price comes from
		prices?: IPriceBook;
		// an output's market price, without fixed prices
		market?: (ticker: string) => number;
		cxUuid?: string;
		planetId?: string;
	}>();

	const { t } = useI18n();


	// the Exchanges scope whose rule sets the price; none without a CX
	function exchangesLink(s: IPriceSource): string | undefined {
		if (!cxUuid) return undefined;
		const planetLevel =
			s.level === "planet_ticker" || s.level === "planet_exchange";
		const scope = planetLevel && planetId ? planetId : ALL_PLANETS;
		return `/exchanges/${cxUuid}?scope=${scope}`;
	}

	// inputs with their price source, linked to its rule
	const inputs = computed(() =>
		data.inputCost.map((input) => {
			const source = prices?.getPriceSource(input.ticker, "BUY");
			return {
				...input,
				source,
				noPrice: source ? isNoPrice(source) : false,
				link: source ? exchangesLink(source) : undefined,
			};
		})
	);

	function marketLine(ticker: string, cogm: number): string | undefined {
		const price = market?.(ticker);
		if (!price) return undefined;
		return t("plan.tools.cogm.table.market", {
			price: formatNumber(price),
			diff: formatNumber(((cogm - price) / price) * 100, 0, false, true),
		});
	}
</script>

<template>
	<PTable>
		<tbody>
			<tr>
				<th colspan="4">
					{{ $t("plan.tools.cogm.table.parameters") }}
				</th>
			</tr>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.recipe_runtime") }}
				</td>
				<td>{{ humanizeTimeMs(data.runtime) }}</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }}
					{{ $t("plan.tools.cogm.table.percent_day") }}
				</td>
			</tr>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.efficiency") }}
				</td>
				<td colspan="3">{{ formatNumber(data.efficiency * 100) }} %</td>
			</tr>
			<tr>
				<th colspan="4">{{ $t("plan.tools.cogm.table.cost") }}</th>
			</tr>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.degradation") }}
				</td>
				<td class="font-bold">
					{{ formatNumber(data.degradationShare) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }} % /
					{{ formatNumber(data.degradation) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<template v-if="data.inputCost.length > 0">
				<tr>
					<td :rowspan="data.inputCost.length + 2" class="border-r">
						{{ $t("plan.tools.cogm.table.materials") }}
					</td>
					<td>{{ $t("plan.tools.cogm.table.input_total") }}</td>
					<td colspan="2" class="text-end font-bold">
						{{ formatNumber(data.inputTotal) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</td>
				</tr>
				<tr>
					<td>{{ $t("plan.tools.cogm.table.material") }}</td>
					<td>{{ $t("plan.tools.cogm.table.cost_unit") }}</td>
					<td class="text-end">
						{{ $t("plan.tools.cogm.table.cost_total_unit") }}
					</td>
				</tr>
				<tr
					v-for="input in inputs"
					:key="`INPUT#${input.ticker}`">
					<td>
						<div class="flex flex-wrap items-center gap-2">
							<MaterialTile
								:key="input.ticker"
								:ticker="input.ticker"
								:amount="input.amount" />
							<component
								:is="input.link ? RouterLink : 'span'"
								v-if="input.source"
								:to="input.link"
								:data-source="input.ticker">
								<PTag
									size="sm"
									:type="input.noPrice ? 'warning' : 'secondary'">
									<span
										v-if="
											input.source.exchange &&
											!input.noPrice
										"
										class="size-2 rounded-full"
										:style="{
											background:
												CX_DOT_COLOR[
													input.source.exchange
												],
										}" />
									{{ priceSourceLabel(input.source, t) }}
								</PTag>
							</component>
						</div>
					</td>
					<td>
						{{ formatNumber(input.costUnit) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</td>
					<td class="text-end">
						{{ formatNumber(input.costTotal) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</td>
				</tr>
			</template>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.workforce") }}
				</td>
				<td class="font-bold">
					{{ formatNumber(data.workforceCost) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }} % /
					{{ formatNumber(data.workforceCostTotal) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<tr class="child:border-t-2!">
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.total_cost") }}
				</td>
				<td colspan="3" class="font-bold">
					{{ formatNumber(data.totalCost) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<tr class="child:border-b-2!">
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.recipe_profit") }}
				</td>
				<td colspan="3" class="font-bold">
					{{ formatNumber(data.totalProfit) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<tr>
				<th colspan="4">{{ $t("plan.tools.cogm.title") }}</th>
			</tr>
			<tr>
				<td
					:rowspan="data.outputCOGM.length + 1"
					class="border-b-0! border-r">
					{{ $t("plan.tools.cogm.cogm") }}
				</td>
				<td>{{ $t("plan.tools.cogm.table.material") }}</td>
				<td>{{ $t("plan.tools.cogm.table.cost_split") }}</td>
				<td class="text-end">
					{{ $t("plan.tools.cogm.table.cost_total") }}
				</td>
			</tr>
			<tr
				v-for="output in data.outputCOGM"
				:key="`OUTPUT#${output.ticker}`">
				<td>
					<MaterialTile
						:key="output.ticker"
						:ticker="output.ticker"
						:amount="output.amount" />
				</td>
				<td>
					{{ formatNumber(output.costSplit) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
				<td class="text-end">
					<span class="font-bold">
						{{ formatNumber(output.costTotal) }}
					</span>
					<span class="pl-1 font-light text-muted"> ȼ </span>
					<div
						v-if="marketLine(output.ticker, output.costTotal)"
						class="text-xs text-muted tabular-nums"
						:data-market="output.ticker">
						{{ marketLine(output.ticker, output.costTotal) }}
					</div>
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
