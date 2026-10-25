<script setup lang="ts">
	import { computed } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import ChainBaseCard from "@/features/production_chain/components/ChainBaseCard.vue";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { usePathfinder } from "@/features/pathfinding/usePathfinder";
	const { materials } = useMaterialData();
	const { getJumpsFrom, systemidAI1, systemidCI1, systemidIC1, systemidNC1 } =
		usePathfinder();

	// Engine
	import {
		BASE_IDS,
		chainShipping,
		cogcFits,
	} from "@/features/production_chain/engine/chainBases";

	// Util
	import { formatQty } from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
	import type {
		ChainBaseCOGC,
		ChainExperts,
		ChainLux,
		IChainBase,
		IChainContext,
		IChainResult,
	} from "@/features/production_chain/engine/chainSolver.types";
	import type { IChainCreated } from "@/features/production_chain/productionChain.types";

	// UI
	import { PButton, PTable } from "@/ui";

	const { result, bases, efficiency, ctx, created, ready } = defineProps<{
		result: IChainResult;
		bases: IChainBase[];
		/** chain efficiency in % */
		efficiency: number;
		ctx: IChainContext;
		created: IChainCreated | null;
		/** every base with steps has a planet and fits */
		ready: boolean;
	}>();

	const emit = defineEmits<{
		(e: "split"): void;
		(e: "add"): void;
		(e: "remove", id: string): void;
		(e: "rename", id: string, name: string): void;
		(e: "cogc", id: string, cogc: ChainBaseCOGC): void;
		(e: "lux", id: string, lux: ChainLux): void;
		(e: "experts", id: string, experts: ChainExperts | undefined): void;
		(e: "planet", id: string): void;
		(e: "create"): void;
	}>();

	const CX_SYSTEMS: Record<string, string> = {
		AI1: systemidAI1,
		CI1: systemidCI1,
		IC1: systemidIC1,
		NC1: systemidNC1,
	};

	const choice = (id: string) => bases.find((b) => b.id === id)!;
	const planCount = computed(
		() => result.bases.filter((b) => b.materials.length).length
	);

	function fitsFor(id: string) {
		const tickers = result.bases
			.find((b) => b.id === id)!
			.buildingTypes.map((b) => b.ticker);
		return (program: PlanCOGCProgram) => cogcFits(ctx, program, tickers);
	}

	/** a base's planet system or an exchange's */
	function systemOf(end: string): string | undefined {
		return (
			result.bases.find((b) => b.id === end)?.planet?.system_id ??
			CX_SYSTEMS[end]
		);
	}

	const materialMap = computed(
		() => new Map((materials.value ?? []).map((m) => [m.ticker, m]))
	);
	const routes = computed(() =>
		chainShipping(result, materialMap.value, (from, to) => {
			const a = systemOf(from);
			const b = systemOf(to);
			return a && b ? (getJumpsFrom(a).get(b) ?? null) : null;
		})
	);
	const isBase = (end: string) => BASE_IDS.includes(end);
</script>

<template>
	<div class="flex flex-col gap-3 p-3" data-testid="chain-bases">
		<div class="flex flex-wrap items-center gap-2">
			<PButton
				size="sm"
				type="secondary"
				data-testid="chain-split"
				@click="emit('split')">
				{{ $t("production_chains.bases.split") }}
			</PButton>
			<PButton
				size="sm"
				type="secondary"
				:disabled="bases.length >= BASE_IDS.length"
				data-testid="chain-add-base"
				@click="emit('add')">
				{{ $t("production_chains.bases.add") }}
			</PButton>
			<span class="text-xs text-muted flex-1 min-w-48">{{
				$t("production_chains.bases.hint")
			}}</span>
			<PButton
				size="sm"
				:type="ready ? 'primary' : 'secondary'"
				:disabled="!planCount"
				data-testid="chain-bases-create"
				@click="emit('create')">
				{{ $t("production_chains.bases.create", planCount) }}
			</PButton>
		</div>

		<div
			v-if="created && created.plans.length"
			class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
			role="status"
			data-testid="chain-created-links">
			<span class="text-positive">{{
				$t("production_chains.create.created", created.plans.length)
			}}</span>
			<RouterLink
				v-for="p in created.plans"
				:key="p.uuid"
				:to="{
					name: 'plan',
					params: { planetNaturalId: p.planetId, planUuid: p.uuid },
				}"
				class="text-link hover:underline">
				{{ p.base }} · {{ p.name }}
			</RouterLink>
			<RouterLink
				v-if="created.empire"
				:to="{
					name: 'empire',
					params: { empireUuid: created.empire.uuid },
				}"
				class="text-link hover:underline">
				{{
					$t("production_chains.create.open_empire", {
						name: created.empire.name,
					})
				}}
			</RouterLink>
		</div>

		<div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
			<ChainBaseCard
				v-for="b in result.bases"
				:key="b.id"
				:base="b"
				:choice="choice(b.id)"
				:efficiency="Math.max(efficiency, 1) / 100"
				:removable="bases.length > 1"
				:fits="fitsFor(b.id)"
				@rename="(name) => emit('rename', b.id, name)"
				@remove="emit('remove', b.id)"
				@cogc="(c) => emit('cogc', b.id, c)"
				@lux="(l) => emit('lux', b.id, l)"
				@experts="(x) => emit('experts', b.id, x)"
				@planet="emit('planet', b.id)" />
		</div>

		<section>
			<h2 class="font-bold">
				{{ $t("production_chains.shipping.title") }}
			</h2>
			<p class="text-xs text-muted pb-2">
				{{ $t("production_chains.shipping.note") }}
			</p>
			<p v-if="!routes.length" class="text-muted">
				{{ $t("production_chains.shipping.nothing") }}
			</p>
			<div v-else class="overflow-x-auto">
				<PTable data-testid="chain-shipping">
					<thead>
						<tr>
							<th>
								{{ $t("production_chains.shipping.route") }}
							</th>
							<th>
								{{ $t("production_chains.shipping.materials") }}
							</th>
							<th class="numeric">
								{{ $t("production_chains.shipping.weight") }}
							</th>
							<th class="numeric">
								{{ $t("production_chains.shipping.volume") }}
							</th>
							<th class="numeric">
								{{ $t("production_chains.shipping.jumps") }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="r in routes"
							:key="`${r.from}-${r.to}`"
							:data-testid="`chain-route-${r.from}-${r.to}`">
							<td class="whitespace-nowrap">
								<span
									class="px-1 rounded-control border font-mono text-xs"
									:class="
										isBase(r.from)
											? 'border-line'
											: 'border-link text-link'
									">
									{{ r.from }}
								</span>
								→
								<span
									class="px-1 rounded-control border font-mono text-xs"
									:class="
										isBase(r.to)
											? 'border-line'
											: 'border-link text-link'
									">
									{{ r.to }}
								</span>
							</td>
							<td>
								<span class="flex flex-wrap gap-x-3 gap-y-1">
									<span
										v-for="m in r.materials"
										:key="m.ticker"
										class="inline-flex items-center gap-1 tabular-nums">
										<MaterialTile
											:key="m.ticker"
											:ticker="m.ticker" />
										{{ formatQty(m.perDay) }}
									</span>
								</span>
							</td>
							<td class="numeric tabular-nums">
								{{ formatNumber(r.weight, 1) }}
							</td>
							<td class="numeric tabular-nums">
								{{ formatNumber(r.volume, 1) }}
							</td>
							<td class="numeric tabular-nums">
								{{
									r.jumps === null
										? "–"
										: $t(
												"production_chains.shipping.n_jumps",
												r.jumps
											)
								}}
							</td>
						</tr>
					</tbody>
				</PTable>
			</div>
		</section>
	</div>
</template>
