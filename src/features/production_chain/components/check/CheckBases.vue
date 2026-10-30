<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import ChainRecipeText from "@/features/production_chain/components/ChainRecipeText.vue";
	import CheckFinding from "@/features/production_chain/components/check/CheckFinding.vue";

	// Engine
	import { workforceRecord } from "@/features/production_chain/engine/chainSolver";

	// Util
	import {
		money,
		programName,
		signedMoney,
	} from "@/features/production_chain/chainCheck.util";
	import {
		expertKey,
		expertsText,
		formatQty,
		formatShare,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

	// Types & Interfaces
	import type { ExpertType } from "@/features/api/schemas/planningData.schemas";
	import type {
		CheckVerdict,
		ICheckBase,
		ICheckFinding,
		ICheckResult,
		ICheckStep,
	} from "@/features/production_chain/engine/chainCheck.types";

	// UI
	import { PTable, PTag } from "@/ui";

	const { result, nameOf, payback } = defineProps<{
		result: ICheckResult;
		nameOf: (id: string) => string;
		payback: number;
	}>();

	const emit = defineEmits<{
		(e: "try", f: ICheckFinding): void;
		(e: "planets", f: ICheckFinding): void;
		(e: "reset", f: ICheckFinding): void;
		(e: "open", id: string): void;
		(e: "open-plan"): void;
	}>();

	const ORDER: CheckVerdict[] = ["fix", "imp", "ok", "out"];
	const open = ref(new Set<string>());

	const rows = computed(() =>
		[...result.bases].sort(
			(a, b) =>
				ORDER.indexOf(a.verdict) - ORDER.indexOf(b.verdict) ||
				b.gain - a.gain ||
				a.id.localeCompare(b.id)
		)
	);

	function toggle(id: string): void {
		const next = new Set(open.value);
		if (next.has(id)) next.delete(id);
		else {
			next.add(id);
			emit("open", id);
		}
		open.value = next;
	}

	const expertName = (type: ExpertType) => t(expertKey(type));
	const experts = (e: Partial<Record<ExpertType, number>>) =>
		expertsText(e, expertName) || t("production_chains.check.bases.none");

	function verdict(b: ICheckBase): {
		label: string;
		type: "success" | "warning" | "error" | "secondary";
	} {
		const n = b.findings.length;
		switch (b.verdict) {
			case "ok":
				return {
					label: t("production_chains.check.verdict.ok"),
					type: "success",
				};
			case "imp":
				return {
					label: t("production_chains.check.verdict.imp", n),
					type: "warning",
				};
			case "fix":
				return {
					label: t("production_chains.check.verdict.fix", n),
					type: "error",
				};
			default:
				return {
					label: t("production_chains.check.verdict.out"),
					type: "secondary",
				};
		}
	}

	function efficiency(b: ICheckBase): string {
		const { min, max } = b.efficiency;
		return Math.abs(max - min) < 0.005
			? formatShare(max)
			: `${formatShare(min)}–${formatShare(max)}`;
	}

	const factors = (s: ICheckStep) =>
		s.elements
			.map(
				(e) =>
					`${t(`production_chains.check.factor.${e.efficiencyType}`)} ${formatNumber(e.value * 100, 0)}`
			)
			.join(" × ");

	const findings = (b: ICheckBase) => b.findings;
</script>

<template>
	<div class="overflow-x-auto" data-testid="check-bases">
		<PTable>
			<thead>
				<tr>
					<th>{{ $t("production_chains.check.bases.base") }}</th>
					<th class="hidden md:table-cell">
						{{ $t("production_chains.check.bases.in_chains") }}
					</th>
					<th class="numeric hidden sm:table-cell">
						{{ $t("production_chains.check.bases.buildings") }}
					</th>
					<th class="numeric hidden sm:table-cell">
						{{ $t("production_chains.check.bases.efficiency") }}
					</th>
					<th class="numeric hidden md:table-cell">
						{{ $t("production_chains.check.bases.profit") }}
					</th>
					<th>{{ $t("production_chains.check.bases.check") }}</th>
					<th class="numeric hidden sm:table-cell">
						{{ $t("production_chains.check.bases.possible") }}
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="b in rows" :key="b.id">
					<tr :data-testid="`check-base-${b.id}`">
						<td>
							<button
								type="button"
								class="flex items-start gap-2 text-left cursor-pointer min-h-6"
								:aria-expanded="open.has(b.id)"
								:aria-label="
									t('production_chains.check.bases.details', {
										name: b.plan.name,
									})
								"
								:data-testid="`check-base-toggle-${b.id}`"
								@click="toggle(b.id)">
								<span class="text-muted" aria-hidden="true">{{
									open.has(b.id) ? "▾" : "▸"
								}}</span>
								<span
									class="px-1.5 rounded-control border border-line font-mono font-bold">
									{{ b.id }}
								</span>
								<span class="min-w-0">
									<span class="block font-bold">{{
										b.plan.name
									}}</span>
									<span class="block text-xs text-muted">
										{{
											b.planet
												? planetDisplayName(
														b.planet
															.planet_natural_id,
														b.planet.planet_name
													)
												: b.plan.planetId
										}}
										<template v-if="b.running !== '---'">
											·
											{{
												$t(
													"production_chains.check.bases.runs",
													{
														program: programName(
															t,
															b.running
														),
													}
												)
											}}
										</template>
									</span>
								</span>
							</button>
						</td>
						<td class="hidden md:table-cell">
							<span
								v-if="b.targets.length"
								class="flex flex-wrap gap-1">
								<MaterialTile
									v-for="x in b.targets"
									:key="x"
									:ticker="x" />
							</span>
							<span v-else class="text-muted">—</span>
						</td>
						<td class="numeric hidden sm:table-cell">
							{{ b.buildings }}
						</td>
						<td
							class="numeric hidden sm:table-cell whitespace-nowrap">
							<span class="block">{{ efficiency(b) }}</span>
							<span class="block text-xs text-muted">{{
								$t(`production_chains.check.lux.${b.lux}`)
							}}</span>
						</td>
						<td class="numeric hidden md:table-cell">
							{{ money(t, b.plan.profit) }}
						</td>
						<td>
							<PTag size="sm" :type="verdict(b).type">{{
								verdict(b).label
							}}</PTag>
							<span
								v-if="b.gain"
								class="block sm:hidden text-xs tabular-nums"
								:class="
									b.gain >= 0
										? 'text-positive'
										: 'text-negative'
								">
								{{ signedMoney(t, b.gain) }}
							</span>
						</td>
						<td
							class="numeric hidden sm:table-cell"
							:class="
								b.gain > 0
									? 'text-positive'
									: b.gain < 0
										? 'text-negative'
										: 'text-muted'
							">
							{{ b.gain ? signedMoney(t, b.gain) : "—" }}
						</td>
					</tr>
					<tr
						v-if="open.has(b.id)"
						:data-testid="`check-base-details-${b.id}`">
						<td colspan="7" class="!whitespace-normal">
							<div
								class="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2 min-w-0">
								<div class="flex flex-col gap-3 min-w-0">
									<div>
										<h4
											class="text-xs uppercase text-muted pb-1">
											{{
												$t(
													"production_chains.check.bases.as_planned"
												)
											}}
										</h4>
										<ul class="flex flex-col gap-2">
											<li
												v-for="s in b.steps"
												:key="s.key"
												class="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-2 items-baseline">
												<span
													class="font-mono font-bold"
													>{{ s.building }}</span
												>
												<span class="min-w-0">
													<span class="block">
														×
														{{
															formatQty(
																s.buildings
															)
														}}
														<ChainRecipeText
															v-if="!s.extraction"
															:recipe="s.recipe"
															:ticker="
																s.ticker
															" />
														<template v-else>{{
															$t(
																"production_chains.check.chains_view.extract",
																{
																	ticker: s.ticker,
																}
															)
														}}</template>
													</span>
													<span
														class="block text-xs text-muted truncate"
														:title="factors(s)"
														>{{ factors(s) }}</span
													>
												</span>
												<span
													class="text-right tabular-nums">
													<span class="block">{{
														formatShare(
															s.efficiency
														)
													}}</span>
													<span
														class="block text-xs text-muted">
														{{
															formatQty(s.perDay)
														}}
														{{ s.ticker }}
													</span>
												</span>
											</li>
										</ul>
									</div>
									<table class="text-sm">
										<thead>
											<tr
												class="text-xs uppercase text-muted">
												<th
													class="text-left font-normal" />
												<th
													class="text-left font-normal">
													{{
														$t(
															"production_chains.check.bases.plan"
														)
													}}
												</th>
												<th
													class="text-left font-normal">
													{{
														$t(
															"production_chains.check.bases.chain_default"
														)
													}}
												</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<th
													class="text-left font-normal text-muted pr-3">
													{{
														$t(
															"production_chains.check.bases.luxuries"
														)
													}}
												</th>
												<td class="pr-3">
													{{
														$t(
															`production_chains.check.lux.${b.lux}`
														)
													}}
													·
													{{
														formatShare(
															workforceRecord(
																b.lux
															).pioneer.efficiency
														)
													}}
												</td>
												<td>
													{{
														$t(
															"production_chains.check.lux.both"
														)
													}}
													·
													{{ formatShare(1) }}
												</td>
											</tr>
											<tr>
												<th
													class="text-left font-normal text-muted pr-3">
													{{
														$t(
															"production_chains.check.bases.experts"
														)
													}}
												</th>
												<td class="pr-3">
													{{ experts(b.experts) }}
												</td>
												<td>
													{{ experts(b.bestExperts) }}
												</td>
											</tr>
											<tr>
												<th
													class="text-left font-normal text-muted pr-3">
													{{
														$t(
															"production_chains.check.bases.cogc"
														)
													}}
												</th>
												<td class="pr-3">
													{{
														b.plan.cogc === "---"
															? $t(
																	"production_chains.check.bases.none"
																)
															: programName(
																	t,
																	b.plan.cogc
																)
													}}
												</td>
												<td>
													{{
														b.running === "---"
															? $t(
																	"production_chains.check.bases.none_running"
																)
															: $t(
																	"production_chains.check.bases.running",
																	{
																		program:
																			programName(
																				t,
																				b.running
																			),
																	}
																)
													}}
												</td>
											</tr>
										</tbody>
									</table>
								</div>
								<div class="flex flex-col gap-2 min-w-0">
									<h4 class="text-xs uppercase text-muted">
										{{
											$t(
												"production_chains.check.bases.findings"
											)
										}}
									</h4>
									<CheckFinding
										v-for="f in findings(b)"
										:key="f.id"
										:finding="f"
										:base="b"
										:name-of="nameOf"
										:payback="payback"
										@try="emit('try', f)"
										@planets="emit('planets', f)"
										@reset="emit('reset', f)"
										@open-plan="emit('open-plan')" />
									<p
										v-if="!findings(b).length"
										class="text-sm text-muted">
										{{
											b.checked
												? $t(
														"production_chains.check.bases.no_findings"
													)
												: $t(
														"production_chains.check.verdict.out"
													)
										}}
									</p>
								</div>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</PTable>
	</div>
</template>
