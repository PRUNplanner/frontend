<script setup lang="ts">
	/*
		Read-only sourced cost note under a material I/O row's daily cost:
		what the row costs at the plan's sourcing configuration instead of
		the vanilla CX preference price. Pure consumer of the stored
		snapshot, it never computes or writes; the vanilla number above it
		stays untouched.
	*/
	import { computed, ComputedRef } from "vue";
	import { useRoute } from "vue-router";

	// Stores
	import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PTooltip } from "@/ui";

	// Types & Interfaces
	import { IRaukkSnapshot } from "@/features/raukk_sourcing/raukkSourcing.types";

	/** Daily cost difference below which the note is omitted */
	const HIDE_BELOW_DELTA: number = 0.005;

	const props = defineProps({
		planUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		ticker: {
			type: String,
			required: true,
		},
		/** Netted material I/O delta of the row, inputs are negative */
		delta: {
			type: Number,
			required: true,
		},
		/** Vanilla daily cost of the row, signed like the delta */
		vanillaCostPerDay: {
			type: Number,
			required: true,
		},
	});

	const raukkSourcingStore = useRaukkSourcingStore();
	const route = useRoute();

	/**
	 * Plan uuid the note belongs to. Upstream components that already
	 * know it pass it as a property, the others fall back to the plan
	 * views route parameter to keep their diff at a single tag.
	 * @author raukk
	 */
	const localPlanUuid: ComputedRef<string | undefined> = computed(() => {
		if (props.planUuid) return props.planUuid;

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

	/** Effective ȼ/u of this input at the snapshots sourcing config */
	const localUnitPrice: ComputedRef<number | undefined> = computed(() => {
		if (props.delta >= 0) return undefined;

		return localSnapshot.value?.inputPrices?.[props.ticker];
	});

	/** Sourced daily cost, signed like the vanilla one */
	const localCostPerDay: ComputedRef<number | undefined> = computed(() =>
		localUnitPrice.value !== undefined
			? props.delta * localUnitPrice.value
			: undefined
	);

	/** Note only shows when the sourced cost actually differs */
	const localVisible: ComputedRef<boolean> = computed(
		() =>
			localCostPerDay.value !== undefined &&
			Math.abs(localCostPerDay.value - props.vanillaCostPerDay) >=
				HIDE_BELOW_DELTA
	);

	const localIsStale: ComputedRef<boolean> = computed(
		() => localSnapshot.value?.stale === true
	);
</script>

<template>
	<PTooltip v-if="localVisible">
		<template #trigger>
			<div
				class="text-xs hover:cursor-help"
				:class="localIsStale ? 'text-amber-400' : 'text-white/40'">
				{{
					$t("raukk_matio.our_cost", {
						cost: formatNumber(localCostPerDay ?? 0),
					})
				}}
			</div>
		</template>
		{{
			$t("raukk_matio.our_cost_tooltip", {
				price: formatNumber(localUnitPrice ?? 0),
			})
		}}
	</PTooltip>
</template>
