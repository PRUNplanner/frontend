<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePathfinder } from "@/features/pathfinding/usePathfinder";

	// Util
	import {
		findingText,
		money,
		optionChips,
		optionDimmed,
		optionWhy,
		planetSearchQuery,
		planetShort,
		signedMoney,
	} from "@/features/production_chain/chainCheck.util";
	import { formatShare } from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

	// Types & Interfaces
	import type {
		ICheckBase,
		ICheckFinding,
		ICheckLocationFinding,
		ICheckOption,
	} from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PButton, PTag } from "@/ui";

	const {
		finding: f,
		base,
		nameOf,
		payback,
	} = defineProps<{
		finding: ICheckFinding;
		base: ICheckBase;
		/** plan name of a base */
		nameOf: (id: string) => string;
		/** moves pay back within, days */
		payback: number;
	}>();

	const emit = defineEmits<{
		(e: "try"): void;
		/** open the step's planet list */
		(e: "planets"): void;
		(e: "reset"): void;
		(e: "open-plan"): void;
	}>();

	const TOP = 3;
	const { getPathBetweenLength } = usePathfinder();

	/** jumps between the step's system and the option's, null when unknown */
	function jumps(o: ICheckOption): string {
		// a location finding's base has a planet
		const n = getPathBetweenLength(base.planet!.system_id, o.planet.system_id);
		return n < 0 ? "" : t("production_chains.check.options.jumps", n);
	}

	const text = computed(() => findingText(t, f, base, nameOf));
	const tryable = computed(() =>
		["recipe", "buy", "location"].includes(f.kind)
	);
	const cost = computed(() =>
		f.construction > 0
			? f.payback !== null
				? t("production_chains.check.finding.construction", {
						value: money(t, f.construction),
						n: formatNumber(f.payback, 0),
					})
				: t("production_chains.check.finding.construction_only", {
						value: money(t, f.construction),
					})
			: t("production_chains.check.finding.no_construction")
	);

	/** the best three, plus the chosen one when it's further down */
	// only read in the template for a location finding
	const loc = () => f as ICheckLocationFinding;
	const top = computed(() => {
		const list = loc().options.slice(0, TOP);
		if (!list.includes(loc().option)) list.push(loc().option);
		return list;
	});

	function optionName(o: ICheckOption): string {
		return o.own
			? `${o.own} ${nameOf(o.own)}`
			: t("production_chains.check.options.new_base", {
					planet: planetShort(o.planet),
				});
	}
	function optionSub(o: ICheckOption): string {
		return [
			planetDisplayName(o.planet.planet_natural_id, o.planet.planet_name),
			optionWhy(t, loc(), o, base.planet!, base.running),
			o.own
				? t("production_chains.check.options.area_own", {
						need: formatNumber(o.area, 0),
						free: formatNumber(Math.max(0, o.free!), 0),
					})
				: t("production_chains.check.options.area_new", {
						n: formatNumber(o.area, 0),
					}),
			jumps(o),
		]
			.filter(Boolean)
			.join(" · ");
	}
	const optionCost = (o: ICheckOption) =>
		o.payback !== null
			? t("production_chains.check.options.cost", {
					value: money(t, o.construction),
					n: formatNumber(o.payback, 0),
				})
			: t("production_chains.check.options.cost_none", {
					value: money(t, o.construction),
				});
	const optionGain = (o: ICheckOption) =>
		t("production_chains.check.options.gain", {
			pct: formatShare(o.ratio - 1),
			value: signedMoney(t, o.gain),
		});
</script>

<template>
	<article
		class="rounded-panel border border-line p-3 flex flex-col gap-2 min-w-0"
		:data-testid="`check-finding-${f.id}`">
		<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="px-1.5 rounded-control border border-line font-mono font-bold text-xs">
						{{ base.id }}
					</span>
					<PTag
						size="sm"
						:type="f.kind === 'fix' ? 'error' : f.kind === 'setup' ? 'secondary' : 'warning'">
						{{ $t(`production_chains.check.kind.${f.kind}`) }}
					</PTag>
					<span class="font-bold">{{ text.title }}</span>
				</div>
				<p class="text-sm text-muted">{{ text.detail }}</p>
			</div>
			<div class="text-right tabular-nums">
				<div
					class="font-bold"
					:class="f.delta >= 0 ? 'text-positive' : 'text-negative'">
					{{
						$t("production_chains.check.finding.per_day", {
							value: signedMoney(t, f.delta),
						})
					}}
				</div>
				<div class="text-xs text-muted">{{ cost }}</div>
			</div>
		</div>

		<details
			v-if="f.kind === 'location'"
			:open="f.picked"
			data-testid="check-finding-options">
			<summary class="text-sm text-link cursor-pointer">
				{{
					$t("production_chains.check.options.summary", {
						n: Math.min(TOP, f.options.length),
						total: formatNumber(f.options.length, 0),
					})
				}}
			</summary>
			<ol class="flex flex-col gap-1 pt-2">
				<li
					v-for="o in top"
					:key="o.planet.planet_natural_id"
					class="grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-2 gap-y-1 rounded-control border border-line px-2 py-1.5"
					:class="{ 'opacity-60': optionDimmed(o) }">
					<span class="text-muted tabular-nums">{{
						f.options.indexOf(o) + 1
					}}</span>
					<span class="min-w-0">
						<span class="block">{{ optionName(o) }}</span>
						<span class="block text-xs text-muted">{{
							optionSub(o)
						}}</span>
						<span class="flex flex-wrap gap-1 pt-1">
							<PTag
								v-for="c in optionChips(t, f, o, payback)"
								:key="c.label"
								size="sm"
								:type="c.type"
								:title="c.title">
								{{ c.label }}
							</PTag>
						</span>
					</span>
					<span
						class="col-start-2 sm:col-start-3 sm:text-right tabular-nums">
						<span class="block text-positive">{{ optionGain(o) }}</span>
						<span class="block text-xs text-muted">{{
							optionCost(o)
						}}</span>
					</span>
				</li>
			</ol>
			<div class="flex flex-wrap gap-2 pt-2">
				<PButton
					size="sm"
					type="secondary"
					aria-haspopup="dialog"
					data-testid="check-finding-all-planets"
					@click="emit('planets')">
					{{
						$t("production_chains.check.options.all", {
							n: formatNumber(f.options.length, 0),
						})
					}}
				</PButton>
				<PButton
					v-if="f.picked"
					size="sm"
					type="secondary"
					data-testid="check-finding-reset"
					@click="emit('reset')">
					{{ $t("production_chains.check.options.reset") }}
				</PButton>
			</div>
		</details>

		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
			<router-link
				:to="`/plan/${base.plan.planetId}/${base.plan.uuid}`"
				class="text-link hover:underline"
				@click="emit('open-plan')">
				{{
					$t("production_chains.check.finding.open_plan", {
						name: base.plan.name,
					})
				}}
			</router-link>
			<PButton
				v-if="tryable"
				size="sm"
				type="secondary"
				data-testid="check-finding-try"
				@click="emit('try')">
				{{ $t("production_chains.check.finding.try") }}
			</PButton>
			<router-link
				v-if="f.kind === 'location'"
				:to="{ name: 'search', query: planetSearchQuery(f) }"
				class="text-link hover:underline">
				{{ $t("production_chains.check.finding.planet_search") }}
			</router-link>
		</div>
	</article>
</template>
