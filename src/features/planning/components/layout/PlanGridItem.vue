<script setup lang="ts">
	import {
		computed,
		type CSSProperties,
		inject,
		onBeforeUnmount,
		onMounted,
		ref,
		useTemplateRef,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";

	// Types & Interfaces
	import type {
		ElementId,
		GridItem,
		IPackedItem,
	} from "@/features/planning/layout/planLayout.types";
	import type { IBesideSplit } from "@/features/planning/layout/planGrid.util";

	// Util
	import { ELEMENTS, isKpiItem } from "@/features/planning/layout/elements";
	import { elementView } from "@/features/planning/layout/elementComponents";
	import {
		besideSplit,
		gridMeasureKey,
	} from "@/features/planning/layout/planGrid.util";
	import { partnerOf, tabEls, tabsOf } from "@/features/planning/layout/tabs";

	// Components
	import PlanToolTabs from "@/features/planning/components/PlanToolTabs.vue";

	// UI
	import { PIcon, PTag } from "@/ui";
	import { ExpandMoreSharp } from "@vicons/material";

	/**
	 * One box of the plan grid: a title row with its tabs and the fold
	 * chevron (not on a results tile; customising, every item has one and
	 * the editor's controls sit in it), and the element's body, which
	 * scrolls when the box is lower than its content
	 *
	 * @author jplacht
	 */
	const {
		item,
		pos,
		active,
		folded = false,
		editing = false,
		follow = null,
		summary = "",
		fresh = false,
		gap = 16,
	} = defineProps<{
		item: GridItem;
		pos: IPackedItem;
		active: ElementId;
		folded?: boolean;
		editing?: boolean;
		// sticks this far from the window's top, sliding at most this far
		follow?: { top: number; slide: number } | null;
		// what the part says after its title while folded
		summary?: string;
		// new to the layout this session: tagged "New" after its title
		fresh?: boolean;
		// the grid's gap: a pair beside each other splits where columns meet
		gap?: number;
	}>();

	const emit = defineEmits<{
		(e: "fold", value: boolean): void;
		(e: "tab", el: ElementId): void;
		// customising: the line between a tab's two pressed, by the second
		(e: "split", el: ElementId, ev: PointerEvent): void;
	}>();

	const { flagCount } = usePlanView();

	const kpi = computed(() => isKpiItem(item));
	const label = (el: ElementId): string => t(ELEMENTS[el].label);
	// its tabs, each with the element shown with it, if any
	const hosts = computed(() => tabsOf(item));
	const partners = computed(
		() =>
			Object.fromEntries(
				hosts.value.map((h) => [h, partnerOf(item, h)])
			) as Partial<Record<ElementId, ElementId>>
	);
	/**
	 * Where a tab's two split, side by side: the first part's width, from
	 * its columns or shared by their minimums; null when it's below, or the
	 * box is too narrow for both (then they stack)
	 */
	const besideOf = (host: ElementId): IBesideSplit | null => {
		const partner = partners.value[host];
		if (!partner || item.join?.[partner] !== "beside") return null;
		return besideSplit(
			pos.width,
			pos.w,
			gap,
			item.joinSize?.[partner],
			ELEMENTS[host].minW,
			ELEMENTS[partner].minW
		);
	};
	/**
	 * How a tab lays out its two: side by side ("row") where it is beside
	 * and the box fits both minimums, else below each other ("col"); one
	 * element: nothing
	 */
	const layoutOf = (host: ElementId): "row" | "col" | undefined => {
		if (!partners.value[host]) return undefined;
		return besideOf(host) ? "row" : "col";
	};
	/**
	 * A part's size in its tab: beside, the first one's width (the second
	 * takes the rest); below, the first one's height when set, scrolling
	 * inside when its content is taller
	 */
	function partStyle(host: ElementId, el: ElementId): CSSProperties {
		const split = besideOf(host);
		if (split)
			return el === host
				? { flex: `0 0 ${split.px}px` }
				: { flex: "1 1 0" };
		const h = item.joinSize?.[partners.value[host]!];
		return el === host && h ? { height: `${h}px`, overflowY: "auto" } : {};
	}
	/** A tab's name: "Material I/O & Material I/O totals" for two */
	const tabLabel = (host: ElementId): string =>
		partners.value[host]
			? t("plan.layout.pair", {
					a: label(host),
					b: label(partners.value[host]!),
				})
			: label(host);
	const tabs = computed(() =>
		hosts.value.map((el) => ({
			key: el,
			label: tabLabel(el),
			dot:
				tabEls(item, el).includes("plan-check") && flagCount.value > 0
					? t(
							"plan.layout.flags",
							{ n: flagCount.value },
							flagCount.value
						)
					: undefined,
		}))
	);

	// a tab mounts when first shown and stays, so its state survives
	const mounted = ref<Set<ElementId>>(new Set([active]));
	watch(
		() => active,
		(el) => mounted.value.add(el)
	);

	// the grid measures the title row and the content's natural height
	const register = inject(gridMeasureKey, undefined);
	const head = useTemplateRef<HTMLElement>("head");
	const inner = useTemplateRef<HTMLElement>("inner");
	let unregister: (() => void) | undefined;
	onMounted(() => {
		unregister = register?.(
			item.id,
			[head.value, inner.value].filter((e): e is HTMLElement => !!e)
		);
	});
	onBeforeUnmount(() => unregister?.());
</script>

<template>
	<!-- following while scrolling: a track from its place down the room it
		may slide, the box sticks in it; otherwise no box of its own -->
	<div
		:class="follow ? 'absolute pointer-events-none' : 'contents'"
		:style="
			follow
				? {
						left: `${pos.left}px`,
						top: `${pos.top}px`,
						width: `${pos.width}px`,
						height: `${pos.height + follow.slide}px`,
					}
				: undefined
		"
		:data-follow="follow ? item.id : undefined">
		<!-- a group, not a landmark: twenty of them would crowd the page's
		landmarks, and two share a name (the Workforce part and tile);
		customising, parts slide to where a change puts them -->
		<div
			role="group"
			class="@container/item flex flex-col rounded border border-line bg-(--app-bg) in-data-tinted:[--app-bg:var(--color-surface)] outline-none focus-visible:ring-2 focus-visible:ring-link"
			:class="[
				follow ? 'sticky pointer-events-auto' : 'absolute top-0 left-0',
				editing
					? 'motion-safe:transition-[transform,width,height] motion-safe:duration-150 ease-out'
					: '',
			]"
			:style="{
				...(follow
					? { top: `${follow.top}px` }
					: { transform: `translate(${pos.left}px, ${pos.top}px)` }),
				width: `${pos.width}px`,
				height: `${pos.height}px`,
			}"
			:aria-label="tabLabel(active)"
			tabindex="-1"
			:data-item="item.id"
			:data-folded="folded || undefined"
			:data-auto="pos.auto || undefined">
			<!-- every item but a lone results tile; customising, that too: the editor
			puts its grip, size and menu here, the tabs stay clickable -->
			<div
				v-if="!kpi || editing || hosts.length > 1"
				ref="head"
				class="flex items-center gap-1 shrink-0 min-h-10 pointer-coarse:min-h-11 pr-1"
				:class="[
					// folded or open, the row stays put: no jump of the title
					folded
						? 'border-b border-transparent'
						: 'border-b border-line',
					editing ? 'pl-1 cursor-grab touch-none' : 'pl-3',
				]"
				:data-item-head="editing ? item.id : undefined">
				<slot name="lead" />
				<PlanToolTabs
					v-if="hosts.length > 1 && !folded"
					class="flex-1 min-w-0"
					:tabs="tabs"
					:active="active"
					:label="
						t('plan.layout.tabs_of', { name: label(item.els[0]) })
					"
					@toggle="(el: ElementId) => emit('tab', el)" />
				<h2
					v-else
					class="min-w-0 truncate font-bold text-white"
					:class="[
						editing ? 'text-sm' : '',
						folded && summary ? 'shrink-0 max-w-2/3' : 'flex-1',
					]">
					{{ tabLabel(active) }}
				</h2>
				<PTag
					v-if="fresh"
					size="sm"
					class="shrink-0"
					:value="t('plan.layout.new_tag')"
					data-fresh />
				<!-- folded, where the part stands: "COGC Metallurgy · 3 permits" -->
				<span
					v-if="folded && summary"
					class="flex-1 min-w-0 truncate pl-1 text-xs text-muted tabular-nums"
					:title="summary"
					data-fold-summary>
					{{ summary }}
				</span>
				<slot name="actions" />
				<!-- the fold chevron at the right end: down to unfold, up to
				fold, as an accordion reads -->
				<button
					v-if="!kpi && !editing"
					type="button"
					class="flex items-center justify-center shrink-0 size-8 pointer-coarse:size-11 rounded-control text-muted-strong hover:bg-hover hover:text-ink-strong cursor-pointer"
					:aria-expanded="folded ? 'false' : 'true'"
					:aria-label="
						t(folded ? 'plan.layout.unfold' : 'plan.layout.fold', {
							name: label(item.els[0]),
						})
					"
					data-fold
					@click="emit('fold', !folded)">
					<PIcon
						:size="18"
						class="transition-transform"
						:class="folded ? '' : 'rotate-180'">
						<ExpandMoreSharp />
					</PIcon>
				</button>
			</div>
			<!-- the element lays out for this width; content taller than the
			box scrolls here; otherwise nothing is clipped, so the hit areas of
			controls near the edge keep their 44 px on touch -->
			<div
				v-show="!folded"
				class="@container flex-1 min-h-0"
				:class="
					pos.scroll
						? 'overflow-y-auto overflow-x-hidden'
						: 'overflow-visible'
				"
				data-body>
				<div ref="inner" :class="kpi ? '' : 'py-3'">
					<!-- a tab: its element, or two with a line between them,
					below each other or beside (where the box fits both
					minimums; otherwise below), split as set; each adapts to
					its own width. Customising, the parts can't be used, the
					line between them can be dragged. -->
					<template v-for="host in hosts" :key="host">
						<div
							v-if="mounted.has(host)"
							v-show="host === active"
							:class="
								layoutOf(host) === 'row'
									? 'flex [&>*+*]:border-l [&>*+*]:border-line'
									: layoutOf(host) === 'col'
										? 'flex flex-col gap-3 [&>*+*]:pt-3 [&>*+*]:border-t [&>*+*]:border-line'
										: ''
							"
							:data-tab-body="host"
							:data-pair="layoutOf(host)">
							<div
								v-for="el in tabEls(item, host)"
								:key="el"
								class="@container relative min-w-0"
								:style="partStyle(host, el)"
								:data-element="el">
								<div
									class="contents"
									:inert="editing || undefined">
									<component
										:is="elementView(el).component"
										v-bind="elementView(el).props" />
								</div>
								<!-- on the line before the second part: a
								wide grip, the line lit while over it -->
								<div
									v-if="
										editing &&
										el !== host &&
										(layoutOf(host) === 'row' ||
											item.join?.[el] === 'below')
									"
									class="group/split absolute z-10 flex touch-none"
									:class="
										layoutOf(host) === 'row'
											? '-left-2 inset-y-0 w-4 justify-center cursor-col-resize'
											: '-top-2 inset-x-0 h-4 flex-col justify-center cursor-row-resize'
									"
									aria-hidden="true"
									:data-split="el"
									@pointerdown="
										(ev: PointerEvent) =>
											emit('split', el, ev)
									">
									<span
										class="rounded-full bg-link opacity-0 transition-opacity group-hover/split:opacity-100"
										:class="
											layoutOf(host) === 'row'
												? 'w-0.5 h-full'
												: 'h-0.5 w-full'
										" />
								</div>
							</div>
						</div>
					</template>
				</div>
			</div>
			<slot name="overlay" />
		</div>
	</div>
</template>
