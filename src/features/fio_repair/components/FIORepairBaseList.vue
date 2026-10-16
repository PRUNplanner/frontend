<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();

	// Components
	import FIORepairDueTag from "@/features/fio_repair/components/FIORepairDueTag.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		FIORepairFilter,
		FIORepairStatus,
		IFIORepairBase,
	} from "@/features/fio_repair/fioRepair.types";

	// UI
	import { PButton, PButtonGroup } from "@/ui";

	/**
	 * Every base with its buildings, lowest condition, days since repair,
	 * next repair and today's bill; most urgent first. Clicking a row
	 * selects the base.
	 *
	 * @author jplacht
	 */
	const { bases, selected, interval, usePlans } = defineProps<{
		bases: IFIORepairBase[];
		selected: string | undefined;
		interval: number;
		usePlans: boolean;
	}>();

	const filter = defineModel<FIORepairFilter>("filter", { required: true });

	const emit = defineEmits<{
		(e: "select", planet: string): void;
	}>();

	const inFilter = (status: FIORepairStatus, f: FIORepairFilter) =>
		f === "all" ||
		(f === "overdue"
			? status === "overdue" || status === "unknown"
			: status === f);

	const filters = computed(() =>
		(["all", "overdue", "soon", "later"] as const).map((f) => ({
			key: f,
			n: bases.filter((b) => inFilter(b.status, f)).length,
		}))
	);

	const rows = computed(() =>
		bases.filter((b) => inFilter(b.status, filter.value))
	);

	function planText(base: IFIORepairBase): string {
		const { candidate, confidence } = base.match;
		if (!usePlans || !candidate)
			return t("fio.repair.list.plan.none", { n: interval });
		return t(`fio.repair.list.plan.${confidence}`, {
			name: candidate.plan.plan_name,
		});
	}

	function planClass(base: IFIORepairBase): string {
		const { candidate, confidence } = base.match;
		if (!usePlans || !candidate) return "text-muted";
		if (confidence === "likely") return "text-warning";
		return confidence === "picked" ? "text-link" : "text-muted-strong";
	}

	const TYPE_CLASS: Record<FIORepairStatus, string> = {
		overdue: "text-negative font-medium",
		unknown: "text-negative font-medium",
		soon: "text-warning font-medium",
		later: "text-muted",
	};

	function sinceText(base: IFIORepairBase): string {
		if (base.since === null) return t("fio.repair.list.no_date");
		return base.wasRepaired
			? t("fio.repair.list.since", { n: base.since })
			: t("fio.repair.list.built", { n: base.since });
	}

	function dueText(status: FIORepairStatus, due: number | null): string {
		const key = status === "soon" && due === 0 ? "today" : status;
		return t(`fio.repair.due.${key}`, { n: Math.abs(due ?? 0) });
	}

	const GRID =
		"grid grid-cols-[minmax(150px,1fr)_minmax(150px,1.1fr)_104px_84px_124px_124px] items-center";
</script>

<template>
	<section
		:aria-label="$t('fio.repair.list.title')"
		class="bg-surface border border-line rounded-panel overflow-hidden"
		data-testid="fio-repair-list">
		<div
			class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 border-b border-line">
			<h2 class="text-base font-bold text-ink-strong">
				{{ $t("fio.repair.list.title") }}
				<span class="text-xs font-normal text-muted">
					· {{ $t("fio.repair.list.hint") }}
				</span>
			</h2>
			<PButtonGroup
				role="group"
				:aria-label="$t('fio.repair.list.filter')">
				<PButton
					v-for="f in filters"
					:key="f.key"
					size="sm"
					:pressed="filter === f.key"
					:data-testid="`fio-repair-filter-${f.key}`"
					@click="filter = f.key">
					{{ $t(`fio.repair.list.filters.${f.key}`) }}
					<span class="opacity-70 tabular-nums">{{ f.n }}</span>
				</PButton>
			</PButtonGroup>
		</div>
		<div class="overflow-x-auto">
			<div class="min-w-[760px]">
				<div
					:class="GRID"
					class="h-8 ps-3 border-b border-line text-xs text-muted">
					<span>{{ $t("fio.repair.list.columns.base") }}</span>
					<span>{{ $t("fio.repair.list.columns.buildings") }}</span>
					<span>{{ $t("fio.repair.list.columns.condition") }}</span>
					<span>{{ $t("fio.repair.list.columns.since") }}</span>
					<span>{{ $t("fio.repair.list.columns.next") }} ↑</span>
					<span class="text-end pe-3">
						{{ $t("fio.repair.list.columns.cost") }}
					</span>
				</div>
				<button
					v-for="base in rows"
					:key="base.planet"
					type="button"
					:class="[
						GRID,
						base.planet === selected
							? 'bg-selected shadow-[inset_3px_0_0_var(--color-link)]'
							: 'hover:bg-hover',
					]"
					class="w-full min-h-12 ps-3 border-b border-line text-start"
					:aria-pressed="base.planet === selected"
					data-testid="fio-repair-row"
					@click="emit('select', base.planet)">
					<span class="grid gap-px py-1.5 pe-2 min-w-0">
						<span class="truncate">
							<b class="font-medium text-ink-strong">{{
								base.name
							}}</b>
							<span class="text-xs text-muted">
								{{
									base.planet !== base.name
										? ` ${base.planet}`
										: ""
								}}
							</span>
						</span>
						<span
							class="text-xs truncate"
							:class="planClass(base)"
							data-testid="fio-repair-row-plan">
							{{ planText(base) }}
						</span>
					</span>
					<span
						class="text-xs leading-[18px] pe-2.5 min-w-0 tabular-nums"
						data-testid="fio-repair-row-buildings">
						<template
							v-for="(type, i) in base.types"
							:key="type.ticker">
							<span
								class="whitespace-nowrap"
								:class="TYPE_CLASS[type.status]"
								:title="`${type.count}× ${type.ticker} · ${dueText(type.status, type.due)}`">
								{{ type.count }} {{ type.ticker }}
							</span>
							<span
								v-if="i < base.types.length - 1"
								class="text-white/30">
								·
							</span>
						</template>
					</span>
					<span class="grid gap-1 pe-3.5">
						<span class="text-sm tabular-nums">
							{{ formatNumber(base.condition * 100, 1) }} %
						</span>
						<span class="h-1 rounded-sm bg-white/8 overflow-hidden">
							<span
								class="block h-full"
								:class="
									base.condition < 0.9
										? 'bg-negative'
										: base.condition < 0.95
											? 'bg-warning'
											: 'bg-positive'
								"
								:style="{
									width: `${base.condition * 100}%`,
								}" />
						</span>
					</span>
					<span
						class="text-sm tabular-nums"
						data-testid="fio-repair-row-since">
						{{ sinceText(base) }}
					</span>
					<span>
						<FIORepairDueTag
							:status="base.status"
							:due="base.due" />
					</span>
					<span class="grid justify-items-end gap-px pe-3">
						<span class="text-sm tabular-nums text-ink-strong">
							{{ formatNumber(base.bill.cost, 0) }} ȼ
						</span>
						<span class="text-xs tabular-nums text-muted">
							{{ formatNumber(base.bill.weight, 0) }} t ·
							{{ formatNumber(base.bill.volume, 0) }} m³
						</span>
					</span>
				</button>
				<p v-if="!rows.length" class="px-3 py-4 text-sm text-muted">
					{{ $t("fio.repair.list.empty") }}
				</p>
			</div>
		</div>
		<p class="px-3 py-2 text-xs text-muted">
			{{ $t("fio.repair.list.footer") }}
		</p>
	</section>
</template>
