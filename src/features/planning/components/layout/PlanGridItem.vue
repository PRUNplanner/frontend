<script setup lang="ts">
	import {
		computed,
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

	// Util
	import { ELEMENTS, isKpiItem } from "@/features/planning/layout/elements";
	import { elementView } from "@/features/planning/layout/elementComponents";
	import { gridMeasureKey } from "@/features/planning/layout/planGrid.util";

	// Components
	import PlanToolTabs from "@/features/planning/components/PlanToolTabs.vue";

	// UI
	import { PIcon } from "@/ui";
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
	} = defineProps<{
		item: GridItem;
		pos: IPackedItem;
		active: ElementId;
		folded?: boolean;
		editing?: boolean;
		// sticks this far from the window's top, sliding at most this far
		follow?: { top: number; slide: number } | null;
	}>();

	const emit = defineEmits<{
		(e: "fold", value: boolean): void;
		(e: "tab", el: ElementId): void;
	}>();

	const { flagCount } = usePlanView();

	const kpi = computed(() => isKpiItem(item));
	const label = (el: ElementId): string => t(ELEMENTS[el].label);
	const tabs = computed(() =>
		item.els.map((el) => ({
			key: el,
			label: label(el),
			dot:
				el === "plan-check" && flagCount.value > 0
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
			class="@container/item flex flex-col rounded border border-line bg-(--app-bg) outline-none focus-visible:ring-2 focus-visible:ring-link"
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
			:aria-label="label(item.els.length > 1 ? active : item.els[0])"
			tabindex="-1"
			:data-item="item.id"
			:data-folded="folded || undefined"
			:data-auto="pos.auto || undefined">
			<!-- every item but a lone results tile; customising, that too: the editor
			puts its grip, size and menu here, the tabs stay clickable -->
			<div
				v-if="!kpi || editing || item.els.length > 1"
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
					v-if="item.els.length > 1 && !folded"
					class="flex-1 min-w-0"
					:tabs="tabs"
					:active="active"
					:label="
						t('plan.layout.tabs_of', { name: label(item.els[0]) })
					"
					@toggle="(el: ElementId) => emit('tab', el)" />
				<h2
					v-else
					class="flex-1 min-w-0 truncate font-bold text-white"
					:class="editing ? 'text-sm' : ''">
					{{ label(item.els.length > 1 ? active : item.els[0]) }}
				</h2>
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
				:inert="editing || undefined"
				data-body>
				<div ref="inner" :class="kpi ? '' : 'py-3'">
					<template v-for="el in item.els" :key="el">
						<div
							v-if="mounted.has(el)"
							v-show="el === active"
							:data-element="el">
							<component
								:is="elementView(el).component"
								v-bind="elementView(el).props" />
						</div>
					</template>
				</div>
			</div>
			<slot name="overlay" />
		</div>
	</div>
</template>
