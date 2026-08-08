<script setup lang="ts">
	/*
		Read-only sourcing annotation for a single material I/O row: where
		an input is covered upstream, and how much of an output other
		plans already draw. Pure consumer of the stored sourcing state, it
		never computes or writes.
	*/
	import { computed, ComputedRef } from "vue";
	import { useRoute } from "vue-router";

	// Stores
	import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { isAggregateSource } from "@/features/raukk_sourcing/raukkSourcingPricing";

	// UI
	import { PTooltip } from "@/ui";

	// Types & Interfaces
	import {
		IRaukkSnapshot,
		IRaukkTickerSource,
	} from "@/features/raukk_sourcing/raukkSourcing.types";
	import { IRaukkSubscription } from "@/features/raukk_sourcing/raukkSourcingStore.types";

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
		/** Netted material I/O delta of the row, its sign picks the side */
		delta: {
			type: Number,
			required: true,
		},
	});

	const raukkSourcingStore = useRaukkSourcingStore();
	const route = useRoute();

	/**
	 * Plan uuid the annotation belongs to. Upstream components that
	 * already know it pass it as a property, the others fall back to the
	 * plan views route parameter to keep their diff at a single tag.
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

	/**
	 * Configured source of this row's ticker. The snapshots own copy of
	 * the configuration wins, it is what the stored numbers were computed
	 * with; without a snapshot the live configuration is shown.
	 * @author raukk
	 */
	const localSource: ComputedRef<IRaukkTickerSource | undefined> = computed(
		() => {
			if (!localPlanUuid.value) return undefined;

			return (
				localSnapshot.value?.config?.sources[props.ticker] ??
				raukkSourcingStore.getConfig(localPlanUuid.value).sources[
					props.ticker
				]
			);
		}
	);

	/**
	 * Label of the upstream source, undefined when the row is bought at
	 * market. Aggregates carry their producer count instead of a name,
	 * an aggregate without any producer prices at market and stays
	 * unannotated.
	 * @author raukk
	 */
	const localSourceLabel: ComputedRef<string | undefined> = computed(() => {
		const source: IRaukkTickerSource | undefined = localSource.value;

		if (props.delta >= 0 || source === undefined || source.mode !== "plan")
			return undefined;

		if (!isAggregateSource(source.sourcePlanUuid))
			return (
				raukkSourcingStore.getSnapshot(source.sourcePlanUuid)
					?.planName ?? source.sourcePlanUuid
			);

		const count: number = raukkSourcingStore
			.producersOf(props.ticker)
			.filter(
				(producer) => producer.planUuid !== localPlanUuid.value
			).length;

		return count > 0 ? `${count}` : undefined;
	});

	/** Draws other plans hold against this row's output */
	const localSubscription: ComputedRef<IRaukkSubscription | undefined> =
		computed(() => {
			if (props.delta <= 0 || !localPlanUuid.value) return undefined;

			const subscription: IRaukkSubscription =
				raukkSourcingStore.subscription(
					localPlanUuid.value,
					props.ticker
				);

			return subscription.totalDrawnPerDay > 0 ? subscription : undefined;
		});

	const localIsAggregate: ComputedRef<boolean> = computed(
		() =>
			localSource.value?.mode === "plan" &&
			isAggregateSource(localSource.value.sourcePlanUuid)
	);

	const localOversubscribed: ComputedRef<boolean> = computed(
		() => (localSubscription.value?.pctOfOutput ?? 0) > 1
	);
</script>

<template>
	<PTooltip v-if="localSourceLabel">
		<template #trigger>
			<span class="pl-1 text-xs text-white/40 hover:cursor-help">
				{{
					localIsAggregate
						? $t("raukk_matio.sourced_aggregate", {
								count: localSourceLabel,
							})
						: $t("raukk_matio.sourced", { plan: localSourceLabel })
				}}
			</span>
		</template>
		{{ $t("raukk_matio.sourced_tooltip") }}
	</PTooltip>
	<PTooltip v-else-if="localSubscription">
		<template #trigger>
			<span
				class="pl-1 text-xs hover:cursor-help"
				:class="
					localOversubscribed ? 'text-negative' : 'text-white/40'
				">
				{{
					$t("raukk_matio.subscribed", {
						units: formatNumber(localSubscription.totalDrawnPerDay),
						percent: formatNumber(
							localSubscription.pctOfOutput * 100
						),
					})
				}}
			</span>
		</template>
		{{ $t("raukk_matio.subscribed_tooltip") }}
	</PTooltip>
</template>
