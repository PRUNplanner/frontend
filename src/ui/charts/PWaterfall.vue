<script setup lang="ts">
	import {
		computed,
		nextTick,
		onBeforeUnmount,
		onMounted,
		ref,
		shallowRef,
		useId,
	} from "vue";

	// Util
	import { createFloating } from "@/ui/popper";
	import { formatNumber } from "@/util/numbers";
	import { tooltipConfig } from "@/ui/styles";
	import { Z_TOOLTIP } from "@/ui/zIndex";
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { compactNumber, waterfallLayout } from "@/ui/charts/charts.util";

	// Types & Interfaces
	import type {
		IWaterfallColumn,
		IWaterfallColumnBox,
		IWaterfallSegment,
		WaterfallTone,
	} from "@/ui/charts/charts.types";

	// a waterfall: total bars on 0, floating steps, dashed connectors. The
	// tooltip slot gets the column and segment hovered, focused or tapped.
	const { columns, label } = defineProps<{
		columns: IWaterfallColumn[];
		label: string;
	}>();

	defineSlots<{
		tooltip(props: {
			column: IWaterfallColumn;
			segment: IWaterfallSegment;
		}): unknown;
	}>();

	const PLOT_PX = 300;
	const AXIS_PX = 44;
	// below this a column scrolls in the box instead of squeezing
	const MIN_SLOT_PX = 64;
	// labels beside a bar need this much room to the next bar
	const BESIDE_GUTTER_PX = 56;

	const theme = useChartTheme();

	const root = ref<HTMLElement | null>(null);
	const rootWidth = ref(0);
	let resize: ResizeObserver | undefined;
	onMounted(() => {
		if (typeof ResizeObserver === "undefined" || !root.value) return;
		resize = new ResizeObserver(([entry]) => {
			rootWidth.value = entry.contentRect.width;
		});
		resize.observe(root.value);
	});

	const plotWidth = computed(() =>
		Math.max(
			(rootWidth.value || 800) - AXIS_PX,
			columns.length * MIN_SLOT_PX
		)
	);
	const slot = computed(() => plotWidth.value / (columns.length || 1));
	const barWidth = computed(() => slot.value * 0.6);
	const barLeft = (i: number) => i * slot.value + slot.value * 0.2;

	const layout = computed(() =>
		waterfallLayout(columns, PLOT_PX, slot.value * 0.4 >= BESIDE_GUTTER_PX)
	);

	// narrow bars keep the chip and drop the value, very narrow ones both
	const insideValue = computed(() => barWidth.value >= 72);
	const insideChip = computed(() => barWidth.value >= 30);
	const valueText = (c: IWaterfallColumn) =>
		slot.value < 100
			? compactNumber(c.value)
			: formatNumber(c.value, 0, false, c.kind === "step");

	function fill(tone: WaterfallTone): string {
		const t = theme.value;
		switch (tone) {
			case "neutral":
				return `color-mix(in srgb, ${t.ink} 80%, transparent)`;
			case "positive":
				return t.positive;
			case "negative":
				return t.negative;
			case "hatched":
				return `repeating-linear-gradient(135deg, ${t.negative} 0 6px, color-mix(in srgb, ${t.negative} 35%, transparent) 6px 10px)`;
		}
	}

	const tipId = useId();
	const active = ref<string | null>(null);
	const activeTip = shallowRef<{
		column: IWaterfallColumn;
		segment: IWaterfallSegment;
	} | null>(null);
	const tooltipRef = ref<HTMLElement | null>(null);
	let floating: { destroy: () => void } | null = null;

	const segId = (c: IWaterfallColumnBox, s: IWaterfallSegment) =>
		`${c.column.key}\u0000${s.key}`;

	async function show(
		box: IWaterfallColumnBox,
		segment: IWaterfallSegment,
		event: Event
	) {
		const id = segId(box, segment);
		if (active.value === id) return;
		hide();
		active.value = id;
		activeTip.value = { column: box.column, segment };
		const anchor = event.currentTarget as HTMLElement;
		await nextTick();
		if (tooltipRef.value)
			floating = createFloating(anchor, tooltipRef.value, "right", 8);
	}

	function hide() {
		floating?.destroy();
		floating = null;
		active.value = null;
		activeTip.value = null;
	}

	onBeforeUnmount(() => {
		resize?.disconnect();
		hide();
	});
</script>

<template>
	<div ref="root" class="w-full overflow-x-auto overflow-y-hidden">
		<div
			role="group"
			:aria-label="label"
			class="relative"
			:style="{ width: `${plotWidth + AXIS_PX}px` }">
			<!-- y axis and grid -->
			<div class="relative" :style="{ height: `${PLOT_PX}px` }">
				<div
					v-for="tick in layout.ticks"
					:key="tick.value"
					class="absolute left-0 right-0 flex items-center"
					:style="{ top: `${tick.y}px` }">
					<span
						class="w-10 pr-2 -translate-y-1/2 text-right text-xs text-muted tabular-nums">
						{{ compactNumber(tick.value) }}
					</span>
					<span
						class="grow h-px"
						:style="{
							background:
								tick.value === 0 ? theme.axis : theme.grid,
						}" />
				</div>

				<div
					class="absolute top-0 bottom-0"
					:style="{ left: `${AXIS_PX}px`, width: `${plotWidth}px` }">
					<template
						v-for="(box, i) in layout.columns"
						:key="box.column.key">
						<!-- connector to the next column -->
						<div
							v-if="i < layout.columns.length - 1"
							class="absolute border-t border-dashed border-white/40"
							:style="{
								top: `${box.endY}px`,
								left: `${barLeft(i) + barWidth}px`,
								width: `${slot - barWidth}px`,
							}" />

						<!-- value above the bar -->
						<div
							class="absolute text-center text-sm font-bold tabular-nums whitespace-nowrap"
							:class="
								box.column.tone === 'neutral'
									? 'text-white'
									: box.column.tone === 'positive'
										? 'text-positive'
										: 'text-negative'
							"
							:style="{
								top: `${box.top - 20}px`,
								left: `${i * slot}px`,
								width: `${slot}px`,
							}">
							{{ valueText(box.column) }}
						</div>

						<!-- segments, each with its tooltip -->
						<button
							v-for="seg in box.segments"
							:key="seg.key"
							type="button"
							class="absolute flex items-center justify-center gap-1 overflow-hidden text-black shadow-[inset_0_-1px_0_rgb(0_0_0/0.45)] focus-visible:outline-2 focus-visible:outline-white pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:top-1/2 pointer-coarse:after:h-11 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']"
							:class="
								active === segId(box, seg)
									? 'ring-2 ring-white z-10'
									: ''
							"
							:style="{
								top: `${seg.top}px`,
								height: `${Math.max(seg.height, 1)}px`,
								left: `${barLeft(i)}px`,
								width: `${barWidth}px`,
								background: fill(box.column.tone),
							}"
							:aria-label="`${box.column.label}: ${seg.label || box.column.label} ${formatNumber(seg.value, 0)}`"
							:aria-describedby="
								active === segId(box, seg) ? tipId : undefined
							"
							@mouseenter="show(box, seg, $event)"
							@mouseleave="hide"
							@focus="show(box, seg, $event)"
							@blur="hide"
							@click="show(box, seg, $event)"
							@keydown.esc="hide">
							<template
								v-if="seg.labelAt === 'inside' && insideChip">
								<span
									class="px-1 rounded-sm text-[10px] font-bold"
									:class="
										seg.chipClass ??
										'bg-black/70 text-white'
									">
									{{ seg.label }}
								</span>
								<span
									v-if="insideValue"
									class="text-xs font-bold tabular-nums">
									{{ compactNumber(seg.value) }}
								</span>
							</template>
						</button>

						<!-- labels beside the bar, off the connector -->
						<div
							v-for="seg in box.segments.filter(
								(s) => s.labelAt === 'beside'
							)"
							:key="`beside-${seg.key}`"
							class="absolute text-[11px] leading-3.5 text-white/70 whitespace-nowrap overflow-hidden"
							:style="{
								top: `${seg.labelTop}px`,
								left: `${barLeft(i) + barWidth + 4}px`,
								maxWidth: `${slot - barWidth - 6}px`,
							}">
							{{ seg.label }} {{ compactNumber(seg.value) }}
						</div>
					</template>
				</div>
			</div>

			<!-- column labels -->
			<div class="flex pt-2" :style="{ marginLeft: `${AXIS_PX}px` }">
				<div
					v-for="box in layout.columns"
					:key="box.column.key"
					class="px-1 text-center text-xs sm:text-sm text-white/80 break-words"
					:style="{ width: `${slot}px` }">
					{{ box.column.label }}
				</div>
			</div>
		</div>
	</div>

	<Teleport v-if="activeTip" to="body">
		<div
			:id="tipId"
			ref="tooltipRef"
			role="tooltip"
			class="pointer-events-none"
			:style="{ zIndex: Z_TOOLTIP }"
			:class="tooltipConfig.tooltip">
			<slot
				name="tooltip"
				:column="activeTip.column"
				:segment="activeTip.segment" />
		</div>
	</Teleport>
</template>
