<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import ChainRecipeText from "@/features/production_chain/components/ChainRecipeText.vue";

	// Util
	import { money, signedMoney } from "@/features/production_chain/chainCheck.util";
	import {
		formatQty,
		formatShare,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		ICheckChainRow,
		ICheckFinding,
		ICheckResult,
	} from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PTable, PTag } from "@/ui";

	const { result } = defineProps<{ result: ICheckResult }>();

	/** findings on a material's steps, for its chips */
	const chipsOf = (row: ICheckChainRow): ICheckFinding[] =>
		result.findings.filter(
			(f) => f.step && row.steps.includes(f.step)
		);
</script>

<template>
	<div class="overflow-x-auto" data-testid="check-chains">
		<p v-if="!result.chains.length" class="p-3 text-sm text-muted">
			{{ $t("production_chains.check.chains_view.empty") }}
		</p>
		<PTable v-else>
			<thead>
				<tr>
					<th>{{ $t("production_chains.check.chains_view.material") }}</th>
					<th class="numeric">{{ $t("production_chains.check.chains_view.made") }}</th>
					<th>{{ $t("production_chains.check.chains_view.made_in") }}</th>
					<th>{{ $t("production_chains.check.chains_view.recipe") }}</th>
					<th class="numeric">{{ $t("production_chains.check.chains_view.cost") }}</th>
					<th class="numeric">{{ $t("production_chains.check.chains_view.price") }}</th>
					<th>{{ $t("production_chains.check.chains_view.default") }}</th>
				</tr>
			</thead>
			<tbody v-for="c in result.chains" :key="c.target" :data-testid="`check-chain-${c.target}`">
				<tr class="bg-surface-sunken">
					<td colspan="7">
						<span class="flex flex-wrap items-center gap-2">
							<MaterialTile :ticker="c.target" />
							<span class="text-sm text-muted">
								{{
									$t("production_chains.check.chains_view.head", {
										sold: formatQty(c.sold),
										value: money(t, c.value),
										n: c.rows.length,
									})
								}}
							</span>
							<span
								v-for="b in c.bases"
								:key="b"
								class="px-1 rounded-control border border-line font-mono font-bold text-xs">
								{{ b }}
							</span>
						</span>
					</td>
				</tr>
				<tr
					v-for="r in c.rows"
					:key="`${c.target}-${r.ticker}`"
					:data-testid="`check-chain-row-${c.target}-${r.ticker}`">
					<td>
						<span class="flex items-center" :style="{ paddingLeft: `${r.depth}rem` }">
							<MaterialTile :ticker="r.ticker" />
						</span>
					</td>
					<td class="numeric">
						<template v-if="r.steps.length">{{ formatQty(r.made) }}</template>
						<span v-else class="text-muted">{{
							$t("production_chains.check.chains_view.bought")
						}}</span>
					</td>
					<td>
						<span class="flex flex-col gap-0.5">
							<span v-for="s in r.steps" :key="s.key" class="whitespace-nowrap">
								<span class="px-1 rounded-control border border-line font-mono font-bold text-xs">{{
									s.base
								}}</span>
								{{ s.building }} {{ formatQty(s.buildings) }} · {{ formatShare(s.efficiency) }}
							</span>
						</span>
					</td>
					<td>
						<span class="flex flex-col gap-0.5">
							<template v-for="s in r.steps" :key="s.key">
								<span v-if="s.extraction" class="whitespace-nowrap">{{
									$t("production_chains.check.chains_view.extract", { ticker: s.ticker })
								}}</span>
								<ChainRecipeText v-else :recipe="s.recipe" :ticker="r.ticker" />
							</template>
						</span>
					</td>
					<td class="numeric">
						{{ r.steps.length ? formatNumber(r.unitCost, 0) : "—" }}
					</td>
					<td class="numeric">{{ formatNumber(r.price, 0) }}</td>
					<td>
						<span class="flex flex-col gap-1">
							<span v-if="r.chainDefault.kind === 'same'" class="text-positive">
								✓ {{ $t("production_chains.check.chains_view.same") }}
							</span>
							<span v-else-if="r.chainDefault.kind === 'extract'" class="text-positive">
								✓ {{ $t("production_chains.check.chains_view.extracting") }}
							</span>
							<span v-else-if="r.chainDefault.kind === 'bought'" class="text-positive">
								✓ {{ $t("production_chains.check.chains_view.bought_cheaper") }}
							</span>
							<span v-else-if="r.chainDefault.kind === 'raw'" class="text-positive">
								✓ {{ $t("production_chains.check.chains_view.raw") }}
							</span>
							<span v-else-if="r.chainDefault.kind === 'buy_cheaper'" class="text-warning">
								{{ $t("production_chains.check.chains_view.buy_cheaper") }}
							</span>
							<span v-else-if="r.chainDefault.kind === 'recipe'" class="text-warning whitespace-nowrap">
								{{ $t("production_chains.check.chains_view.chain") }}
								<ChainRecipeText :recipe="r.chainDefault.recipe" :ticker="r.ticker" />
							</span>
							<span v-else-if="r.chainDefault.kind === 'make'" class="text-warning whitespace-nowrap">
								{{
									$t("production_chains.check.chains_view.make", {
										cost: formatNumber(r.chainDefault.cost, 0),
									})
								}}
								<ChainRecipeText :recipe="r.chainDefault.recipe" :ticker="r.ticker" />
							</span>
							<span v-if="chipsOf(r).length" class="flex flex-wrap gap-1">
								<PTag
									v-for="f in chipsOf(r)"
									:key="f.id"
									size="sm"
									type="warning">
									{{ $t(`production_chains.check.kind.${f.kind}`) }}
									{{ signedMoney(t, f.delta) }}
								</PTag>
							</span>
						</span>
					</td>
				</tr>
			</tbody>
		</PTable>
	</div>
</template>
