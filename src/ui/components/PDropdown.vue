<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		nextTick,
		ref,
		type Ref,
		useId,
		useTemplateRef,
		watch,
	} from "vue";
	import type { Placement } from "@popperjs/core";

	// Types & Interfaces
	import type { PDropdownButton, PDropdownOption } from "@/ui/ui.types";

	// UI
	import PIcon from "@/ui/components/PIcon.vue";
	import PPopover from "@/ui/components/PPopover.vue";
	import { CheckSharp } from "@vicons/material";

	type Item = Exclude<PDropdownOption, { type: string }>;
	type Row = Extract<PDropdownOption, { type: "buttons" }>;
	// what the keyboard and the pointer move through: items and row buttons
	type Nav = { o: Item; row?: never } | { o: PDropdownButton; row: Row };

	const show = defineModel<boolean>("show", { default: false });

	const {
		options,
		trigger = "click",
		placement = "bottom",
		anchor = undefined,
	} = defineProps<{
		options: PDropdownOption[];
		/** hover also opens on click and on keyboard focus */
		trigger?: "click" | "hover" | "manual";
		placement?: Placement;
		/** positions at this element instead of the default slot */
		anchor?: HTMLElement;
	}>();

	const emit = defineEmits<{
		(e: "select", key: string): void;
	}>();

	const id = useId();
	const menu: Ref<HTMLElement | null> = ref(null);
	const popover = useTemplateRef<InstanceType<typeof PPopover>>("popover");
	const trig = useTemplateRef<HTMLElement>("trig");
	// keyboard or hover highlight, -1 for none (also after a click)
	const active: Ref<number> = ref(-1);

	const nav: ComputedRef<Nav[]> = computed(() =>
		options.flatMap((o): Nav[] =>
			!("type" in o)
				? [{ o }]
				: o.type === "buttons"
					? o.buttons.map((b) => ({ o: b, row: o }))
					: []
		)
	);
	const at = (o: Item | PDropdownButton): number =>
		nav.value.findIndex((n) => n.o === o);
	// an icon or a check: the column for them
	const withIcon: ComputedRef<boolean> = computed(() =>
		options.some(
			(o) => !("type" in o) && (o.icon || o.checked !== undefined)
		)
	);
	// a row's heading names the hovered button, or says why it's off
	function rowNote(row: Row): string {
		const n = nav.value[active.value];
		return n?.row === row ? (n.o.hint ?? n.o.label) : row.label;
	}

	/*
	 * Opens to the side with room for the whole menu, the asked one first;
	 * with room on neither, to the larger one, scrolling inside
	 */
	const side: Ref<Placement> = ref(placement);
	const maxH: Ref<number | null> = ref(null);
	function reference(): Element | null {
		if (anchor) return anchor;
		let el = trig.value?.firstElementChild ?? null;
		while (el?.classList.contains("contents")) el = el.firstElementChild;
		return el;
	}
	function fit(): void {
		const [base, align] = placement.split("-");
		const refEl = reference();
		if (!menu.value || !refEl || (base !== "bottom" && base !== "top"))
			return;
		const r = refEl.getBoundingClientRect();
		// the 6 px offset and 8 px from the window's edge
		const room = {
			bottom: window.innerHeight - r.bottom - 14,
			top: r.top - 14,
		};
		const other = base === "bottom" ? "top" : "bottom";
		// the panel's border
		const need = menu.value.scrollHeight + 2;
		let s: "top" | "bottom" = base;
		if (need > room[base])
			s = need <= room[other] || room[other] > room[base] ? other : base;
		maxH.value = need > room[s] ? Math.max(room[s], 120) : null;
		side.value = (align ? `${s}-${align}` : s) as Placement;
	}
	watch(
		() => placement,
		(p) => (side.value = p)
	);
	watch(
		() => options,
		() => {
			if (show.value)
				nextTick(() => {
					fit();
					// its trigger may have moved with the change
					requestAnimationFrame(() => popover.value?.update());
				});
		}
	);

	let focusMenu = true;
	// focus returning to the trigger on close must not reopen a hover menu
	let closing = false;
	function open(first: number, focus: boolean): void {
		active.value = first;
		focusMenu = focus;
		show.value = true;
	}

	// after the layer noted the trigger as the place to return focus to
	watch(show, (value) => {
		if (!value) {
			active.value = -1;
			maxH.value = null;
			side.value = placement;
			closing = true;
			nextTick(() => (closing = false));
		} else {
			const focus = focusMenu;
			nextTick(() => {
				fit();
				if (focus) menu.value?.focus();
			});
		}
		focusMenu = true;
	});

	function select(n: Nav | undefined): void {
		// a disabled item says why in its hint and stays open
		if (!n || n.o.disabled) return;
		// a row's buttons are steps: the menu stays for the next one
		if (!n.row) show.value = false;
		emit("select", n.o.key);
	}

	function onTriggerKeydown(e: KeyboardEvent): void {
		if (e.key !== "ArrowDown") return;
		e.preventDefault();
		// a hover or focus may have opened it already
		if (!show.value) return open(0, true);
		if (active.value < 0) active.value = 0;
		menu.value?.focus();
	}

	function onMenuKeydown(e: KeyboardEvent): void {
		const n = nav.value.length;
		const next = () => (active.value + 1) % n;
		const prev = () => (active.value <= 0 ? n - 1 : active.value - 1);
		const moves: Record<string, () => number> = {
			ArrowDown: next,
			ArrowUp: prev,
			ArrowRight: next,
			ArrowLeft: prev,
			Home: () => 0,
			End: () => n - 1,
		};
		if (moves[e.key]) {
			e.preventDefault();
			active.value = moves[e.key]();
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			select(nav.value[active.value]);
		} else if (e.key === "Tab") show.value = false;
	}

	// hover: closes a moment after the pointer left trigger and menu
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;
	function onEnter(): void {
		if (trigger !== "hover") return;
		clearTimeout(leaveTimer);
		if (!show.value) open(-1, false);
	}
	function onLeave(): void {
		if (trigger !== "hover") return;
		leaveTimer = setTimeout(() => (show.value = false), 100);
	}
	function onTriggerOpen(): void {
		if (trigger === "hover" && !show.value && !closing) open(-1, false);
	}
	function onTriggerFocusout(e: FocusEvent): void {
		if (
			trigger === "hover" &&
			!menu.value?.contains(e.relatedTarget as Node | null)
		)
			show.value = false;
	}
</script>

<template>
	<PPopover
		ref="popover"
		v-model:show="show"
		:trigger="trigger === 'click' ? 'click' : 'manual'"
		:placement="side"
		:anchor="anchor"
		panel-class="text-sm"
		@clickoutside="show = false">
		<template v-if="$slots.default" #trigger>
			<span
				ref="trig"
				class="contents"
				@keydown="onTriggerKeydown"
				@mouseover="onEnter"
				@mouseout="onLeave"
				@click="onTriggerOpen"
				@focusin="onTriggerOpen"
				@focusout="onTriggerFocusout">
				<slot />
			</span>
		</template>
		<div
			ref="menu"
			role="menu"
			tabindex="-1"
			class="py-1 max-h-[calc(100dvh-2rem)] overflow-y-auto outline-none"
			:style="maxH ? { maxHeight: `${maxH}px` } : undefined"
			:aria-activedescendant="active >= 0 ? `${id}-${active}` : undefined"
			@keydown="onMenuKeydown"
			@mousedown.prevent
			@mouseenter="onEnter"
			@mouseleave="
				active = -1;
				onLeave();
			">
			<template v-for="(o, i) in options" :key="'key' in o ? o.key : i">
				<div
					v-if="'type' in o && o.type === 'divider'"
					role="separator"
					class="h-px my-1 bg-line-strong" />
				<div
					v-else-if="'type' in o && o.type === 'buttons'"
					role="group"
					:aria-label="o.label"
					class="px-3.5 pt-2 pb-1.5">
					<div
						class="max-w-72 min-h-4 text-xs leading-4 font-medium text-muted-strong"
						aria-hidden="true">
						{{ rowNote(o) }}
					</div>
					<div class="flex gap-1 mt-1.5">
						<div
							v-for="b in o.buttons"
							:id="`${id}-${at(b)}`"
							:key="b.key"
							:role="
								b.checked === undefined
									? 'menuitem'
									: 'menuitemradio'
							"
							:aria-checked="
								b.checked === undefined ? undefined : b.checked
							"
							:aria-disabled="b.disabled || undefined"
							:aria-label="
								b.hint ? `${b.label}. ${b.hint}` : b.label
							"
							:data-key="b.key"
							class="touch-target flex items-center justify-center min-w-8 h-8 px-1.5 rounded-control"
							:class="[
								b.checked
									? 'bg-selected text-ink-strong ring-1 ring-inset ring-line-strong'
									: 'ring-1 ring-inset ring-line',
								b.disabled
									? 'text-muted cursor-default'
									: 'text-ink cursor-pointer',
								active === at(b) && !b.checked
									? 'bg-hover'
									: '',
							]"
							@mouseenter="active = at(b)"
							@click="select(nav[at(b)])">
							<PIcon v-if="b.icon" :size="18">
								<component :is="b.icon" />
							</PIcon>
							<span v-else class="text-xs whitespace-nowrap">
								{{ b.text ?? b.label }}
							</span>
						</div>
					</div>
				</div>
				<div
					v-else-if="'type' in o"
					role="presentation"
					class="px-3.5 pt-2 pb-1 text-xs font-medium text-muted-strong whitespace-nowrap">
					{{ o.label }}
				</div>
				<div
					v-else
					:id="`${id}-${at(o)}`"
					:role="
						o.checked === undefined
							? 'menuitem'
							: 'menuitemcheckbox'
					"
					:aria-checked="
						o.checked === undefined ? undefined : o.checked
					"
					:aria-disabled="o.disabled || undefined"
					:title="o.tip"
					class="touch-target flex leading-[34px] before:absolute before:inset-y-0 before:inset-x-1 before:rounded-control"
					:class="[
						o.hint ? '' : 'h-[34px]',
						o.disabled
							? 'text-muted cursor-default'
							: o.danger
								? 'text-negative cursor-pointer'
								: 'text-ink cursor-pointer',
						active === at(o) ? 'before:bg-hover' : '',
					]"
					@mouseenter="active = at(o)"
					@click="select(nav[at(o)])">
					<span
						class="relative flex justify-center shrink-0"
						:class="withIcon ? 'w-9' : 'w-3.5'">
						<span v-if="o.icon" class="flex items-center h-[34px]">
							<PIcon><component :is="o.icon" /></PIcon>
						</span>
						<span
							v-else-if="o.checked"
							class="flex items-center h-[34px]"
							aria-hidden="true">
							<PIcon><CheckSharp /></PIcon>
						</span>
					</span>
					<span
						v-if="o.hint"
						class="relative flex-1 flex flex-col pb-2">
						<span class="whitespace-nowrap">{{ o.label }}</span>
						<span class="max-w-72 text-xs leading-4 text-muted">
							{{ o.hint }}
						</span>
					</span>
					<span v-else class="relative flex-1 whitespace-nowrap">
						{{ o.label }}
					</span>
					<span class="w-4 shrink-0" />
				</div>
			</template>
		</div>
	</PPopover>
</template>
