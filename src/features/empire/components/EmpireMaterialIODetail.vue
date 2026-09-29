<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber } from "@/util/numbers";
	import {
		netPerPlanet,
		shortPlanetName,
		summarizeSide,
	} from "@/features/empire/util/empireMaterialIO.util";

	// UI
	import { PButton, PButtonGroup, PValue } from "@/ui";

	// Types & Interfaces
	import type {
		IEmpireMaterialIO,
		IEmpireMaterialIOSide,
	} from "@/features/empire/empire.types";

	/**
	 * Expanded Material I/O row: every plan per side, or the net per planet,
	 * each filling its half top to bottom, then the next column
	 *
	 * @author jplacht
	 */
	const { row, planetNames } = defineProps<{
		row: IEmpireMaterialIO;
		planetNames: Map<string, string>;
	}>();

	const view = defineModel<"sides" | "net">("view", { required: true });

	const name = (planetId: string) => shortPlanetName(planetNames, planetId);
	// "Planet (ID)" for link titles
	const fullName = (planetId: string) => planetNames.get(planetId) ?? planetId;

	const halves = computed(() => {
		const scale = Math.max(row.output, row.input);
		return [
			{
				key: "output",
				title: t("empire.material_io.produced_by"),
				empty: t("empire.material_io.not_produced"),
				side: summarizeSide(row.outputPlanets, "output", scale),
			},
			{
				key: "input",
				title: t("empire.material_io.consumed_by"),
				empty: t("empire.material_io.not_consumed"),
				side: summarizeSide(row.inputPlanets, "input", scale),
			},
		];
	});

	const net = computed(() => {
		const n = netPerPlanet(row);
		return [
			{
				key: "surplus",
				title: t("empire.material_io.surplus"),
				empty: t("empire.material_io.no_surplus"),
				entries: n.surplus,
				total: n.surplusTotal,
			},
			{
				key: "needs",
				title: t("empire.material_io.needs"),
				empty: t("empire.material_io.no_needs"),
				entries: n.needs,
				total: n.needsTotal,
			},
		];
	});

	/** "Planet · plan name" when the planet has several plans on this side */
	function sideLabel(side: IEmpireMaterialIOSide, planetId: string, plan: string) {
		return side.entries.filter((e) => e.planetId === planetId).length > 1
			? `${name(planetId)} · ${plan}`
			: name(planetId);
	}

	/** rows for 1 and 2 columns, the half's container query picks one */
	const rows = (n: number) => ({ "--r1": n, "--r2": Math.ceil(n / 2) });
</script>

<template>
	<div
		class="@container mx-2 my-1 p-4 border border-white/15 rounded-[3px] bg-black/30 flex flex-col gap-4">
		<PButtonGroup class="self-start">
			<PButton
				size="sm"
				:type="view === 'sides' ? 'primary' : 'secondary'"
				:aria-pressed="view === 'sides'"
				@click="view = 'sides'">
				{{ t("empire.material_io.view_sides") }}
			</PButton>
			<PButton
				size="sm"
				:type="view === 'net' ? 'primary' : 'secondary'"
				:aria-pressed="view === 'net'"
				@click="view = 'net'">
				{{ t("empire.material_io.view_net") }}
			</PButton>
		</PButtonGroup>

		<div class="grid grid-cols-1 @min-[640px]:grid-cols-2 gap-x-10 gap-y-6">
			<template v-if="view === 'sides'">
				<section
					v-for="half in halves"
					:key="half.key"
					class="@container min-w-0">
					<h4
						class="whitespace-nowrap text-xs font-bold uppercase tracking-wide mb-2">
						{{ half.title }}
						<span class="ml-1 font-normal text-white/55">
							{{
								t(
									"empire.material_io.plan_count",
									half.side.entries.length
								)
							}}
							·
							{{
								t("empire.material_io.per_day", {
									value: formatNumber(half.side.total),
								})
							}}
						</span>
					</h4>
					<p v-if="!half.side.entries.length" class="text-white/55">
						{{ half.empty }}
					</p>
					<ul
						v-else
						class="io-columns grid grid-flow-col auto-cols-fr gap-x-6 gap-y-2"
						:style="rows(half.side.entries.length)">
						<li v-for="e in half.side.entries" :key="e.planUuid">
							<div class="flex items-baseline gap-2 min-w-0">
								<router-link
									:to="`/plan/${e.planetId}/${e.planUuid}`"
									:title="`${fullName(e.planetId)} · ${e.planName}`"
									class="truncate min-w-0 text-link-primary hover:underline">
									{{ sideLabel(half.side, e.planetId, e.planName) }}
								</router-link>
								<strong class="ml-auto shrink-0 whitespace-nowrap">
									{{ formatNumber(e.amount) }}
								</strong>
								<span
									class="w-10 shrink-0 whitespace-nowrap text-right text-white/55">
									{{ formatNumber(e.share * 100, 0) }}%
								</span>
							</div>
							<div class="h-0.5 mt-0.5 bg-white/7" aria-hidden="true">
								<div
									class="h-full bg-white/60"
									:style="{ width: `${e.share * 100}%` }" />
							</div>
						</li>
					</ul>
				</section>
			</template>
			<template v-else>
				<section
					v-for="half in net"
					:key="half.key"
					class="@container min-w-0">
					<h4
						class="whitespace-nowrap text-xs font-bold uppercase tracking-wide mb-2">
						{{ half.title }}
						<span class="ml-1 font-normal text-white/55">
							{{
								t(
									"empire.material_io.planet_count",
									half.entries.length
								)
							}}
							·
						</span>
						<PValue class="font-bold" :value="half.total" />
					</h4>
					<p v-if="!half.entries.length" class="text-white/55">
						{{ half.empty }}
					</p>
					<ul
						v-else
						class="io-columns grid grid-flow-col auto-cols-fr gap-x-6 gap-y-2"
						:style="rows(half.entries.length)">
						<li
							v-for="e in half.entries"
							:key="e.planetId"
							:class="{ 'opacity-50': e.balanced }">
							<div class="flex items-baseline gap-2 min-w-0">
								<router-link
									:to="`/plan/${e.planetId}/${e.plans[0].planUuid}`"
									:title="`${fullName(e.planetId)} · ${e.plans.map((p) => p.planName).join(', ')}`"
									class="truncate min-w-0 text-link-primary hover:underline">
									{{ name(e.planetId) }}
								</router-link>
								<PValue
									class="ml-auto shrink-0 whitespace-nowrap font-bold"
									:value="e.net" />
							</div>
							<div
								v-if="e.produces > 0 && e.consumes > 0"
								class="text-xs text-white/55">
								{{
									t("empire.material_io.makes_uses", {
										makes: formatNumber(e.produces),
										uses: formatNumber(e.consumes),
									})
								}}
							</div>
						</li>
					</ul>
				</section>
			</template>
		</div>
	</div>
</template>

<style scoped>
	/* one column top to bottom, two once the half is wide enough */
	.io-columns {
		grid-template-rows: repeat(var(--r1), auto);
	}
	@container (min-width: 26rem) {
		.io-columns {
			grid-template-rows: repeat(var(--r2), auto);
		}
	}
</style>
