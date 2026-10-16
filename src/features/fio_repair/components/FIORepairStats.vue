<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		FIORepairStatus,
		IFIORepairBase,
	} from "@/features/fio_repair/fioRepair.types";

	/**
	 * Counts of overdue, due soon and later bases (each sets the list
	 * filter), and what repairing the due bases costs today and per day
	 * of waiting
	 *
	 * @author jplacht
	 */
	const { bases, dueSoon } = defineProps<{
		bases: IFIORepairBase[];
		dueSoon: number;
	}>();

	const emit = defineEmits<{
		(e: "filter", filter: "overdue" | "soon" | "later"): void;
	}>();

	const isOverdue = (s: FIORepairStatus) =>
		s === "overdue" || s === "unknown";

	const counts = computed(() => ({
		overdue: bases.filter((b) => isOverdue(b.status)).length,
		soon: bases.filter((b) => b.status === "soon").length,
		later: bases.filter((b) => b.status === "later").length,
	}));

	const due = computed(() =>
		bases
			.filter((b) => b.status !== "later")
			.reduce(
				(sum, b) => ({
					cost: sum.cost + b.bill.cost,
					weight: sum.weight + b.bill.weight,
					volume: sum.volume + b.bill.volume,
					waiting: sum.waiting + b.waiting,
					n: sum.n + 1,
				}),
				{ cost: 0, weight: 0, volume: 0, waiting: 0, n: 0 }
			)
	);

	const COUNTS = [
		{ key: "overdue", color: "text-negative" },
		{ key: "soon", color: "text-warning" },
		{ key: "later", color: "text-ink-strong" },
	] as const;

	const label = "text-xs font-medium uppercase tracking-wide text-muted";
</script>

<template>
	<div
		class="flex flex-wrap justify-between gap-x-6 border-y border-line"
		data-testid="fio-repair-stats">
		<div class="flex flex-wrap">
			<button
				v-for="(c, i) in COUNTS"
				:key="c.key"
				type="button"
				class="grid gap-0.5 min-w-30 min-h-11 py-2.5 text-start hover:bg-white/5"
				:class="i === 0 ? 'pe-5' : 'px-5 border-s border-line'"
				:data-testid="`fio-repair-stat-${c.key}`"
				@click="emit('filter', c.key)">
				<span :class="label">
					{{ $t(`fio.repair.stats.${c.key}`, { n: dueSoon }) }}
				</span>
				<span
					class="text-2xl font-medium tabular-nums"
					:class="counts[c.key] ? c.color : 'text-ink-strong'">
					{{ counts[c.key] }}
					<span class="text-sm font-normal text-muted">
						{{ $t("fio.repair.stats.bases", counts[c.key]) }}
					</span>
				</span>
			</button>
		</div>
		<div class="flex flex-wrap">
			<div class="grid gap-0.5 justify-items-end py-2.5 px-5 text-end">
				<span :class="label">{{
					$t("fio.repair.stats.due_cost")
				}}</span>
				<span
					class="text-2xl font-medium tabular-nums text-ink-strong"
					data-testid="fio-repair-due-cost">
					{{ formatNumber(due.cost, 0) }} ȼ
				</span>
				<span class="text-xs text-muted tabular-nums">
					{{
						$t(
							"fio.repair.stats.due_cargo",
							{
								weight: formatNumber(due.weight, 0),
								volume: formatNumber(due.volume, 0),
								n: due.n,
							},
							due.n
						)
					}}
				</span>
			</div>
			<div
				class="grid gap-0.5 justify-items-end py-2.5 ps-5 border-s border-line text-end">
				<span :class="label">{{ $t("fio.repair.stats.waiting") }}</span>
				<span
					class="text-2xl font-medium tabular-nums"
					:class="
						due.waiting > 0 ? 'text-warning' : 'text-ink-strong'
					"
					data-testid="fio-repair-waiting">
					{{
						$t("fio.repair.stats.waiting_value", {
							cost: formatNumber(due.waiting, 0),
						})
					}}
				</span>
				<span class="text-xs text-muted">
					{{ $t("fio.repair.stats.waiting_note") }}
				</span>
			</div>
		</div>
	</div>
</template>
