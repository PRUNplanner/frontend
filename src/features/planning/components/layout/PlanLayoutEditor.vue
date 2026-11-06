<script setup lang="ts">
	import {
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
		PHONE_PREVIEW,
		PREVIEW_WIDTHS,
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
	} from "@/features/planning/layout/planLayout.constants";
	import { OPENABLE } from "@/features/planning/layout/elements";

	// Components
	import PlanGrid from "@/features/planning/components/layout/PlanGrid.vue";
	import PlanLayoutElementsPanel from "@/features/planning/components/layout/PlanLayoutElementsPanel.vue";

	// UI
	import { PButton, PDropdown, PIcon, PSegmented } from "@/ui";
	import {
		AddSharp,
		DragIndicatorSharp,
		MoreHorizSharp,
		UnfoldMoreSharp,
		RemoveSharp,
		UndoSharp,
	} from "@vicons/material";

	/**
	 * Customise mode: the page's real content (not clickable) on the grid,
	 * each item's title row draggable, with a grip (arrows move,
	 * Shift+arrows resize, Enter opens its ⋯ menu), its size, its ⋯ menu and
	 * tabs that switch or drag out; a right edge, a bottom edge and a corner;
	 * the Elements panel beside it; the page scaled to fit, never covered
	 *
	 * @author jplacht
	 */
	const { pref, loggedIn } = defineProps<{
		pref: ReturnType<typeof usePlanLayoutPreference>;
		loggedIn: boolean;
	}>();
	// elements shown as on the page; the rest show all they can hide
	// (tiers, fields, buttons)
	const asOnPage = defineModel<ElementId[]>("asOnPage", {
		default: () => [],
	});
	function toggleOpen(el: ElementId): void {
		asOnPage.value = asOnPage.value.includes(el)
			? asOnPage.value.filter((e) => e !== el)
			: [...asOnPage.value, el];
	}

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
		refPreview,
		refPanel,
		refConfirmReplace,
		refAnnounce,
		refMenu,
		refFlash,
		drag,
		resize,
		landing,
		phone,
	} = editor;

	const gridWidth = computed(
		() => refPreview.value || rootWidth.value || 1280
	);
	// shown scaled to fit beside the panel, never wider than it is
	const zoom = computed(() =>
		stageWidth.value > 0
			? Math.min(1, stageWidth.value / gridWidth.value)
			: 1
	);

	const previewOptions = computed(() =>
		PREVIEW_WIDTHS.map((w) => ({
			value: w,
			label:
				w === 0
					? t("plan.layout.preview_full")
					: w === PHONE_PREVIEW
						? t("plan.layout.preview_phone")
						: String(w),
		}))
	);
	const gapOptions = GAPS.map((g) => ({ value: g, label: String(g) }));

	const pack = computed(() => gridRef.value?.pack);
	const autoCount = computed(
		() =>
			Object.values(pack.value?.items ?? {}).filter((p) => p.auto).length
	);
	const sticky = computed(
		() => (gridRef.value as unknown as { sticky?: boolean })?.sticky ?? true
	);

	// px of an item w columns wide, at this grid
	const widthPx = (w: number): number => {
		const p = pack.value;
		if (!p) return 0;
		return Math.round(w * p.page.colWidth + (w - 1) * draft.value.gap);
	};

	/** "7/12 · ≤ 480 px · in view · scrolls", or "auto 5/12 (yours 3)" */
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
		if (it.pin) parts.push(t("plan.layout.size_in_view"));
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
		if (r.kind !== "w")
			parts.push(
				p.content > r.h + 1
					? t("plan.layout.badge_scrolls", {
							h: r.h,
							content: p.content,
						})
					: t("plan.layout.size_px", { h: r.h })
			);
		if (r.atMin || r.wMin) parts.push(t("plan.layout.badge_min"));
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
	<div ref="root" class="relative" data-layout-editor @keydown.esc="onEsc">
		<!-- the bar: name, preview width, Elements, Undo, Reset, Cancel, Save -->
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
				v-model:value="refPreview"
				size="sm"
				:options="previewOptions"
				:label="t('plan.layout.preview')" />
			<PButton
				size="sm"
				:pressed="refPanel"
				data-elements-toggle
				@click="refPanel = !refPanel">
				{{ t("plan.layout.elements") }}
			</PButton>
			<PButton
				size="sm"
				type="ghost"
				:disabled="!history.length"
				data-undo
				@click="editor.undo('button')">
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
			<span class="text-xs text-muted">{{ t("plan.layout.hint") }}</span>
			<p
				v-if="autoCount && !phone"
				class="basis-full text-xs text-warning"
				data-auto-note>
				{{ t("plan.layout.auto_note", { n: autoCount }, autoCount) }}
			</p>
			<p
				v-if="!sticky"
				class="basis-full text-xs text-warning"
				data-band-note>
				{{ t("plan.layout.band_note") }}
			</p>
			<p
				v-if="phone"
				class="basis-full text-xs text-muted"
				data-phone-note>
				{{ t("plan.layout.phone_note") }}
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
						@tab="editor.setTab">
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
							<!-- the dragged item follows the pointer -->
							<div
								v-if="drag && drag.region === region"
								class="absolute z-30 rounded border border-link bg-surface/80 shadow-xl pointer-events-none px-2 py-1 text-sm font-medium text-white"
								:style="{
									transform: `translate(${drag.left}px, ${drag.top}px)`,
									width: `${widthPx(drag.w)}px`,
									height: `${(drag.id && p.items[drag.id]?.height) || 120}px`,
								}"
								data-ghost>
								{{
									drag.tabTo
										? t("plan.layout.drop_as_tab", {
												name: editor.label(drag.el),
											})
										: editor.label(drag.el)
								}}
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
										transform: `translate(${p.items[resize.id].left}px, ${p.items[resize.id].top}px)`,
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
								v-if="!phone"
								role="button"
								tabindex="0"
								class="flex items-center justify-center shrink-0 w-6 h-8 pointer-coarse:w-9 pointer-coarse:h-11 rounded-control text-muted hover:text-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-link"
								:aria-label="
									t('plan.layout.handle', {
										name: editor.title(item.els),
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
							<template v-if="!phone">
								<span
									:id="`size-${item.id}`"
									class="min-w-0 truncate text-xs text-muted"
									data-size>
									{{ sizeLabel(item, pack?.items[item.id]) }}
								</span>
								<PButton
									v-if="OPENABLE.includes(item.active)"
									size="sm"
									type="ghost"
									class="shrink-0"
									:pressed="!asOnPage.includes(item.active)"
									:aria-label="
										t('plan.layout.content_open_named', {
											name: editor.label(item.active),
										})
									"
									:title="t('plan.layout.content_open')"
									data-content-toggle
									@click="toggleOpen(item.active)">
									<template #icon
										><UnfoldMoreSharp
									/></template>
									<!-- the words only where the title keeps room -->
									<span
										class="hidden @min-[24rem]/item:inline">
										{{ t("plan.layout.content_open") }}
									</span>
								</PButton>
								<PDropdown
									:show="refMenu === item.id"
									:options="editor.menuOptions(item.id)"
									placement="bottom-end"
									@update:show="
										(v: boolean) =>
											(refMenu = v
												? item.id
												: refMenu === item.id
													? null
													: refMenu)
									"
									@select="
										(key: string) =>
											editor.onMenu(item.id, key)
									">
									<PButton
										size="sm"
										type="ghost"
										class="shrink-0 pointer-coarse:size-11"
										:aria-label="
											t('plan.layout.item_menu', {
												name: editor.title(item.els),
											})
										"
										data-item-menu>
										<template #icon
											><MoreHorizSharp
										/></template>
									</PButton>
								</PDropdown>
							</template>
						</template>

						<!-- edges and corner: a thin line on hover, a grip in
							the corner; the hit areas stay 22 px (36 on touch) -->
						<template #item="{ item }">
							<div
								v-if="!phone"
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
									v-if="drag?.tabTo === item.id"
									class="absolute inset-x-0 top-0 flex items-center justify-center h-10 pointer-coarse:h-11 px-2 rounded-t bg-surface ring-2 ring-inset ring-link text-sm font-medium text-link truncate"
									data-tab-target>
									{{
										t("plan.layout.drop_tab_target", {
											el: editor.label(drag.el),
											name: editor.title(item.els),
										})
									}}
								</div>
							</div>
						</template>
					</PlanGrid>
				</div>
			</div>
			<PlanLayoutElementsPanel
				v-if="refPanel"
				:layout="draft"
				:logged-in="loggedIn"
				:where="editor.where"
				@add="editor.add"
				@show="editor.show"
				@drag="(e: PointerEvent, el) => editor.startMove(e, { el })" />
		</div>
		<div class="sr-only" aria-live="polite" data-announce>
			{{ refAnnounce }}
		</div>
	</div>
</template>
