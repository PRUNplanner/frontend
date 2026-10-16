<script setup lang="ts">
	import { computed, onBeforeUnmount, onMounted, ref } from "vue";
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();

	// Util
	import {
		timelineAxis,
		timelineLanes,
		timelinePct,
	} from "@/features/fio_repair/fioRepair.util";

	// Types & Interfaces
	import type {
		FIORepairStatus,
		IFIORepairBase,
	} from "@/features/fio_repair/fioRepair.types";

	// UI
	import { PTooltip } from "@/ui";

	/**
	 * When each base comes due: one chip per base on an axis from the most
	 * overdue base to the last one due, with today and the due soon band.
	 * Up to 4 lanes; crowded spots fold into "+n". Bases without a date
	 * share one chip at the left edge.
	 *
	 * @author jplacht
	 */
	const { bases, dueSoon, selected } = defineProps<{
		bases: IFIORepairBase[];
		dueSoon: number;
		selected: string | undefined;
	}>();

	const emit = defineEmits<{
		(e: "select", planet: string): void;
		(e: "unknown"): void;
	}>();

	const LANE_PX = 28;
	const TICK_PX = 72;
	const UNKNOWN = "\u0000unknown";

	const track = ref<HTMLElement | null>(null);
	const width = ref(740);
	let resize: ResizeObserver | undefined;
	onMounted(() => {
		if (typeof ResizeObserver === "undefined" || !track.value) return;
		resize = new ResizeObserver(([entry]) => {
			if (entry.contentRect.width) width.value = entry.contentRect.width;
		});
		resize.observe(track.value);
	});
	onBeforeUnmount(() => resize?.disconnect());

	const dated = computed(() => bases.filter((b) => b.due !== null));
	const undated = computed(() => bases.filter((b) => b.due === null));

	const axis = computed(() =>
		timelineAxis(
			dated.value.map((b) => b.due!),
			dueSoon,
			// a centred label next to an edge-aligned one needs 1.5 widths
			Math.max(3, Math.floor(width.value / TICK_PX) + 1)
		)
	);

	const byPlanet = computed(
		() => new Map(bases.map((b) => [b.planet, b] as const))
	);

	const layout = computed(() =>
		timelineLanes(
			[
				...(undated.value.length
					? [
							{
								key: UNKNOWN,
								label: t("fio.repair.timeline.unknown", {
									n: undated.value.length,
								}),
								pct: 0,
							},
						]
					: []),
				...dated.value.map((b) => ({
					key: b.planet,
					label: b.name,
					pct: timelinePct(axis.value, b.due!),
				})),
			],
			width.value
		)
	);

	const DOT: Record<FIORepairStatus, string> = {
		overdue: "bg-negative",
		unknown: "bg-negative",
		soon: "bg-warning",
		later: "bg-muted",
	};
	const statusOf = (key: string): FIORepairStatus =>
		key === UNKNOWN ? "unknown" : byPlanet.value.get(key)!.status;

	const today = computed(() => timelinePct(axis.value, 0));
	const soonWidth = computed(
		() => timelinePct(axis.value, dueSoon) - today.value
	);

	function tick(day: number): string {
		if (day === 0) return t("fio.repair.timeline.today");
		return t("fio.repair.timeline.tick", {
			n: day > 0 ? `+${day}` : `−${-day}`,
		});
	}

	const names = (keys: string[]) =>
		keys.map((k) => byPlanet.value.get(k)?.name ?? k).join(", ");

	function pick(key: string): void {
		if (key === UNKNOWN) emit("unknown");
		else emit("select", key);
	}
</script>

<template>
	<section
		:aria-label="$t('fio.repair.timeline.title')"
		class="bg-surface border border-line rounded-panel px-3.5 pt-3 pb-2.5 overflow-x-clip"
		data-testid="fio-repair-timeline">
		<div class="flex flex-wrap justify-between items-baseline gap-x-3">
			<h2 class="text-base font-bold text-ink-strong">
				{{ $t("fio.repair.timeline.title") }}
			</h2>
			<span class="text-xs text-muted">
				{{ $t("fio.repair.timeline.hint") }}
			</span>
		</div>
		<div
			ref="track"
			class="relative mt-2.5 mx-1.5"
			:style="{ height: `${layout.lanes * LANE_PX + 22}px` }">
			<div
				class="absolute top-0 bottom-4.5 left-0 bg-negative/8 border-r border-negative/40"
				:style="{ width: `${today}%` }" />
			<div
				class="absolute top-0 bottom-4.5 bg-warning/8"
				:style="{ left: `${today}%`, width: `${soonWidth}%` }" />
			<span
				v-for="(d, i) in axis.ticks"
				:key="d"
				class="absolute bottom-0 text-xs whitespace-nowrap tabular-nums"
				:class="[
					d === 0 ? 'text-ink-strong' : 'text-muted',
					i === 0
						? ''
						: i === axis.ticks.length - 1
							? '-translate-x-full'
							: '-translate-x-1/2',
				]"
				:style="{ left: `${timelinePct(axis, d)}%` }"
				data-testid="fio-repair-tick">
				{{ tick(d) }}
			</span>
			<button
				v-for="chip in layout.chips"
				:key="chip.key"
				type="button"
				class="absolute inline-flex items-center gap-1 h-6 pointer-coarse:min-w-11 ps-1 pe-1.5 rounded-full border text-xs whitespace-nowrap hover:brightness-125 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-[11px] pointer-coarse:after:content-['']"
				:class="
					chip.key === selected
						? 'bg-selected border-white/70 text-ink-strong'
						: 'bg-surface border-white/12 text-ink'
				"
				:style="{
					left: `${chip.pct}%`,
					top: `${chip.lane * LANE_PX}px`,
					transform: chip.flip
						? 'translateX(calc(-100% + 6px))'
						: 'translateX(-6px)',
				}"
				:aria-pressed="chip.key === selected"
				:title="
					chip.key === UNKNOWN
						? names(undated.map((b) => b.planet))
						: undefined
				"
				data-testid="fio-repair-chip"
				@click="pick(chip.key)">
				<span
					class="size-2 rounded-full"
					:class="DOT[statusOf(chip.key)]" />
				{{ chip.label }}
			</button>
			<div
				v-for="group in layout.more"
				:key="group.keys[0]"
				class="absolute"
				:style="{
					left: `${group.pct}%`,
					top: `${(layout.lanes - 1) * LANE_PX}px`,
					transform:
						group.pct > 90
							? 'translateX(calc(-100% + 6px))'
							: 'translateX(-6px)',
				}">
				<PTooltip>
					<template #trigger>
						<button
							type="button"
							class="inline-flex items-center gap-1 h-6 pointer-coarse:min-w-11 ps-1 pe-1.5 rounded-full border border-white/25 bg-surface text-xs text-ink whitespace-nowrap pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-[11px] pointer-coarse:after:content-['']"
							:aria-label="
								$t('fio.repair.timeline.more', {
									n: group.keys.length,
									names: names(group.keys),
								})
							"
							data-testid="fio-repair-more"
							@click="pick(group.keys[0])">
							<span
								class="size-2 rounded-full"
								:class="DOT[statusOf(group.keys[0])]" />
							+{{ group.keys.length }}
						</button>
					</template>
					{{ names(group.keys) }}
				</PTooltip>
			</div>
		</div>
	</section>
</template>
