<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		onMounted,
		provide,
		ref,
		shallowRef,
		useTemplateRef,
		watch,
	} from "vue";

	// Types & Interfaces
	import type {
		ElementId,
		GridItem,
		GridLayout,
		IPackResult,
	} from "@/features/planning/layout/planLayout.types";

	// Util
	import {
		packLayout,
		isFolded,
	} from "@/features/planning/layout/packLayout";
	import {
		followStacks,
		gridMeasureKey,
	} from "@/features/planning/layout/planGrid.util";
	import {
		BAND_STICKY_SHARE,
		PHONE_WIDTH,
	} from "@/features/planning/layout/planLayout.constants";
	import { hostOf, tabEls } from "@/features/planning/layout/tabs";

	// Components
	import PlanGridItem from "@/features/planning/components/layout/PlanGridItem.vue";

	/**
	 * The plan page's grid: the kept-in-view band (sticky over the page, cut
	 * where it would cover more than 40 % of the window and the page needs
	 * the room; then it scrolls inside) above the page, every item placed by
	 * packLayout from its measured content
	 *
	 * @author jplacht
	 */
	const {
		layout,
		folded,
		tabs = {},
		summaries = {},
		fresh = [],
		width = undefined,
		editing = false,
	} = defineProps<{
		layout: GridLayout;
		folded: ElementId[];
		// the tab each item shows, when it isn't the stored one
		tabs?: Record<string, ElementId>;
		// what a folded part says after its title, per element
		summaries?: Partial<Record<ElementId, string>>;
		// elements new to the layout this session: tagged "New"
		fresh?: ElementId[];
		// a preview width instead of the page's
		width?: number;
		editing?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "fold", el: ElementId, value: boolean): void;
		(e: "tab", item: string, el: ElementId): void;
		// customising: the line between a tab's two pressed
		(e: "split", item: string, el: ElementId, ev: PointerEvent): void;
		// the page's grid is a phone's (below 760 px) or not: which
		// arrangement it shows
		(e: "phone", value: boolean): void;
	}>();

	defineSlots<{
		// the editor's handles over an item
		item(props: { item: GridItem }): unknown;
		// the editor's grip before an item's title, its size and menu after
		lead(props: { item: GridItem }): unknown;
		actions(props: { item: GridItem }): unknown;
		// the editor's guides and drop boxes in a region
		region(props: { region: "band" | "page"; pack: IPackResult }): unknown;
	}>();

	/*
	 * Measuring: the grid's width, and each item's natural content height,
	 * from one ResizeObserver; updates land once per animation frame
	 */
	const root = useTemplateRef<HTMLElement>("root");
	const pageWidth = ref(0);
	const content = shallowRef<Record<string, number>>({});
	const viewportHeight = ref(window.innerHeight);

	const owners = new Map<Element, string>();
	const parts = new Map<string, HTMLElement[]>();
	let dirty = new Set<string>();
	let frame = 0;

	function flush(): void {
		frame = 0;
		const next = { ...content.value };
		let changed = false;
		for (const id of dirty) {
			const els = parts.get(id);
			if (!els) continue;
			const h = els.reduce((s, e) => s + e.offsetHeight, 0);
			// folded or hidden: keep the last height
			if (h <= 0) continue;
			const total = Math.ceil(h + 2);
			if (Math.abs((next[id] ?? 0) - total) > 1) {
				next[id] = total;
				changed = true;
			}
		}
		dirty = new Set();
		if (root.value) pageWidth.value = root.value.clientWidth;
		if (changed) content.value = next;
	}
	function schedule(): void {
		if (!frame) frame = requestAnimationFrame(flush);
	}

	const observer =
		typeof ResizeObserver === "undefined"
			? undefined
			: new ResizeObserver((entries) => {
					for (const e of entries) {
						const id = owners.get(e.target);
						if (id) dirty.add(id);
					}
					schedule();
				});

	provide(gridMeasureKey, (id, els) => {
		parts.set(id, els);
		for (const el of els) {
			owners.set(el, id);
			observer?.observe(el);
		}
		dirty.add(id);
		schedule();
		return () => {
			for (const el of els) {
				owners.delete(el);
				observer?.unobserve(el);
			}
			if (parts.get(id) === els) parts.delete(id);
		};
	});

	const onResize = () => {
		viewportHeight.value = window.innerHeight;
		schedule();
	};
	onMounted(() => {
		// the root always renders
		pageWidth.value = root.value!.clientWidth;
		observer?.observe(root.value!);
		window.addEventListener("resize", onResize);
	});
	onBeforeUnmount(() => {
		observer?.disconnect();
		window.removeEventListener("resize", onResize);
		if (frame) cancelAnimationFrame(frame);
	});

	const gridWidth = computed(() => width ?? (pageWidth.value || 1280));
	// the page's own grid (not a preview) tells which arrangement fits it
	watch(
		() =>
			width || !pageWidth.value ? null : pageWidth.value < PHONE_WIDTH,
		(phone) => phone !== null && emit("phone", phone),
		{ immediate: true }
	);
	const isFresh = (it: GridItem): boolean =>
		it.els.some((e) => fresh.includes(e));
	const foldedSet = computed(() => new Set(folded));
	const pack = computed(() =>
		packLayout(layout, gridWidth.value, content.value, folded)
	);
	const band = computed(() => layout.items.filter((i) => i.pin));
	const page = computed(() => layout.items.filter((i) => !i.pin));
	// the band stays in view over the page; with nothing on the page it
	// is the page
	const sticky = computed(() => page.value.length > 0);
	// a band taller than 40 % of the window, or than the room a short page
	// leaves, is cut there and scrolls inside: never blank space below it
	const bandMax = computed(() =>
		Math.floor(
			Math.max(
				viewportHeight.value * BAND_STICKY_SHARE,
				viewportHeight.value - pack.value.page.height - layout.gap
			)
		)
	);
	const capped = computed(
		() => sticky.value && pack.value.band.height > bandMax.value
	);

	// parts that follow while scrolling stick just below the band (or the
	// window's top); never while customising
	const follows = computed(() =>
		editing ? new Map() : followStacks(page.value, pack.value, layout.gap)
	);
	const followTop = computed(
		() =>
			(band.value.length && sticky.value
				? (capped.value ? bandMax.value : pack.value.band.height) +
					layout.gap
				: 0) + layout.gap
	);
	const followOf = (id: string) => {
		const f = follows.value.get(id);
		return f ? { top: followTop.value + f.offset, slide: f.slide } : null;
	};

	// a tab picked on the page, while the item still has it (a layout
	// switched or saved since may have moved it elsewhere)
	const shownTab = (it: GridItem): ElementId =>
		tabs[it.id] && it.els.includes(tabs[it.id])
			? hostOf(it, tabs[it.id])
			: it.active;
	// folded, what its tab says: both lines when it shows two
	const summaryOf = (it: GridItem): string =>
		tabEls(it, shownTab(it))
			.map((el) => summaries[el])
			.filter(Boolean)
			.join(" · ");

	defineExpose({ pack, gridWidth, capped, content });
</script>

<template>
	<div
		ref="root"
		:style="width ? { width: `${width}px` } : undefined"
		data-plan-grid>
		<div
			v-if="band.length"
			class="z-900 bg-(--app-bg)"
			:class="sticky ? 'sticky top-0' : ''"
			:style="{ paddingBottom: `${layout.gap}px` }"
			data-region="band"
			:data-capped="capped || undefined">
			<!-- cut: scrolls inside, fading out at the bottom -->
			<div
				:class="
					capped
						? 'overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.5rem),transparent)]'
						: ''
				"
				:style="capped ? { maxHeight: `${bandMax}px` } : undefined"
				data-band-scroll>
				<div
					class="relative"
					:style="{ height: `${pack.band.height}px` }"
					data-grid="band">
					<slot name="region" region="band" :pack="pack" />
					<PlanGridItem
						v-for="it in band"
						:key="it.id"
						:item="it"
						:pos="pack.items[it.id]"
						:active="shownTab(it)"
						:folded="isFolded(it, foldedSet)"
						:summary="summaryOf(it)"
						:fresh="isFresh(it)"
						:editing="editing"
						:gap="layout.gap"
						@fold="(v: boolean) => emit('fold', it.els[0], v)"
						@tab="(el: ElementId) => emit('tab', it.id, el)"
						@split="
							(el: ElementId, ev: PointerEvent) =>
								emit('split', it.id, el, ev)
						">
						<template #lead
							><slot name="lead" :item="it"
						/></template>
						<template #actions
							><slot name="actions" :item="it"
						/></template>
						<template #overlay
							><slot name="item" :item="it"
						/></template>
					</PlanGridItem>
				</div>
			</div>
		</div>
		<div
			class="relative"
			:style="{ height: `${pack.page.height}px` }"
			data-region="page"
			data-grid="page">
			<slot name="region" region="page" :pack="pack" />
			<PlanGridItem
				v-for="it in page"
				:key="it.id"
				:item="it"
				:pos="pack.items[it.id]"
				:active="shownTab(it)"
				:folded="isFolded(it, foldedSet)"
				:summary="summaryOf(it)"
				:fresh="isFresh(it)"
				:editing="editing"
				:gap="layout.gap"
				:follow="followOf(it.id)"
				@fold="(v: boolean) => emit('fold', it.els[0], v)"
				@tab="(el: ElementId) => emit('tab', it.id, el)"
				@split="
					(el: ElementId, ev: PointerEvent) =>
						emit('split', it.id, el, ev)
				">
				<template #lead><slot name="lead" :item="it" /></template>
				<template #actions><slot name="actions" :item="it" /></template>
				<template #overlay><slot name="item" :item="it" /></template>
			</PlanGridItem>
		</div>
	</div>
</template>
