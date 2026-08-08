<script setup lang="ts">
	/*
		Read-only companion strip for any "ȼ/day" cost display: shows what
		that cost bucket amounts to per unit of each of the plans outputs.
		Pure consumer of the stored snapshot, it never computes or writes.
	*/
	import { computed, ComputedRef, PropType } from "vue";
	import { useRoute } from "vue-router";

	// Stores
	import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { formatDate } from "@/util/date";

	// Types & Interfaces
	import {
		IRaukkOutputCost,
		IRaukkSnapshot,
	} from "@/features/raukk_sourcing/raukkSourcing.types";

	/** Displayed cost bucket, "total" being the full break-even cost */
	type RAUKK_STRIP_BUCKET = "workforce" | "repair" | "inputs" | "total";

	interface IRaukkStripEntry {
		ticker: string;
		value: number;
		cssClass: string;
	}

	// UI
	import { PTooltip } from "@/ui";

	const props = defineProps({
		planUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		bucket: {
			type: String as PropType<RAUKK_STRIP_BUCKET>,
			required: true,
		},
	});

	const raukkSourcingStore = useRaukkSourcingStore();
	const { getMaterialClass } = useMaterialData();
	const route = useRoute();

	/**
	 * Plan uuid the strip displays. Upstream components that already know
	 * it pass it as a property, the others fall back to the plan views
	 * route parameter to keep their diff at a single component tag.
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
	 * Materials category css class, materials that aren't loaded yet
	 * simply stay unstyled instead of breaking the strip.
	 * @author raukk
	 *
	 * @param {string} ticker Material Ticker
	 * @returns {string} Css Class
	 */
	function materialClass(ticker: string): string {
		try {
			return getMaterialClass(ticker);
		} catch {
			return "";
		}
	}

	const localEntries: ComputedRef<IRaukkStripEntry[]> = computed(() => {
		const snapshot: IRaukkSnapshot | undefined = localSnapshot.value;

		if (!snapshot) return [];

		return Object.values(snapshot.outputs)
			.map((output: IRaukkOutputCost) => ({
				ticker: output.ticker,
				value:
					props.bucket === "total"
						? output.costPerUnit
						: output.breakdown[props.bucket],
				cssClass: materialClass(output.ticker),
			}))
			.sort((a, b) => a.ticker.localeCompare(b.ticker));
	});

	/**
	 * Daily total of the bucket at the snapshots sourced prices, the
	 * counterpart of the vanilla "ȼ/day" number the strip sits under.
	 * @author raukk
	 */
	const localDailyTotal: ComputedRef<number> = computed(() => {
		const snapshot: IRaukkSnapshot | undefined = localSnapshot.value;

		if (!snapshot) return 0;

		return Object.values(snapshot.outputs).reduce(
			(sum, output: IRaukkOutputCost) =>
				sum +
				(props.bucket === "total"
					? output.costPerUnit
					: output.breakdown[props.bucket]) *
					output.unitsPerDay,
			0
		);
	});

	const localIsStale: ComputedRef<boolean> = computed(
		() => localSnapshot.value?.stale === true
	);

	const localComputedAt: ComputedRef<string> = computed(() =>
		localSnapshot.value
			? formatDate(
					new Date(localSnapshot.value.computedAt),
					"YYYY-MM-DD HH:mm"
				)
			: "—"
	);
</script>

<template>
	<div v-if="localPlanUuid" class="pt-2 text-xs text-white/50">
		<div
			v-if="localEntries.length > 0"
			class="flex flex-row flex-wrap items-center gap-x-3 gap-y-1">
			<span>{{ $t(`raukk_strips.bucket.${bucket}`) }}</span>
			<span
				v-for="entry in localEntries"
				:key="`RAUKKSTRIP#${bucket}#${entry.ticker}`"
				class="flex flex-row items-center gap-x-1">
				<span
					class="px-1 rounded-[2px] font-bold"
					:class="entry.cssClass">
					{{ entry.ticker }}
				</span>
				<span
					:class="localIsStale ? 'text-amber-400' : 'text-white/70'">
					{{ formatNumber(entry.value) }}
					<span class="font-light text-white/40">
						{{ $t("raukk_strips.per_unit") }}
					</span>
				</span>
			</span>
			<span :class="localIsStale ? 'text-amber-400' : 'text-white/70'">
				{{
					$t("raukk_strips.daily_total", {
						total: formatNumber(localDailyTotal),
					})
				}}
			</span>
			<PTooltip v-if="localIsStale">
				<template #trigger>
					<span class="text-amber-400 hover:cursor-help">
						{{ $t("raukk_strips.stale.tag") }}
					</span>
				</template>
				{{
					$t("raukk_strips.stale.tooltip", {
						computedAt: localComputedAt,
					})
				}}
			</PTooltip>
		</div>
		<div v-else-if="!localSnapshot">
			{{ $t("raukk_strips.empty") }}
		</div>
	</div>
</template>
