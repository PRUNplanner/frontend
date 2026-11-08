<script setup lang="ts">
	import {
		type Component,
		computed,
		onBeforeUnmount,
		onMounted,
		ref,
		useTemplateRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import {
		providePlanView,
		usePlanView,
	} from "@/features/planning/usePlanView";
	import {
		usePlanLayoutEditor,
		type IEditorGrid,
	} from "@/features/planning/layout/usePlanLayoutEditor";

	// Types & Interfaces
	import type {
		ElementId,
		GridItem,
		IPackedItem,
	} from "@/features/planning/layout/planLayout.types";
	import type { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";

	// Util
	import {
		COLS_MAX,
		COLS_MIN,
		GAPS,
		PHONE_EDIT_WIDTH,
	} from "@/features/planning/layout/planLayout.constants";

	// Components
	import PlanGrid from "@/features/planning/components/layout/PlanGrid.vue";
	import PlanLayoutElementsPanel from "@/features/planning/components/layout/PlanLayoutElementsPanel.vue";

	// UI
	import { PButton, PCheckbox, PDropdown, PIcon, PSegmented } from "@/ui";
	import {
		AddSharp,
		DragIndicatorSharp,
		MoreHorizSharp,
		MoveDownSharp,
		PushPinSharp,
		TableRowsSharp,
		UnfoldMoreSharp,
		RemoveSharp,
		UndoSharp,
		VisibilityOffSharp,
	} from "@vicons/material";

	/**
	 * Customise mode: the page's real content (not clickable) on the grid,
	 * each item's title row draggable, with a grip (arrows move,
	 * Shift+arrows resize, Enter opens its ⋯ menu), its size, a hide button, its ⋯
	 * menu and tabs that switch or drag out; both side edges, the bottom edge
	 * and a corner;
	 * the Elements panel beside it; the page scaled to fit, never covered
	 *
	 * @author jplacht
	 */
	const { pref, loggedIn } = defineProps<{
		pref: ReturnType<typeof usePlanLayoutPreference>;
		loggedIn: boolean;
	}>();

	// a press on a title row: a tab drags out of its group, the rest of the
	// row moves the item; its buttons stay buttons
	function onGridPointerDown(e: PointerEvent): void {
		const target = e.target as HTMLElement;
		const head = target.closest<HTMLElement>("[data-item-head]");
		if (!head) return;
		const tab = target.closest<HTMLElement>("[data-tab]");
		if (tab && head.contains(tab))
			return editor.startMove(e, { el: tab.dataset.tab as ElementId });
		if (target.closest("button, a, input, select")) return;
		editor.startMove(e, { id: head.dataset.itemHead! });
	}
	const emit = defineEmits<{ (e: "close"): void }>();

	const root = useTemplateRef<HTMLElement>("root");
	const stage = useTemplateRef<HTMLElement>("stage");
	const gridRef = useTemplateRef<IEditorGrid>("grid");

	// the page's own width, and what is left beside the Elements panel
	const rootWidth = ref(0);
	const stageWidth = ref(0);
	function measure(): void {
		rootWidth.value = root.value?.clientWidth ?? 0;
		stageWidth.value = stage.value?.clientWidth ?? 0;
	}
	let observer: ResizeObserver | undefined;
	onMounted(() => {
		measure();
		if (typeof ResizeObserver === "undefined") return;
		observer = new ResizeObserver(measure);
		if (root.value) observer.observe(root.value);
		if (stage.value) observer.observe(stage.value);
	});
	onBeforeUnmount(() => observer?.disconnect());

	const editor = usePlanLayoutEditor(pref, {
		loggedIn: () => loggedIn,
		grid: () => gridRef.value,
		zoom: () => zoom.value,
		root: () => root.value,
		close: () => emit("close"),
	});
	const {
		draft,
		shown,
		history,
		startFrom,
		refArrangement,
		refPanel,
		refConfirmReplace,
		refAnnounce,
		refMenu,
		refFlash,
		drag,
		resize,
		landing,
		hideDrop,
		phone,
		phoneAuto,
		unusedCount,
		narrower,
	} = editor;

	// the dragged box: its name, or what a drop on a title bar does
	const dragText = computed(() => {
		const d = drag.value;
		if (!d) return "";
		const target = d.tabTo
			? editor.draft.value.items.find((i) => i.id === d.tabTo)
			: undefined;
		if (!target) return editor.label(d.el);
		if (d.join)
			return t(`plan.layout.drop_join_${d.join}`, {
				el: editor.label(d.el),
				name: editor.label(target.active),
			});
		return t("plan.layout.drop_as_tab", { name: editor.label(d.el) });
	});

	// the elements show everything open and as tables as the draft says,
	// here only
	const planView = usePlanView();
	providePlanView({
		...planView,
		layoutEditing: {
			...planView.layoutEditing,
			showAll: (el: ElementId) => !!draft.value.open?.includes(el),
			table: (el: ElementId) => !!draft.value.table?.includes(el),
		},
	});

	// Phone is edited at a phone's width, Wide at the page's
	const gridWidth = computed(() =>
		phone.value ? PHONE_EDIT_WIDTH : rootWidth.value || 1280
	);
	// shown scaled to fit beside the panel, never wider than it is
	const zoom = computed(() =>
		stageWidth.value > 0
			? Math.min(1, stageWidth.value / gridWidth.value)
			: 1
	);

	const arrangementOptions = computed(() =>
		(["wide", "phone"] as const).map((a) => ({
			value: a,
			label: t(`plan.layout.arrangement.${a}`),
		}))
	);
	const gapOptions = GAPS.map((g) => ({ value: g, label: String(g) }));

	const pack = computed(() => gridRef.value?.pack);
	const autoCount = computed(
		() =>
			Object.values(pack.value?.items ?? {}).filter((p) => p.auto).length
	);
	const capped = computed(
		() =>
			(gridRef.value as unknown as { capped?: boolean })?.capped ?? false
	);

	// px of an item w columns wide, at this grid
	const widthPx = (w: number): number => {
		const p = pack.value;
		if (!p) return 0;
		return Math.round(w * p.page.colWidth + (w - 1) * draft.value.gap);
	};

	/** What is set on an item, shown as icons after its size */
	function states(it: GridItem): { key: string; icon: Component }[] {
		const g = draft.value;
		return [
			{ key: "pinned", icon: PushPinSharp, on: it.pin },
			{ key: "follows", icon: MoveDownSharp, on: !!it.follow },
			{
				key: "open",
				icon: UnfoldMoreSharp,
				on: !!g.open?.includes(it.active),
			},
			{
				key: "table",
				icon: TableRowsSharp,
				on: !!g.table?.includes(it.active),
			},
		].filter((s) => s.on);
	}

	/** "7/12 · ≤ 480 px · scrolls", or "auto 5/12 (yours 3)" */
	function sizeLabel(it: GridItem, pos: IPackedItem | undefined): string {
		const cols = draft.value.cols;
		const parts = [
			!pos?.auto
				? `${it.w}/${cols}`
				: pos.w === it.w
					? t("plan.layout.size_moved", { n: pos.w, cols })
					: t("plan.layout.size_auto", { n: pos.w, cols, w: it.w }),
		];
		if (it.hm === "cap") parts.push(t("plan.layout.size_cap", { h: it.h }));
		if (it.hm === "fixed")
			parts.push(t("plan.layout.size_px", { h: it.h }));
		if (pos?.scroll) parts.push(t("plan.layout.size_scrolls"));
		return parts.join(" · ");
	}

	const resizeBadge = computed(() => {
		const r = resize.value;
		const p = r ? pack.value?.items[r.id] : undefined;
		if (!r || !p) return "";
		const parts = [
			t("plan.layout.badge_cols", { n: r.w, cols: draft.value.cols }),
			t("plan.layout.size_px", { h: widthPx(r.w) }),
		];
		if (r.kind === "h" || r.kind === "wh")
			parts.push(
				p.content > r.h + 1
					? t("plan.layout.badge_scrolls", {
							h: r.h,
							content: p.content,
						})
					: t("plan.layout.size_px", { h: r.h })
			);
		if (r.atMin || r.wMin) parts.push(t("plan.layout.badge_min"));
		if (r.by) parts.push(t("plan.layout.badge_neighbour", { name: r.by }));
		return parts.join(" · ");
	});

	function onEsc(e: KeyboardEvent): void {
		// an open menu closes itself first
		if (refMenu.value || e.defaultPrevented) return;
		void editor.requestCancel();
	}

	defineExpose({ undo: editor.undo });
</script>

<template>
	<div
		ref="root"
		class="relative"
		data-layout-editor
		:data-tinted="pref.tinted.value || undefined"
		@keydown.esc="onEsc">
		<!-- the bar: name, Wide / Phone, Elements, Undo, Reset, Cancel, Save -->
		<div
			class="sticky top-0 z-1001 flex flex-wrap items-center gap-x-3 gap-y-2 mb-2 px-3 py-2 rounded border border-line bg-surface"
			data-editor-bar>
			<div class="flex flex-col min-w-0">
				<span class="font-bold text-white">
					{{ t("plan.layout.presets.custom.name") }}
				</span>
				<span class="flex gap-1.5 text-xs text-muted">
					<span v-if="startFrom">
						{{
							t("plan.layout.starting_from", {
								name: t(
									`plan.layout.presets.${startFrom}.name`
								),
							})
						}}
					</span>
					<span v-if="zoom < 1" data-zoom>
						{{
							t("plan.layout.shown_at", {
								n: Math.round(zoom * 100),
							})
						}}
					</span>
				</span>
			</div>
			<span class="flex-1" />
			<PSegmented
				:value="refArrangement"
				size="sm"
				:options="arrangementOptions"
				:label="t('plan.layout.arrangement.label')"
				data-arrangement
				@update:value="editor.setArrangement" />
			<PButton
				size="sm"
				:pressed="refPanel"
				data-elements-toggle
				@click="refPanel = !refPanel">
				{{
					unusedCount
						? t("plan.layout.elements_count", { n: unusedCount })
						: t("plan.layout.elements")
				}}
			</PButton>
			<PButton
				size="sm"
				type="ghost"
				:disabled="!history.length"
				data-undo
				@click="editor.undo()">
				<template #icon><UndoSharp /></template>
				{{ t("plan.layout.undo") }}
			</PButton>
			<PButton size="sm" type="ghost" data-reset @click="editor.reset">
				{{ t("plan.layout.reset") }}
			</PButton>
			<PButton
				size="sm"
				type="secondary"
				data-cancel
				@click="editor.requestCancel">
				{{ t("common.buttons.cancel") }}
			</PButton>
			<PButton size="sm" type="primary" data-save @click="editor.save()">
				{{ t("plan.layout.save") }}
			</PButton>
			<!-- the layout changed in another tab or device meanwhile -->
			<div
				v-if="pref.changedElsewhere.value"
				role="alertdialog"
				:aria-label="t('plan.layout.elsewhere.note')"
				class="basis-full flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-line text-sm"
				data-elsewhere>
				<span>{{ t("plan.layout.elsewhere.note") }}</span>
				<PButton
					size="sm"
					type="secondary"
					data-elsewhere-keep
					@click="editor.keepElsewhere">
					{{ t("plan.layout.keep_editing") }}
				</PButton>
				<PButton
					size="sm"
					type="primary"
					data-elsewhere-load
					@click="editor.loadElsewhere">
					{{ t("plan.layout.elsewhere.load") }}
				</PButton>
			</div>
			<!-- saving a preset's copy over an existing Custom Layout -->
			<div
				v-if="refConfirmReplace"
				role="alertdialog"
				:aria-label="t('plan.layout.replace_question')"
				class="basis-full flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-line text-sm"
				data-replace>
				<span>{{ t("plan.layout.replace_question") }}</span>
				<PButton
					size="sm"
					type="secondary"
					@click="refConfirmReplace = false">
					{{ t("plan.layout.keep_editing") }}
				</PButton>
				<PButton size="sm" type="primary" @click="editor.save(true)">
					{{ t("plan.layout.replace") }}
				</PButton>
			</div>
		</div>

		<!-- the grid: columns, gap -->
		<div
			class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-sm"
			data-grid-bar>
			<div
				v-if="!phone"
				class="flex items-center gap-1"
				role="group"
				:aria-label="t('plan.layout.columns')">
				<span class="pr-1 text-muted-strong">
					{{ t("plan.layout.columns") }}
				</span>
				<PButton
					size="sm"
					type="secondary"
					:disabled="draft.cols <= COLS_MIN"
					:aria-label="t('plan.layout.fewer_columns')"
					data-cols-minus
					@click="editor.setCols(draft.cols - 1)">
					<template #icon><RemoveSharp /></template>
				</PButton>
				<span class="w-6 text-center tabular-nums" data-cols>
					{{ draft.cols }}
				</span>
				<PButton
					size="sm"
					type="secondary"
					:disabled="draft.cols >= COLS_MAX"
					:aria-label="t('plan.layout.more_columns')"
					data-cols-plus
					@click="editor.setCols(draft.cols + 1)">
					<template #icon><AddSharp /></template>
				</PButton>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-muted-strong">{{
					t("plan.layout.gap")
				}}</span>
				<PSegmented
					:value="draft.gap"
					size="sm"
					:options="gapOptions"
					:label="t('plan.layout.gap')"
					@update:value="(g: number) => editor.setGap(g)" />
			</div>
			<span
				class="text-muted-strong"
				:title="t('plan.layout.tint.description')"
				data-tint>
				<PCheckbox
					:checked="pref.tinted.value"
					size="sm"
					@update:checked="(v?: boolean) => editor.setTinted(!!v)">
					{{ t("plan.layout.tint.name") }}
				</PCheckbox>
			</span>
			<span class="text-xs text-muted">{{ t("plan.layout.hint") }}</span>
			<p
				v-if="autoCount && !phone"
				class="basis-full text-xs text-warning"
				data-auto-note>
				{{ t("plan.layout.auto_note", { n: autoCount }, autoCount) }}
			</p>
			<p
				v-if="capped"
				class="basis-full text-xs text-warning"
				data-band-note>
				{{ t("plan.layout.band_note") }}
			</p>
			<p
				v-if="narrower.length"
				class="basis-full text-xs text-muted"
				data-narrower-note>
				{{
					t("plan.layout.narrower_note", {
						list: narrower
							.map((r) => t("plan.layout.narrower_at", r, r.n))
							.join(", "),
					})
				}}
			</p>
			<p
				v-if="phoneAuto"
				class="basis-full text-xs text-muted"
				data-phone-note>
				{{ t("plan.layout.phone_auto") }}
			</p>
			<p
				v-else-if="phone"
				class="basis-full flex flex-wrap items-center gap-2 text-xs text-muted"
				data-phone-note>
				{{ t("plan.layout.phone_own") }}
				<PButton
					size="sm"
					type="ghost"
					data-back-to-auto
					@click="editor.backToAuto">
					{{ t("plan.layout.back_to_auto") }}
				</PButton>
			</p>
		</div>

		<div class="flex items-start gap-4">
			<div ref="stage" class="flex-1 min-w-0 overflow-hidden">
				<div
					:style="{ zoom }"
					class="select-none"
					@pointerdown="onGridPointerDown">
					<PlanGrid
						ref="grid"
						:layout="shown"
						:folded="[]"
						:width="gridWidth"
						editing
						@tab="editor.setTab"
						@split="editor.startSplit">
						<template #region="{ region, pack: p }">
							<!-- column guides behind the items -->
							<div
								class="absolute inset-0 flex pointer-events-none"
								:style="{ gap: `${draft.gap}px` }"
								aria-hidden="true">
								<div
									v-for="c in draft.cols"
									:key="c"
									class="flex-1 bg-white/3 rounded-sm" />
							</div>
							<!-- where a dragged item lands -->
							<div
								v-if="landing && landing.region === region"
								class="absolute z-20 border-2 border-dashed border-link rounded pointer-events-none flex items-start justify-end p-1 text-xs text-link"
								:style="{
									transform: `translate(${landing.left}px, ${landing.top}px)`,
									width: `${landing.width}px`,
									height: `${landing.height}px`,
								}"
								data-landing>
								{{ t("plan.layout.lands_here") }}
							</div>
							<!-- the dragged item follows the pointer; over a title bar
							only a label below it, so the drop zones stay in view -->
							<div
								v-if="drag && drag.region === region"
								class="absolute z-30 rounded border border-link bg-surface/80 shadow-xl pointer-events-none px-2 py-1 text-sm font-medium text-white"
								:class="
									drag.tabTo ? 'w-max max-w-80 truncate' : ''
								"
								:style="
									drag.tabTo
										? {
												transform: `translate(${drag.pointer.x + 12}px, ${drag.pointer.y + 24}px)`,
											}
										: {
												transform: `translate(${drag.left}px, ${drag.top}px)`,
												width: `${widthPx(drag.w)}px`,
												height: `${(drag.id && p.items[drag.id]?.height) || 120}px`,
											}
								"
								data-ghost>
								{{ dragText }}
							</div>
							<div
								v-if="drag?.snap && drag.region === region"
								class="absolute inset-x-0 z-30 h-0 border-t-2 border-warning pointer-events-none"
								:style="{ top: `${drag.snap.value}px` }"
								data-snap-line>
								<span
									class="absolute right-0 -top-6 px-1.5 rounded bg-warning text-xs text-black">
									{{ editor.snapText(drag.snap) }}
								</span>
							</div>
							<!-- the outline of a resize, its badge and snap line -->
							<template
								v-if="
									resize &&
									p.items[resize.id]?.region === region
								">
								<div
									class="absolute z-30 rounded border-2 border-link pointer-events-none"
									:style="{
										transform: `translate(${p.items[resize.id].left - resize.shift}px, ${p.items[resize.id].top}px)`,
										width: `${widthPx(resize.w)}px`,
										height: `${resize.h}px`,
									}"
									data-resize-outline>
									<span
										class="absolute left-1 bottom-1 px-1.5 py-0.5 rounded bg-link text-xs text-black whitespace-nowrap"
										data-resize-badge>
										{{ resizeBadge }}
									</span>
								</div>
								<template v-if="resize.snap">
									<div
										class="absolute inset-x-0 z-30 h-0 border-t-2 border-warning pointer-events-none"
										:style="{
											top: `${p.items[resize.id].top + resize.h}px`,
										}"
										data-snap-line>
										<span
											class="absolute right-0 -top-6 px-1.5 rounded bg-warning text-xs text-black">
											{{ editor.snapText(resize.snap) }}
										</span>
									</div>
									<div
										v-if="
											resize.snap.ref &&
											p.items[resize.snap.ref]
										"
										class="absolute z-20 rounded border-2 border-warning pointer-events-none"
										:style="{
											transform: `translate(${p.items[resize.snap.ref].left}px, ${p.items[resize.snap.ref].top}px)`,
											width: `${p.items[resize.snap.ref].width}px`,
											height: `${p.items[resize.snap.ref].height}px`,
										}"
										data-snap-ref />
								</template>
							</template>
						</template>

						<!-- the grip: drag, or arrows and Enter -->
						<template #lead="{ item }">
							<span
								role="button"
								tabindex="0"
								class="flex items-center justify-center shrink-0 w-6 h-8 pointer-coarse:w-9 pointer-coarse:h-11 rounded-control text-muted hover:text-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-link"
								:aria-label="
									t('plan.layout.handle', {
										name: editor.title(item),
									})
								"
								:aria-describedby="`size-${item.id}`"
								:data-handle="item.id"
								@keydown="
									(e: KeyboardEvent) =>
										editor.onHandleKey(e, item.id)
								">
								<PIcon :size="16"><DragIndicatorSharp /></PIcon>
							</span>
						</template>
						<template #actions="{ item }">
							<!-- the size, then what is set: icons, not words -->
							<span
								:id="`size-${item.id}`"
								class="flex items-center gap-1.5 min-w-0 text-xs text-muted">
								<span class="truncate" data-size>
									{{ sizeLabel(item, pack?.items[item.id]) }}
								</span>
								<PIcon
									v-for="st in states(item)"
									:key="st.key"
									:size="14"
									role="img"
									class="shrink-0"
									:aria-label="
										t(`plan.layout.state.${st.key}`)
									"
									:title="t(`plan.layout.state.${st.key}`)"
									:data-state="st.key">
									<component :is="st.icon" />
								</PIcon>
							</span>
							<PButton
								v-if="editor.hideTarget(item)"
								size="sm"
								type="ghost"
								class="shrink-0 pointer-coarse:size-11"
								:aria-label="
									t('plan.layout.hide_named', {
										name: editor.tabLabel(
											item,
											editor.hideTarget(item)!
										),
									})
								"
								:title="
									t('plan.layout.hide_named', {
										name: editor.tabLabel(
											item,
											editor.hideTarget(item)!
										),
									})
								"
								data-item-hide
								@click="editor.hideNow(item.id)">
								<template #icon
									><VisibilityOffSharp
								/></template>
							</PButton>
							<PDropdown
								:show="refMenu === item.id"
								:options="editor.menuOptions(item.id)"
								placement="bottom-end"
								@update:show="
									(v: boolean) =>
										editor.setMenu(
											v
												? item.id
												: refMenu === item.id
													? null
													: refMenu
										)
								"
								@select="
									(key: string) => editor.onMenu(item.id, key)
								">
								<PButton
									size="sm"
									type="ghost"
									class="shrink-0 pointer-coarse:size-11"
									:aria-label="
										t('plan.layout.item_menu', {
											name: editor.title(item),
										})
									"
									data-item-menu>
									<template #icon
										><MoreHorizSharp
									/></template>
								</PButton>
							</PDropdown>
						</template>

						<!-- edges and corner: a thin line on hover, a grip in
							the corner; the hit areas stay 22 px (36 on touch) -->
						<template #item="{ item }">
							<div
								class="absolute inset-0 z-10 pointer-events-none rounded"
								:class="[
									refFlash === item.id
										? 'ring-2 ring-warning'
										: '',
									drag?.id === item.id ? 'opacity-40' : '',
								]">
								<div
									class="group pointer-events-auto absolute top-10 pointer-coarse:top-11 right-0 bottom-0 w-[22px] pointer-coarse:w-9 cursor-ew-resize touch-none"
									data-edge="w"
									@pointerdown="
										(e: PointerEvent) =>
											editor.startResize(e, item.id, 'w')
									">
									<span
										class="absolute right-0.5 top-2 bottom-6 w-0.5 rounded-full bg-link opacity-0 group-hover:opacity-100" />
								</div>
								<div
									class="group pointer-events-auto absolute top-10 pointer-coarse:top-11 left-0 bottom-[22px] pointer-coarse:bottom-9 w-[22px] pointer-coarse:w-9 cursor-ew-resize touch-none"
									data-edge="l"
									@pointerdown="
										(e: PointerEvent) =>
											editor.startResize(e, item.id, 'l')
									">
									<span
										class="absolute left-0.5 top-2 bottom-2 w-0.5 rounded-full bg-link opacity-0 group-hover:opacity-100" />
								</div>
								<div
									class="group pointer-events-auto absolute left-0 right-0 bottom-0 h-[22px] pointer-coarse:h-9 cursor-ns-resize touch-none"
									data-edge="h"
									@pointerdown="
										(e: PointerEvent) =>
											editor.startResize(e, item.id, 'h')
									">
									<span
										class="absolute bottom-0.5 left-2 right-6 h-0.5 rounded-full bg-link opacity-0 group-hover:opacity-100" />
								</div>
								<div
									class="pointer-events-auto absolute right-0 bottom-0 flex items-end justify-end size-[22px] pointer-coarse:size-9 p-1 cursor-nwse-resize touch-none text-muted hover:text-link"
									data-edge="wh"
									@pointerdown="
										(e: PointerEvent) =>
											editor.startResize(e, item.id, 'wh')
									">
									<svg
										viewBox="0 0 10 10"
										class="size-2.5"
										aria-hidden="true">
										<path
											d="M9 1 1 9M9 5 5 9"
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
											stroke-linecap="round" />
									</svg>
								</div>
								<!-- a drop here makes the dragged element a tab -->
								<div
									v-if="
										drag?.tabTo === item.id &&
										!drag.joinable
									"
									class="absolute inset-x-0 top-0 flex items-center justify-center h-10 pointer-coarse:h-11 px-2 rounded-t bg-surface ring-2 ring-inset ring-link text-sm font-medium text-link truncate"
									data-tab-target>
									{{
										t("plan.layout.drop_tab_target", {
											el: editor.label(drag.el),
											name: editor.title(item),
										})
									}}
								</div>
								<!-- or three: a tab, below or beside the tab it shows -->
								<div
									v-else-if="drag?.tabTo === item.id"
									class="absolute inset-x-0 top-0 grid grid-cols-3 h-10 pointer-coarse:h-11 rounded-t bg-surface ring-2 ring-inset ring-link text-sm font-medium text-muted-strong overflow-hidden"
									data-tab-target>
									<span
										v-for="zone in [
											'tab',
											'below',
											'beside',
										] as const"
										:key="zone"
										class="flex items-center justify-center px-1 truncate border-l border-line first:border-l-0"
										:class="
											(drag.join ?? 'tab') === zone
												? 'bg-link/15 text-link'
												: ''
										"
										:data-zone="zone">
										{{ t(`plan.layout.zone.${zone}`) }}
									</span>
								</div>
							</div>
						</template>
					</PlanGrid>
				</div>
			</div>
			<PlanLayoutElementsPanel
				v-if="refPanel"
				:layout="draft"
				:fresh="startFrom ? [] : pref.added.value"
				:logged-in="loggedIn"
				:where="editor.where"
				:drop="hideDrop"
				@add="editor.add"
				@show="editor.show"
				@drag="(e: PointerEvent, el) => editor.startMove(e, { el })" />
		</div>
		<div class="sr-only" aria-live="polite" data-announce>
			{{ refAnnounce }}
		</div>
	</div>
</template>
