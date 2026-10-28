<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

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
	import {
		OWN_SUPPLIER,
		unusedSurplus,
	} from "@/features/production_chain/engine/chainHave";

	// Util
	import {
		formatMoney,
		formatQty,
		NO_OWN,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

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
	import type {
		IChainCreated,
		IChainOwn,
	} from "@/features/production_chain/productionChain.types";
	import type { ICheckPlan } from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PButton, PTable } from "@/ui";

	const {
		result,
		bases,
		efficiency,
		ctx,
		created,
		ready,
		own = NO_OWN,
	} = defineProps<{
		result: IChainResult;
		bases: IChainBase[];
		/** chain efficiency in % */
		efficiency: number;
		ctx: IChainContext;
		created: IChainCreated | null;
		/** every base with steps has a planet and fits */
		ready: boolean;
		own?: IChainOwn;
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

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });
	const planetName = (id: string) =>
		planetDisplayName(id, own.planets.get(id)?.planet_name ?? id);

	/** the supplying plans, each with what the chain uses of it */
	const fromPlans = computed(() => {
		const plans = new Map<
			string,
			{
				key: string;
				plan: ICheckPlan | null;
				items: { ticker: string; perDay: number; surplus: number | null }[];
				value: number;
			}
		>();
		for (const [ticker, list] of Object.entries(own.suppliers))
			for (const s of list) {
				const entry = plans.get(s.key) ?? {
					key: s.key,
					plan: s.plan,
					items: [],
					value: 0,
				};
				entry.items.push({ ticker, perDay: s.perDay, surplus: s.surplus });
				entry.value += s.perDay * result.rows[ticker].price;
				plans.set(s.key, entry);
			}
		// plan-name order, "Your bases" last
		return [...plans.values()].sort(
			(a, b) =>
				Number(!a.plan) - Number(!b.plan) ||
				(a.plan?.name ?? "").localeCompare(b.plan?.name ?? "")
		);
	});
	const fromPlansValue = computed(() =>
		fromPlans.value.reduce((s, p) => s + p.value, 0)
	);
	const unused = computed(() =>
		own.name ? unusedSurplus(own.surplus, result) : []
	);

	const byKey = computed(() => new Map(fromPlans.value.map((p) => [p.key, p])));
	const planOf = (end: string) => byKey.value.get(end)?.plan;
	/** a route end's name: a base id, an exchange, a plan or "Your bases" */
	function endName(end: string): string {
		if (end === OWN_SUPPLIER) return t("production_chains.have.your_bases");
		return planOf(end)?.name ?? end;
	}
	const isSupplier = (end: string) => byKey.value.has(end);

	/** a base's planet system, a plan's or an exchange's */
	function systemOf(end: string): string | undefined {
		const planetId = planOf(end)?.planetId;
		return (
			result.bases.find((b) => b.id === end)?.planet?.system_id ??
			(planetId ? own.planets.get(planetId)?.system_id : undefined) ??
			CX_SYSTEMS[end]
		);
	}

	const materialMap = computed(
		() => new Map((materials.value ?? []).map((m) => [m.ticker, m]))
	);
	const routes = computed(() =>
		chainShipping(
			result,
			materialMap.value,
			(from, to) => {
				const a = systemOf(from);
				const b = systemOf(to);
				return a && b ? (getJumpsFrom(a).get(b) ?? null) : null;
			},
			own.suppliers
		)
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

		<section v-if="fromPlans.length" data-testid="chain-from-plans">
			<h2 class="font-bold">
				{{ $t("production_chains.have.bases_title") }}
				<span class="font-normal text-muted">
					{{ $t("production_chains.have.bases_value", { value: money(fromPlansValue) }) }}
				</span>
			</h2>
			<p class="text-xs text-muted pb-2">
				{{
					own.name
						? $t("production_chains.have.bases_note", { empire: own.name })
						: $t("production_chains.have.bases_note_typed")
				}}
			</p>
			<div class="overflow-x-auto">
				<PTable>
					<thead>
						<tr>
							<th>{{ $t("production_chains.have.plan") }}</th>
							<th>{{ $t("production_chains.have.planet") }}</th>
							<th>{{ $t("production_chains.have.materials") }}</th>
							<th class="numeric">{{ $t("production_chains.have.value") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="p in fromPlans"
							:key="p.key"
							:data-testid="`chain-from-plan-${p.key}`">
							<td class="whitespace-nowrap">
								<RouterLink
									v-if="p.plan"
									:to="{
										name: 'plan',
										params: { planetNaturalId: p.plan.planetId, planUuid: p.plan.uuid },
									}"
									class="text-link hover:underline">
									{{ p.plan.name }}&nbsp;↗
								</RouterLink>
								<span v-else>{{ $t("production_chains.have.your_bases") }}</span>
							</td>
							<td class="whitespace-nowrap">{{ p.plan ? planetName(p.plan.planetId) : "–" }}</td>
							<td>
								<span class="flex flex-wrap gap-x-3 gap-y-1">
									<span
										v-for="m in p.items"
										:key="m.ticker"
										class="inline-flex items-center gap-1 tabular-nums">
										<MaterialTile :key="m.ticker" :ticker="m.ticker" />
										{{ formatQty(m.perDay) }}
										<span
											v-if="m.surplus !== null && m.surplus - m.perDay > 1e-6"
											class="text-muted whitespace-nowrap">
											{{ $t("production_chains.have.of", { n: formatQty(m.surplus) }) }}
										</span>
									</span>
								</span>
							</td>
							<td class="numeric tabular-nums whitespace-nowrap">{{ money(p.value) }}</td>
						</tr>
					</tbody>
				</PTable>
			</div>
			<!-- an empire's surplus can be long: closed until asked for -->
			<details v-if="unused.length" class="text-xs text-muted pt-1" data-testid="chain-unused-surplus">
				<summary class="cursor-pointer">
					{{ $t("production_chains.have.unused", unused.length) }}
				</summary>
				<span class="flex flex-wrap gap-x-3 gap-y-1 pt-1 tabular-nums">
					<span v-for="u in unused" :key="u.ticker" class="whitespace-nowrap">
						{{ u.ticker }} {{ formatQty(u.perDay) }}
					</span>
				</span>
			</details>
		</section>

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
									class="px-1 rounded-control border text-xs"
									:class="
										isBase(r.from)
											? 'border-line font-mono'
											: isSupplier(r.from)
												? 'border-have text-have'
												: 'border-link text-link font-mono'
									">
									{{ endName(r.from) }}
								</span>
								→
								<span
									class="px-1 rounded-control border text-xs"
									:class="
										isBase(r.to)
											? 'border-line font-mono'
											: isSupplier(r.to)
												? 'border-have text-have'
												: 'border-link text-link font-mono'
									">
									{{ endName(r.to) }}
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
