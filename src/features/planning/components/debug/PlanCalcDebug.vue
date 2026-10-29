<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		ref,
		shallowRef,
		type Ref,
		watch,
	} from "vue";

	// Composables
	import { useOverlayLayer } from "@/ui/useOverlayLayer";
	import { useDockHeight } from "@/ui/useDockHeight";
	import { setCalcDebug } from "@/lib/debugMode";

	// Util
	import {
		calcDebugChecks,
		checkLine,
		extraInputs,
		fillFormula,
		formatTraceValue,
		traceJSON,
		traceText,
		traceTree,
	} from "@/features/planning/calcDebug.util";
	import { TRACE_PHASES } from "@/features/planning/engine/trace";
	import { formatNumber } from "@/util/numbers";

	// Components
	import PLayerClose from "@/ui/components/PLayerClose.vue";

	// Types & Interfaces
	import type {
		ITraceEntry,
		TracePhase,
	} from "@/features/planning/engine/engine.types";
	import type {
		IOverviewData,
		IPlanResult,
		IPlanTraceRun,
	} from "@/features/planning/usePlanCalculation.types";
	import type {
		ICalcDebugMeta,
		ICalcDebugPlan,
		ICalcDebugReport,
		ITraceNode,
	} from "@/features/planning/calcDebug.types";

	// UI
	import { PButton, PInput, useToast } from "@/ui";
	const toast = useToast();

	/**
	 * Calculation debug: every step of the plan engine for the open plan,
	 * with formulas, self-checks and copy. English only by decision. Docked
	 * under the plan in the page flow, not a modal: above the phone's
	 * bottom nav, and over the sticky status bar (same z-index, later in
	 * the page) when tall. Mounted only while open, so nothing is traced
	 * when it's closed.
	 */
	const { traceCalculation, result, overview, meta, plan, modified } =
		defineProps<{
			traceCalculation: () => IPlanTraceRun | undefined;
			/** the plan view's live result, reruns the trace when it changes */
			result: IPlanResult;
			overview: IOverviewData;
			meta: Pick<ICalcDebugMeta, "plan" | "planet" | "cx" | "empire">;
			/** the plan as save sends it, with its edits */
			plan: ICalcDebugPlan;
			/** differs from the last save */
			modified: boolean;
		}>();

	const show = defineModel<boolean>("show", { required: true });

	const panel: Ref<HTMLElement | null> = ref(null);
	useOverlayLayer(show, panel, {
		modal: false,
		autoFocus: () => false,
		close: () => (show.value = false),
	});
	const { height, dragStart, dragMove, dragEnd, resizeKey } = useDockHeight();

	/*
	 * Trace: rerun when the plan's result changes, once per frame
	 */
	const run = shallowRef<IPlanTraceRun>();
	const report = shallowRef<ICalcDebugReport>({ checks: [], warnings: [] });

	// a failed run keeps the last trace, like the live result does
	const error = ref<string>();
	function retrace(): void {
		try {
			const traced = traceCalculation();
			if (!traced) return;
			run.value = traced;
			report.value = calcDebugChecks({ result, overview }, traced);
			error.value = undefined;
		} catch (err) {
			error.value = err instanceof Error ? err.message : String(err);
		}
	}

	let frame: number | null = null;
	watch(
		() => [result, overview],
		() => {
			if (frame !== null) return;
			frame = requestAnimationFrame(() => {
				frame = null;
				retrace();
			});
		}
	);
	retrace();
	onBeforeUnmount(() => {
		if (frame !== null) cancelAnimationFrame(frame);
	});

	const passed = computed(
		() => report.value.checks.filter((c) => c.pass).length
	);
	const allPass = computed(() => passed.value === report.value.checks.length);
	const status = computed(() => {
		if (error.value) return `calculation failed: ${error.value}`;
		if (!run.value) return "waiting for the plan…";
		const { at, ms, entries, truncated } = run.value;
		return [
			`recalculated ${new Date(at).toLocaleTimeString("en-GB")}`,
			`${formatNumber(ms, 1)} ms`,
			`${formatNumber(entries.length, 0)} steps${truncated ? " (truncated)" : ""}`,
			`${passed.value}/${report.value.checks.length} checks ${allPass.value ? "✓" : "✗"}`,
		].join(" · ");
	});

	/*
	 * Toolbar
	 */
	const phases: Ref<TracePhase[]> = ref([...TRACE_PHASES]);
	const filter: Ref<string> = ref("");
	const issuesOnly: Ref<boolean> = ref(false);
	// sections start collapsed, a search opens them
	const collapsedPhases: Ref<Set<TracePhase>> = ref(new Set(TRACE_PHASES));
	const searching = computed(
		() => issuesOnly.value || filter.value.trim() !== ""
	);
	const sectionOpen = (phase: TracePhase) =>
		searching.value || !collapsedPhases.value.has(phase);
	// groups by phase and label, so they stay collapsed across reruns
	const collapsedGroups: Ref<Set<string>> = ref(new Set());
	const groupKey = (e: ITraceEntry) => `${e.phase}|${e.label}`;

	function togglePhase(phase: TracePhase): void {
		phases.value = phases.value.includes(phase)
			? phases.value.filter((p) => p !== phase)
			: TRACE_PHASES.filter(
					(p) => p === phase || phases.value.includes(p)
				);
	}
	function toggled<T>(set: Set<T>, key: T): Set<T> {
		const next = new Set(set);
		if (!next.delete(key)) next.add(key);
		return next;
	}
	function toggleSection(phase: TracePhase): void {
		collapsedPhases.value = toggled(collapsedPhases.value, phase);
	}
	const groupCollapsed = (e: ITraceEntry) =>
		collapsedGroups.value.has(groupKey(e));
	function toggleGroup(e: ITraceEntry): void {
		collapsedGroups.value = toggled(collapsedGroups.value, groupKey(e));
	}

	function matches(e: ITraceEntry): boolean {
		if (issuesOnly.value && e.level !== "warn") return false;
		const q = filter.value.trim().toLowerCase();
		if (!q) return true;
		return [e.label, e.scope?.building, e.scope?.ticker].some((s) =>
			s?.toLowerCase().includes(q)
		);
	}

	interface ILine {
		entry: ITraceEntry;
		depth: number;
		group: boolean;
		filled?: string;
		extra?: string;
	}

	// a node shows when it matches, a group also when something in it does
	function lines(
		node: ITraceNode,
		depth: number,
		parentMatched: boolean
	): ILine[] {
		const self = parentMatched || matches(node.entry);
		const group = node.children.length > 0;
		const collapsed = group && groupCollapsed(node.entry);
		const inner = node.children.flatMap((c) => lines(c, depth + 1, self));
		if (!self && !inner.length) return [];
		return [
			{
				entry: node.entry,
				depth,
				group,
				filled: fillFormula(node.entry),
				extra: extraInputs(node.entry),
			},
			...(collapsed ? [] : inner),
		];
	}

	const sections = computed(() => {
		if (!run.value) return [];
		const tree = traceTree(run.value.entries);
		return phases.value
			.map((phase) => ({
				phase,
				lines: tree[phase].flatMap((n) => lines(n, 0, false)),
			}))
			.filter((s) => s.lines.length);
	});

	/*
	 * The plan as stored, read only while its section is open
	 */
	const planOpen: Ref<boolean> = ref(false);
	const planStatus = computed(() =>
		[
			plan.uuid
				? `saved ${plan.modified_at ?? "(no version)"}`
				: "never saved",
			...(modified ? ["unsaved edits"] : []),
		].join(" · ")
	);
	const planJSON = computed(() => JSON.stringify(plan, null, 2));

	const shownChecks = computed(() =>
		issuesOnly.value
			? report.value.checks.filter((c) => !c.pass)
			: report.value.checks
	);

	/*
	 * Copy
	 */
	function fullMeta(): ICalcDebugMeta {
		return {
			...meta,
			version: __APP_VERSION__,
			build: __BUILD_ID__,
			date: new Date(run.value?.at ?? Date.now()).toISOString(),
		};
	}

	async function copy(format: "text" | "json"): Promise<void> {
		if (!run.value) return;
		const text = (format === "text" ? traceText : traceJSON)(
			fullMeta(),
			report.value,
			run.value.entries,
			plan
		);
		try {
			await navigator.clipboard.writeText(text);
			toast(
				format === "text"
					? "Calculation trace copied as text."
					: "Calculation trace copied as JSON.",
				{ type: "info" }
			);
		} catch {
			toast("Copying failed, the browser blocked the clipboard.", {
				type: "error",
			});
		}
	}
</script>

<template>
	<section
		ref="panel"
		tabindex="-1"
		data-calc-debug
		class="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 z-[1000] flex flex-col border-t border-white/10 bg-surface shadow-panel outline-none"
		:style="{ height: `${height}px` }"
		aria-label="Calculation debug">
		<div
			role="separator"
			aria-orientation="horizontal"
			tabindex="0"
			aria-label="Resize the calculation debug panel"
			:aria-valuenow="height"
			class="touch-target h-3 shrink-0 flex items-center justify-center cursor-row-resize touch-none outline-none focus-visible:bg-white/10"
			@pointerdown="dragStart"
			@pointermove="dragMove"
			@pointerup="dragEnd"
			@pointercancel="dragEnd"
			@keydown.up.prevent="resizeKey(24)"
			@keydown.down.prevent="resizeKey(-24)">
			<span class="h-1 w-10 rounded-full bg-white/20" />
		</div>

		<!-- Header -->
		<div
			class="px-3 sm:px-6 pb-2 flex flex-row flex-wrap items-center gap-x-4 gap-y-2">
			<div class="flex flex-col min-w-0">
				<h2 class="text-base font-bold">Calculation debug</h2>
				<span
					class="text-xs font-mono"
					:class="allPass && !error ? 'text-muted' : 'text-negative'"
					:data-status="allPass && !error ? 'ok' : 'failing'">
					{{ status }}
				</span>
			</div>
			<div
				class="flex flex-row flex-wrap items-center gap-2 pointer-coarse:gap-2.5 ml-auto">
				<PButton
					size="sm"
					type="secondary"
					class="touch-target pointer-coarse:min-h-11"
					:disabled="!run"
					@click="copy('text')">
					Copy text
				</PButton>
				<PButton
					size="sm"
					type="secondary"
					class="touch-target pointer-coarse:min-h-11"
					:disabled="!run"
					@click="copy('json')">
					Copy JSON
				</PButton>
				<PButton
					size="sm"
					type="ghost"
					class="touch-target pointer-coarse:min-h-11"
					@click="setCalcDebug(false)">
					Turn off
				</PButton>
				<PLayerClose class="z-[1]" @click="show = false" />
			</div>
		</div>

		<!-- Toolbar -->
		<div
			class="px-3 sm:px-6 pb-2 flex flex-row flex-wrap items-center gap-2 pointer-coarse:gap-2.5">
			<div
				role="group"
				aria-label="Phases"
				class="flex flex-row flex-wrap gap-1 pointer-coarse:gap-2.5">
				<PButton
					v-for="phase in TRACE_PHASES"
					:key="phase"
					size="sm"
					type="ghost"
					class="touch-target pointer-coarse:min-h-11 font-mono"
					:pressed="phases.includes(phase)"
					@click="togglePhase(phase)">
					{{ phase }}
				</PButton>
			</div>
			<div
				class="flex flex-row items-center gap-2 pointer-coarse:gap-2.5 ml-auto">
				<PInput
					v-model:value="filter"
					size="sm"
					class="w-40"
					aria-label="Filter by building, ticker or label"
					placeholder="Filter" />
				<PButton
					size="sm"
					type="ghost"
					class="touch-target pointer-coarse:min-h-11"
					:pressed="issuesOnly"
					@click="issuesOnly = !issuesOnly">
					Issues only
				</PButton>
			</div>
		</div>

		<!-- Log -->
		<div
			class="flex-1 min-h-0 mx-3 sm:mx-6 mb-3 overflow-auto rounded bg-surface-sunken p-2 font-mono text-xs leading-tight select-text"
			data-log>
			<div class="min-w-fit">
				<div class="pb-2" data-checks>
					<div class="text-muted pb-0.5">checks</div>
					<div
						v-for="check in shownChecks"
						:key="check.name"
						class="whitespace-pre pl-4"
						:class="check.pass ? 'text-positive' : 'text-negative'">
						{{ checkLine(check) }}
					</div>
					<div
						v-for="(warning, i) in report.warnings"
						:key="`w${i}`"
						class="whitespace-pre pl-4 text-warning">
						⚠ {{ warning }}
					</div>
				</div>

				<div v-if="!issuesOnly" data-plan>
					<button
						type="button"
						class="touch-target min-h-6 pointer-coarse:min-h-11 text-left text-muted hover:text-white cursor-pointer"
						:aria-expanded="planOpen"
						@click="planOpen = !planOpen">
						{{ planOpen ? "▾" : "▸" }} plan · {{ planStatus }}
					</button>
					<pre v-if="planOpen" class="pl-4 pb-1 whitespace-pre">{{
						planJSON
					}}</pre>
				</div>

				<div
					v-for="section in sections"
					:key="section.phase"
					:data-phase="section.phase">
					<button
						type="button"
						class="touch-target min-h-6 pointer-coarse:min-h-11 text-left text-muted hover:text-white cursor-pointer disabled:cursor-default disabled:hover:text-muted"
						:aria-expanded="sectionOpen(section.phase)"
						:disabled="searching"
						@click="toggleSection(section.phase)">
						{{ sectionOpen(section.phase) ? "▾" : "▸" }}
						{{ section.phase }}
						({{ section.lines.length }})
					</button>
					<template v-if="sectionOpen(section.phase)">
						<div
							v-for="line in section.lines"
							:key="line.entry.id"
							data-line
							class="whitespace-pre py-px"
							:class="
								line.entry.level === 'warn'
									? 'text-warning'
									: ''
							"
							:style="{
								paddingLeft: `${1 + line.depth * 1.25}rem`,
							}">
							<div class="flex flex-row gap-2">
								<button
									v-if="line.group"
									type="button"
									class="touch-target min-h-6 pointer-coarse:min-h-11 cursor-pointer hover:text-white"
									:aria-expanded="!groupCollapsed(line.entry)"
									@click="toggleGroup(line.entry)">
									{{ groupCollapsed(line.entry) ? "▸" : "▾" }}
									{{ line.entry.label }}
								</button>
								<span v-else>
									{{ line.entry.level === "warn" ? "⚠ " : ""
									}}{{ line.entry.label }}
								</span>
								<span
									v-if="line.entry.value !== undefined"
									aria-hidden="true"
									class="flex-1 min-w-4 border-b border-dotted border-white/15 mb-1" />
								<span v-if="line.entry.value !== undefined">
									{{ formatTraceValue(line.entry.value) }}
									{{ line.entry.unit }}
								</span>
							</div>
							<div
								v-if="
									line.filled || line.extra || line.entry.note
								"
								class="text-muted pl-4">
								<span v-if="line.filled"
									>= {{ line.filled }}</span
								>
								<span v-if="line.filled && line.extra">
									·
								</span>
								<span v-if="line.extra">{{ line.extra }}</span>
								<span v-if="line.entry.note">
									{{ line.filled || line.extra ? " · " : ""
									}}{{ line.entry.note }}
								</span>
							</div>
						</div>
					</template>
				</div>
				<div v-if="run && !sections.length" class="text-muted pl-4">
					No steps match.
				</div>
			</div>
		</div>
	</section>
</template>
