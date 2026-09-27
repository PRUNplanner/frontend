<script setup lang="ts">
	import type { PropType } from "vue";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { PopulationReport } from "@/features/api/schemas/gameData.schemas";
	import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PTable, PIcon } from "@/ui";
	import { CheckSharp, ClearSharp } from "@vicons/material";

	defineProps({
		planetNaturalId: {
			type: String,
			required: true,
		},
		poprData: {
			type: Object as PropType<PopulationReport>,
			required: false,
			default: undefined,
		},
		workforceData: {
			type: Object as PropType<IWorkforceRecord>,
			required: false,
			default: undefined,
		},
	});

	function assessPlanWorkforce(
		free: number,
		unfilled: number,
		plan: number
	): boolean {
		if (plan == 0) {
			return true;
		}

		if (free - unfilled >= plan) {
			return true;
		} else {
			return false;
		}
	}
</script>

<template>
	<div v-if="!poprData" class="text-center">
		{{
			$t("government.popr_button.no_data", { planet_id: planetNaturalId })
		}}
	</div>

	<PTable v-if="poprData" striped>
		<thead>
			<tr>
				<th></th>
				<th>{{ $t("game.workforce_type.pioneer") }}</th>
				<th>{{ $t("game.workforce_type.settler") }}</th>
				<th>{{ $t("game.workforce_type.technician") }}</th>
				<th>{{ $t("game.workforce_type.engineer") }}</th>
				<th>{{ $t("game.workforce_type.scientist") }}</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="font-bold">
					{{ $t("government.popr_button.table.total_population") }}
				</td>
				<td>{{ formatAmount(poprData.next_population_pioneer) }}</td>
				<td>{{ formatAmount(poprData.next_population_settler) }}</td>
				<td>{{ formatAmount(poprData.next_population_technician) }}</td>
				<td>{{ formatAmount(poprData.next_population_engineer) }}</td>
				<td>{{ formatAmount(poprData.next_population_scientist) }}</td>
			</tr>
			<tr>
				<td class="font-bold">
					{{ $t("government.popr_button.table.free_population") }}
				</td>
				<td>{{ formatAmount(poprData.free_pioneer) }}</td>
				<td>{{ formatAmount(poprData.free_settler) }}</td>
				<td>{{ formatAmount(poprData.free_technician) }}</td>
				<td>{{ formatAmount(poprData.free_engineer) }}</td>
				<td>{{ formatAmount(poprData.free_scientist) }}</td>
			</tr>
			<tr>
				<td class="font-bold">
					{{ $t("government.popr_button.table.free_population_pct") }}
				</td>
				<td>
					{{ formatNumber(poprData.unemployment_rate_pioneer * 100) }}
				</td>
				<td>
					{{ formatNumber(poprData.unemployment_rate_settler * 100) }}
				</td>
				<td>
					{{
						formatNumber(
							poprData.unemployment_rate_technician * 100
						)
					}}
				</td>
				<td>
					{{
						formatNumber(poprData.unemployment_rate_engineer * 100)
					}}
				</td>
				<td>
					{{
						formatNumber(poprData.unemployment_rate_scientist * 100)
					}}
				</td>
			</tr>
			<tr>
				<td class="font-bold">
					{{ $t("government.popr_button.table.unfilled_jobs") }}
				</td>
				<td>{{ formatAmount(poprData.open_jobs_pioneer) }}</td>
				<td>{{ formatAmount(poprData.open_jobs_settler) }}</td>
				<td>{{ formatAmount(poprData.open_jobs_technician) }}</td>
				<td>{{ formatAmount(poprData.open_jobs_engineer) }}</td>
				<td>{{ formatAmount(poprData.open_jobs_scientist) }}</td>
			</tr>
			<template v-if="workforceData">
				<tr class="child:border-t-2! child:border-t-white/20!">
					<td class="font-bold">
						{{ $t("government.popr_button.table.plan_need") }}
					</td>
					<td>{{ formatAmount(workforceData.pioneer.required) }}</td>
					<td>{{ formatAmount(workforceData.settler.required) }}</td>
					<td>
						{{ formatAmount(workforceData.technician.required) }}
					</td>
					<td>{{ formatAmount(workforceData.engineer.required) }}</td>
					<td>
						{{ formatAmount(workforceData.scientist.required) }}
					</td>
				</tr>
				<tr>
					<td class="font-bold">
						{{ $t("government.popr_button.table.plan_check") }}
					</td>
					<td>
						<PIcon>
							<component
								:is="
									assessPlanWorkforce(
										poprData.free_pioneer,
										poprData.open_jobs_pioneer,
										workforceData.pioneer.required
									)
										? CheckSharp
										: ClearSharp
								"
								:class="
									assessPlanWorkforce(
										poprData.free_pioneer,
										poprData.open_jobs_pioneer,
										workforceData.pioneer.required
									)
										? 'text-positive'
										: 'text-negative'
								" />
						</PIcon>
					</td>
					<td>
						<PIcon>
							<component
								:is="
									assessPlanWorkforce(
										poprData.free_settler,
										poprData.open_jobs_settler,
										workforceData.settler.required
									)
										? CheckSharp
										: ClearSharp
								"
								:class="
									assessPlanWorkforce(
										poprData.free_settler,
										poprData.open_jobs_settler,
										workforceData.settler.required
									)
										? 'text-positive'
										: 'text-negative'
								" />
						</PIcon>
					</td>
					<td>
						<PIcon>
							<component
								:is="
									assessPlanWorkforce(
										poprData.free_technician,
										poprData.open_jobs_technician,
										workforceData.technician.required
									)
										? CheckSharp
										: ClearSharp
								"
								:class="
									assessPlanWorkforce(
										poprData.free_technician,
										poprData.open_jobs_technician,
										workforceData.technician.required
									)
										? 'text-positive'
										: 'text-negative'
								" />
						</PIcon>
					</td>
					<td>
						<PIcon>
							<component
								:is="
									assessPlanWorkforce(
										poprData.free_engineer,
										poprData.open_jobs_engineer,
										workforceData.engineer.required
									)
										? CheckSharp
										: ClearSharp
								"
								:class="
									assessPlanWorkforce(
										poprData.free_engineer,
										poprData.open_jobs_engineer,
										workforceData.engineer.required
									)
										? 'text-positive'
										: 'text-negative'
								" />
						</PIcon>
					</td>
					<td>
						<PIcon>
							<component
								:is="
									assessPlanWorkforce(
										poprData.free_scientist,
										poprData.open_jobs_scientist,
										workforceData.scientist.required
									)
										? CheckSharp
										: ClearSharp
								"
								:class="
									assessPlanWorkforce(
										poprData.free_scientist,
										poprData.open_jobs_scientist,
										workforceData.scientist.required
									)
										? 'text-positive'
										: 'text-negative'
								" />
						</PIcon>
					</td>
				</tr>
			</template>
		</tbody>
	</PTable>
</template>
