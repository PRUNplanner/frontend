<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Engine
	import { mainExpertise } from "@/features/production_chain/engine/chainAutoLayout";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

	// Types & Interfaces
	import type { chainShipping } from "@/features/production_chain/engine/chainBases";
	import type { IChainResult } from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import { PTable } from "@/ui";

	/**
	 * The bases at a glance: how many, their area, buildings and shipping,
	 * and one line per base
	 *
	 * @author jplacht
	 */
	const { result, routes } = defineProps<{
		result: IChainResult;
		routes: ReturnType<typeof chainShipping>;
	}>();

	const bases = computed(() =>
		result.bases.filter((b) => b.materials.length)
	);

	const expertiseOf = (id: string) => mainExpertise(result, id);

	const stats = computed(() => {
		const list = bases.value;
		const sum = (f: (b: (typeof list)[number]) => number) =>
			list.reduce((s, b) => s + f(b), 0);
		const over = list.filter((b) => b.overArea).length;
		return [
			{
				key: "count",
				value: formatNumber(list.length, 0),
				sub: t("production_chains.bases.overview.with_planet", {
					n: list.filter((b) => b.planet).length,
					total: list.length,
				}),
			},
			{
				key: "largest",
				value: formatNumber(Math.max(0, ...list.map((b) => b.area)), 0),
				tone: over ? "text-negative" : "",
				sub: over
					? t("production_chains.bases.overview.over", over)
					: t("production_chains.bases.overview.within"),
			},
			{
				key: "permits",
				value: formatNumber(
					sum((b) => b.permits),
					0
				),
				sub: t("production_chains.bases.overview.area_total", {
					n: formatNumber(
						sum((b) => b.area),
						0
					),
				}),
			},
			{
				key: "shipping",
				value: formatNumber(
					routes.reduce((s, r) => s + r.weight, 0),
					1
				),
				sub: t(
					"production_chains.bases.overview.routes",
					routes.length
				),
			},
		];
	});
</script>

<template>
	<section
		v-if="bases.length"
		class="flex flex-col gap-2"
		data-testid="chain-bases-overview">
		<div
			class="grid grid-cols-2 sm:grid-cols-4 rounded-panel border border-line divide-x divide-y sm:divide-y-0 divide-line overflow-hidden">
			<div
				v-for="s in stats"
				:key="s.key"
				class="px-3 py-2 min-w-0"
				:data-testid="`chain-bases-stat-${s.key}`">
				<div class="text-xs uppercase tracking-wide text-muted">
					{{ $t(`production_chains.bases.overview.${s.key}`) }}
				</div>
				<div class="text-xl font-bold tabular-nums" :class="s.tone">
					{{ s.value }}
				</div>
				<div class="text-xs text-muted">{{ s.sub }}</div>
			</div>
		</div>
		<div class="overflow-x-auto">
			<PTable>
				<thead>
					<tr>
						<th>
							{{ $t("production_chains.bases.overview.base") }}
						</th>
						<th class="hidden sm:table-cell">
							{{
								$t("production_chains.bases.overview.expertise")
							}}
						</th>
						<th>
							{{ $t("production_chains.bases.overview.planet") }}
						</th>
						<th class="numeric">
							{{ $t("production_chains.bases.buildings") }}
						</th>
						<th class="numeric">
							{{ $t("production_chains.bases.area") }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="b in bases"
						:key="b.id"
						:data-testid="`chain-bases-row-${b.id}`">
						<td class="whitespace-nowrap">
							<span
								class="px-1 rounded-control border border-line font-mono text-xs">
								{{ b.id }}
							</span>
							{{ b.name }}
						</td>
						<td class="whitespace-nowrap hidden sm:table-cell">
							{{
								expertiseOf(b.id)
									? $t(`game.expertise.${expertiseOf(b.id)}`)
									: "–"
							}}
						</td>
						<td class="whitespace-nowrap">
							{{
								b.planet
									? planetDisplayName(
											b.planet.planet_natural_id,
											b.planet.planet_name
										)
									: "–"
							}}
						</td>
						<td class="numeric tabular-nums">
							{{ formatNumber(b.built, 0) }}
						</td>
						<td
							class="numeric tabular-nums"
							:class="{ 'text-negative': b.overArea }">
							{{ formatNumber(b.area, 0) }}
						</td>
					</tr>
				</tbody>
			</PTable>
		</div>
	</section>
</template>
