<script setup lang="ts">
	import { computed, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import {
		revenueSplitRows,
		splitShares,
	} from "@/features/empire/empireAnalysis.util";

	// Components
	import PStackedBar from "@/ui/charts/PStackedBar.vue";

	// Types & Interfaces
	import type {
		IEmpirePlanListData,
		IEmpireSplitParts,
	} from "@/features/empire/empire.types";
	import type { IStackedBarSegment } from "@/ui/charts/charts.types";

	interface ISplitLine {
		key: string;
		kind: "plan" | "divider" | "other";
		name: string;
		link?: string;
		parts?: IEmpireSplitParts;
	}

	const TOP = 10;
	const PART_KEYS = ["inputs", "workforce", "degradation", "profit"] as const;

	const { plans } = defineProps<{ plans: IEmpirePlanListData[] }>();

	const theme = useChartTheme();
	const otherOpen = ref(false);

	const rows = computed(() => revenueSplitRows(plans, TOP));

	const planLine = (p: IEmpirePlanListData): ISplitLine => ({
		key: p.uuid,
		kind: "plan",
		name: p.name || p.planet,
		link: `/plan/${p.planet}/${p.uuid}`,
		parts: p,
	});

	// top, divider + losses, divider + "Other" (and its plans when open)
	const lines = computed<ISplitLine[]>(() => {
		const { top, losses, rest, other } = rows.value;
		const out = top.map(planLine);
		if (losses.length && top.length)
			out.push({ key: "div-loss", kind: "divider", name: "" });
		out.push(...losses.map(planLine));
		if (other) {
			out.push({ key: "div-other", kind: "divider", name: "" });
			out.push({
				key: "other",
				kind: "other",
				name: t(
					"empire.analysis.revenue_split.other",
					{ n: rest.length },
					rest.length
				),
				parts: other,
			});
			if (otherOpen.value) out.push(...rest.map(planLine));
		}
		return out;
	});

	const colors = computed(() => ({
		inputs: theme.value.costPart(1),
		workforce: theme.value.costPart(2),
		degradation: theme.value.costPart(3),
		profit: theme.value.positive,
	}));

	function segments(parts: IEmpireSplitParts): IStackedBarSegment[] {
		const shares = splitShares(parts);
		return PART_KEYS.map((key) => ({
			key,
			value: shares[key],
			color: colors.value[key],
		}));
	}

	const hatchFrom = (parts: IEmpireSplitParts) => {
		const { uncovered } = splitShares(parts);
		return uncovered > 0 ? 100 - uncovered : undefined;
	};

	const margin = (parts: IEmpireSplitParts) =>
		formatPercent(splitShares(parts).margin, 1);

	const legend = computed(() => [
		...PART_KEYS.map((key) => ({
			key,
			label: t(`empire.analysis.parts.${key}`),
			style: { background: colors.value[key] },
		})),
		{
			key: "uncovered",
			label: t("empire.analysis.parts.uncovered"),
			style: {
				background:
					"repeating-linear-gradient(135deg, var(--color-negative) 0 3px, transparent 3px 5px)",
			},
		},
	]);
</script>

<template>
	<section class="border rounded-[3px] border-white/15 p-3">
		<div class="flex flex-wrap items-baseline gap-x-3 pb-3">
			<h2 class="text-base font-bold">
				{{ $t("empire.analysis.revenue_split.title") }}
			</h2>
			<span class="text-xs text-muted">
				{{ $t("empire.analysis.revenue_split.caption", { top: TOP }) }}
			</span>
		</div>
		<div v-if="lines.length === 0" class="text-sm text-muted">
			{{ $t("empire.analysis.revenue_split.empty") }}
		</div>
		<!-- scrolls in its own box on phones -->
		<div v-else class="overflow-x-auto">
			<div
				class="min-w-[440px] grid grid-cols-[minmax(6rem,11rem)_minmax(8rem,1fr)_4.5rem_6rem] gap-x-3 items-center text-sm">
				<div class="text-xs text-muted uppercase pb-1">
					{{ $t("terms.plan") }}
				</div>
				<div class="text-xs text-muted uppercase pb-1">
					{{ $t("empire.analysis.revenue_split.split") }}
				</div>
				<div class="text-xs text-muted uppercase pb-1 text-right">
					{{ $t("empire.analysis.revenue_split.margin") }}
				</div>
				<div class="text-xs text-muted uppercase pb-1 text-right">
					{{ $t("empire.analysis.revenue_split.revenue_day") }}
				</div>
				<template v-for="line in lines" :key="line.key">
					<div
						v-if="line.kind === 'divider'"
						class="col-span-4 border-t border-white/10 my-1" />
					<template v-else>
						<div class="min-w-0 truncate">
							<button
								v-if="line.kind === 'other'"
								type="button"
								class="touch-target min-h-6 text-left hover:underline"
								:aria-expanded="otherOpen"
								@click="otherOpen = !otherOpen">
								{{ otherOpen ? "▾" : "▸" }} {{ line.name }}
							</button>
							<router-link
								v-else
								:to="line.link!"
								:title="line.name"
								class="block truncate py-1 text-link-primary font-bold hover:underline">
								{{ line.name }}
							</router-link>
						</div>
						<PStackedBar
							:segments="segments(line.parts!)"
							:hatch-from="hatchFrom(line.parts!)"
							:label="
								t('empire.analysis.revenue_split.row_label', {
									name: line.name,
									margin: margin(line.parts!),
									revenue: formatNumber(line.parts!.revenue, 0),
								})
							">
							<div class="font-bold pb-1">{{ line.name }}</div>
							<div
								v-for="key in PART_KEYS"
								:key="key"
								class="flex justify-between gap-x-4 tabular-nums">
								<span>{{ $t(`empire.analysis.parts.${key}`) }}</span>
								<span>
									{{ formatNumber(line.parts![key], 0) }} ·
									{{ formatPercent(splitShares(line.parts!)[key], 1) }}
								</span>
							</div>
							<div
								v-if="hatchFrom(line.parts!) !== undefined"
								class="flex justify-between gap-x-4 tabular-nums text-negative">
								<span>{{ $t("empire.analysis.parts.uncovered") }}</span>
								<span>
									{{ formatPercent(splitShares(line.parts!).uncovered, 1) }}
								</span>
							</div>
						</PStackedBar>
						<div
							class="text-right tabular-nums"
							:class="
								line.parts!.profit < 0 ? 'text-negative' : 'text-positive'
							">
							{{ margin(line.parts!) }}
						</div>
						<div class="text-right tabular-nums">
							{{ formatNumber(line.parts!.revenue, 0) }}
						</div>
					</template>
				</template>
			</div>
		</div>
		<div
			class="flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs text-muted"
			aria-hidden="true">
			<span
				v-for="l in legend"
				:key="l.key"
				class="inline-flex items-center gap-x-1.5">
				<span class="inline-block size-2.5 rounded-[2px]" :style="l.style" />
				{{ l.label }}
			</span>
		</div>
	</section>
</template>
