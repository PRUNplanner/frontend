<script setup lang="ts">
	import { computed, ComputedRef } from "vue";
	import { useRoute } from "vue-router";

	// Stores
	import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PTable, PTooltip } from "@/ui";

	// Types & Interfaces
	import { IRaukkSnapshot } from "@/features/raukk_sourcing/raukkSourcing.types";

	/**
	 * Plan wide repair cost, shown per repair cycle and per day. When the
	 * plan holds a sourcing snapshot the repair cost at the sourced
	 * prices is appended as a read only note row, the market priced
	 * numbers above stay untouched.
	 *
	 * @author raukk
	 */
	const props = defineProps<{
		/** Repair cycle length in days */
		repairDay: number;
		/** Plan total repair cost per day */
		totalCostPerDay: number;
		/** Repair material demand per day, keyed by ticker */
		materialUnitsPerDay: Record<string, number>;
	}>();

	const raukkSourcingStore = useRaukkSourcingStore();
	const route = useRoute();

	const costPerPeriod: ComputedRef<number> = computed(
		() => props.totalCostPerDay * props.repairDay
	);

	const materialCount: ComputedRef<number> = computed(
		() => Object.keys(props.materialUnitsPerDay).length
	);

	/** Plan uuid from the plan views route, the tool knows no uuid */
	const localPlanUuid: ComputedRef<string | undefined> = computed(() => {
		const routeUuid: unknown = route?.params?.planUuid;

		return typeof routeUuid === "string" && routeUuid !== ""
			? routeUuid
			: undefined;
	});

	const localSnapshot: ComputedRef<IRaukkSnapshot | undefined> = computed(
		() =>
			localPlanUuid.value
				? raukkSourcingStore.getSnapshot(localPlanUuid.value)
				: undefined
	);

	/** Repair capital cost per day at the snapshots sourced prices */
	const localSourcedPerDay: ComputedRef<number | undefined> = computed(() => {
		const snapshot: IRaukkSnapshot | undefined = localSnapshot.value;

		if (!snapshot) return undefined;

		return Object.values(snapshot.outputs).reduce(
			(sum, output) => sum + output.breakdown.repair * output.unitsPerDay,
			0
		);
	});

	/** Repair cycle the snapshot was computed with */
	const localSourcedDay: ComputedRef<number | undefined> = computed(
		() => localSnapshot.value?.config?.repairDay
	);

	const localIsStale: ComputedRef<boolean> = computed(
		() => localSnapshot.value?.stale === true
	);
</script>

<template>
	<h3 class="font-bold pb-3">
		{{ $t("raukk_repair.totals.title") }}
	</h3>
	<PTable striped>
		<tbody>
			<tr>
				<td>{{ $t("raukk_repair.totals.cycle") }}</td>
				<td class="text-end">
					{{
						$t("raukk_repair.totals.cycle_value", {
							days: repairDay,
						})
					}}
				</td>
			</tr>
			<tr>
				<td>{{ $t("raukk_repair.totals.per_period") }}</td>
				<td class="text-end">
					{{ formatNumber(costPerPeriod) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
			</tr>
			<tr>
				<td>{{ $t("raukk_repair.totals.per_day") }}</td>
				<td class="text-end">
					{{ formatNumber(totalCostPerDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
			</tr>
			<tr>
				<td>{{ $t("raukk_repair.totals.materials") }}</td>
				<td class="text-end">
					{{ materialCount }}
				</td>
			</tr>
			<tr v-if="localSourcedPerDay !== undefined">
				<td>
					<PTooltip>
						<template #trigger>
							<span
								class="hover:cursor-help"
								:class="
									localIsStale
										? 'text-amber-400'
										: 'text-white/50'
								">
								{{
									$t("raukk_repair.totals.sourced", {
										days: localSourcedDay ?? "—",
									})
								}}
							</span>
						</template>
						{{ $t("raukk_repair.totals.sourced_tooltip") }}
					</PTooltip>
				</td>
				<td
					class="text-end"
					:class="localIsStale ? 'text-amber-400' : 'text-white/50'">
					{{ formatNumber(localSourcedPerDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
