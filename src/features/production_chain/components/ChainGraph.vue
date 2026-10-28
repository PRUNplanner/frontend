<script setup lang="ts">
	import { computed, onMounted, ref, watch, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	const { materialsMap, getMaterialClass } = useMaterialData();

	// Engine
	import {
		LAYOUT,
		layoutChain,
	} from "@/features/production_chain/engine/chainLayout";

	// Util
	import {
		formatQty,
		NO_OWN,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IChainResult } from "@/features/production_chain/engine/chainSolver.types";
	import type {
		IChainLineMode,
		IChainOwn,
	} from "@/features/production_chain/productionChain.types";

	const { result, lines, own = NO_OWN } = defineProps<{
		result: IChainResult;
		lines: IChainLineMode;
		own?: IChainOwn;
	}>();

	/** the focused material, null shows everything */
	const focus = defineModel<string | null>("focus", { required: true });

	const emit = defineEmits<{
		(e: "focused", ticker: string): void;
	}>();

	const MIN_ZOOM = 0.2;
	const MAX_ZOOM = 2;
	const ZOOM_STEP = 1.25;
	// a width-bound fit stops here so 12 px labels stay readable (9 px)
	const MIN_FIT_ZOOM = 0.75;

	const layout = computed(() => layoutChain(result));
	const zoom = ref(1);
	const scroller: Ref<HTMLElement | null> = ref(null);

	const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

	// the scroller's max-h-[75vh]
	const MAX_HEIGHT_SHARE = 0.75;

	/** the whole chain in the panel: its width and the 75vh it may grow to */
	function fit(): void {
		const width = scroller.value?.clientWidth ?? 0;
		if (width <= 0) return;
		const height = window.innerHeight * MAX_HEIGHT_SHARE;
		const byWidth = width / layout.value.width;
		const byHeight = height / layout.value.height;
		// a narrow panel (a phone) stops at MIN_FIT_ZOOM and pans sideways;
		// a tall chain still fits whole
		zoom.value =
			byWidth <= byHeight
				? Math.max(MIN_FIT_ZOOM, Math.min(1, byWidth))
				: clampZoom(Math.min(1, byHeight));
	}

	function zoomBy(direction: 1 | -1): void {
		zoom.value = clampZoom(zoom.value * ZOOM_STEP ** direction);
	}

	defineExpose({ fit, zoomBy });

	onMounted(fit);
	// a new set of targets is a new chain: fit it
	watch(
		() =>
			result.order
				.filter((t) => result.rows[t].target)
				.sort()
				.join(),
		fit,
		{ flush: "post" }
	);

	const inputsOf = computed(() => {
		const map = new Map<string, string[]>();
		for (const l of result.links)
			map.set(l.consumer, [...(map.get(l.consumer) ?? []), l.input]);
		return map;
	});
	const usersOf = computed(() => {
		const map = new Map<string, string[]>();
		for (const l of result.links)
			map.set(l.input, [...(map.get(l.input) ?? []), l.consumer]);
		return map;
	});

	/** what the focused material needs (upstream) and feeds (downstream) */
	const near = computed<Set<string> | null>(() => {
		const f = focus.value;
		if (!f || !result.rows[f]) return null;
		const set = new Set<string>([f]);
		const walk = (t: string, next: Map<string, string[]>, seen: Set<string>) => {
			for (const n of next.get(t) ?? [])
				if (!seen.has(n)) {
					seen.add(n);
					set.add(n);
					walk(n, next, seen);
				}
		};
		walk(f, inputsOf.value, new Set());
		walk(f, usersOf.value, new Set());
		return set;
	});

	const dim = (t: string) => near.value !== null && !near.value.has(t);

	function flowOf(input: string, perDay: number): number {
		if (lines === "n") return 1;
		if (lines === "c") return perDay * result.rows[input].unitCost;
		return perDay * (materialsMap.value[input]?.weight ?? 0);
	}

	const edges = computed(() => {
		const flows = layout.value.edges.map((e) => flowOf(e.input, e.perDay));
		const max = Math.max(1e-9, ...flows);
		return layout.value.edges.map((e, i) => ({
			...e,
			key: `${e.input}>${e.consumer}`,
			width: lines === "n" ? 1.6 : 1.2 + 14 * Math.sqrt(flows[i] / max),
			dim: dim(e.input) || dim(e.consumer),
			cls: materialClass(e.input),
		}));
	});

	function materialClass(ticker: string): string {
		try {
			return getMaterialClass(ticker);
		} catch {
			return "";
		}
	}

	const anyHave = computed(() =>
		result.order.some((t) => result.rows[t].source === "have")
	);

	/** "Have · Deimos Metals +1", "Your bases" for typed amounts */
	function haveLine(ticker: string): string {
		const list = own.suppliers[ticker] ?? [];
		const name =
			list[0]?.plan?.name ?? t("production_chains.have.your_bases");
		return list.length > 1
			? t("production_chains.have.graph_full_more", {
					name,
					n: list.length - 1,
				})
			: t("production_chains.have.graph_full", { name });
	}

	const nodes = computed(() =>
		result.order.map((ticker) => {
			const row = result.rows[ticker];
			const pos = layout.value.nodes[ticker];
			const made =
				row.source === "buy"
					? t("production_chains.graph.buy_on", { cx: row.exchange })
					: `${row.base} · ${row.buildingTicker ?? "—"} × ${formatNumber(row.buildings, 2)}`;
			return {
				ticker,
				row,
				x: pos.x,
				y: pos.y,
				perDay: row.perDay + row.have,
				have: row.have > 1e-9,
				line2:
					row.source === "have"
						? haveLine(ticker)
						: row.have > 1e-9
							? row.source === "buy"
								? t("production_chains.have.graph_part_buy", {
										n: formatQty(row.have),
										rest: formatQty(row.perDay),
									})
								: t("production_chains.have.graph_part", {
										n: formatQty(row.have),
										// no base letter: the line is short
										rest: `${row.buildingTicker ?? "—"} × ${formatNumber(row.buildings, 2)}`,
									})
							: made,
			};
		})
	);

	function select(ticker: string): void {
		focus.value = focus.value === ticker ? null : ticker;
		if (focus.value) emit("focused", ticker);
	}
</script>

<template>
	<div>
		<div class="px-3 py-2 text-xs flex items-center gap-2 min-h-10">
			<template v-if="focus">
				<span>{{ $t("production_chains.graph.focused", { ticker: focus }) }}</span>
				<button
					type="button"
					class="px-2 py-0.5 rounded-control border border-line hover:bg-hover cursor-pointer"
					@click="focus = null">
					{{ $t("production_chains.graph.show_all") }}
				</button>
			</template>
			<span v-else class="text-muted">
				{{ $t("production_chains.graph.focus_hint") }}
			</span>
		</div>
		<div ref="scroller" class="overflow-auto max-h-[75vh]" data-testid="chain-graph">
			<div
				class="relative"
				:style="{
					width: `${layout.width * zoom}px`,
					height: `${layout.height * zoom}px`,
				}">
				<div
					class="absolute top-0 left-0 origin-top-left"
					:style="{
						width: `${layout.width}px`,
						height: `${layout.height}px`,
						transform: `scale(${zoom})`,
					}">
					<svg
						:width="layout.width"
						:height="layout.height"
						:viewBox="`0 0 ${layout.width} ${layout.height}`"
						class="absolute inset-0"
						role="img"
						:aria-label="t('production_chains.graph.aria')">
						<text
							v-for="s in layout.stages"
							:key="`s-${s}`"
							:x="LAYOUT.pad + (s - 1) * (LAYOUT.nodeWidth + LAYOUT.gapX)"
							:y="LAYOUT.pad"
							class="fill-current text-muted text-xs uppercase">
							{{
								s > 1
									? $t("production_chains.graph.stage", { n: s - 1 })
									: anyHave
										? $t("production_chains.have.stage_raw")
										: $t("production_chains.graph.stage_raw")
							}}
						</text>
						<path
							v-for="e in edges"
							:key="e.key"
							:d="e.path"
							fill="none"
							stroke="currentColor"
							:stroke-width="e.width"
							:class="[e.cls, e.dim ? 'opacity-10' : 'opacity-70']">
							<title>
								{{
									$t("production_chains.graph.edge", {
										n: formatQty(e.perDay),
										input: e.input,
										consumer: e.consumer,
									})
								}}
							</title>
						</path>
						<template v-for="e in edges" :key="`l-${e.key}`">
							<text
								v-if="!e.dim"
								:x="e.labelX"
								:y="e.labelY"
								text-anchor="middle"
								class="fill-current text-ink text-xs tabular-nums"
								paint-order="stroke"
								stroke="black"
								stroke-width="3">
								{{ formatQty(e.perDay) }}
							</text>
						</template>
					</svg>
					<button
						v-for="n in nodes"
						:key="n.ticker"
						type="button"
						class="absolute flex items-center gap-2 p-1.5 rounded-panel border bg-surface text-left cursor-pointer hover:bg-hover"
						:class="[
							n.have
								? 'border-have/70'
								: n.row.source === 'buy'
									? 'border-dashed border-line'
									: 'border-line-strong',
							n.row.target ? 'border-prunplanner' : '',
							focus === n.ticker ? 'ring-2 ring-link' : '',
							dim(n.ticker) ? 'opacity-25' : '',
						]"
						:style="{
							left: `${n.x}px`,
							top: `${n.y}px`,
							width: `${LAYOUT.nodeWidth}px`,
							height: `${LAYOUT.nodeHeight}px`,
						}"
						:aria-pressed="focus === n.ticker"
						:aria-label="
							t('production_chains.graph.node', {
								ticker: n.ticker,
								n: formatQty(n.perDay),
							})
						"
						:data-testid="`chain-node-${n.ticker}`"
						@click="select(n.ticker)">
						<span
							class="material-tile shrink-0 self-stretch w-12 flex items-center justify-center rounded-control text-xs font-bold"
							:class="materialClass(n.ticker)">
							{{ n.ticker }}
						</span>
						<span class="min-w-0">
							<span class="block text-sm tabular-nums truncate">
								{{ $t("production_chains.detail.per_day", { n: formatQty(n.perDay) }) }}
							</span>
							<span
								class="block text-xs truncate"
								:class="n.row.cheaper ? 'text-warning' : n.have ? 'text-have' : 'text-muted'"
								:title="n.line2">
								{{ n.line2 }}
								<template v-if="n.row.cheaper">
									· {{ $t("production_chains.graph.buy_hint") }}
								</template>
							</span>
						</span>
						<span
							v-if="n.have"
							class="absolute -top-2.5 right-1 px-1 rounded-control border border-have bg-surface text-have text-xs font-bold uppercase leading-4"
							:data-testid="`chain-have-mark-${n.ticker}`">
							{{ $t("production_chains.have.graph_mark") }}
						</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
