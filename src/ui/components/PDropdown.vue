<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		nextTick,
		ref,
		type Ref,
		useId,
		watch,
	} from "vue";
	import type { Placement } from "@popperjs/core";

	// Types & Interfaces
	import type { PDropdownOption } from "@/ui/ui.types";

	// UI
	import PIcon from "@/ui/components/PIcon.vue";
	import PPopover from "@/ui/components/PPopover.vue";

	type Item = Exclude<PDropdownOption, { type: "divider" }>;

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
	// keyboard or hover highlight, -1 for none (also after a click)
	const active: Ref<number> = ref(-1);

	const items: ComputedRef<Item[]> = computed(() =>
		options.filter((o): o is Item => !("type" in o))
	);
	const withIcon: ComputedRef<boolean> = computed(() =>
		items.value.some((i) => i.icon)
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
			closing = true;
			nextTick(() => (closing = false));
		} else if (focusMenu) nextTick(() => menu.value?.focus());
		focusMenu = true;
	});

	function select(key: string): void {
		show.value = false;
		emit("select", key);
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
		const n = items.value.length;
		const moves: Record<string, () => number> = {
			ArrowDown: () => (active.value + 1) % n,
			ArrowUp: () => (active.value <= 0 ? n - 1 : active.value - 1),
			Home: () => 0,
			End: () => n - 1,
		};
		if (moves[e.key]) {
			e.preventDefault();
			active.value = moves[e.key]();
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			const item = items.value[active.value];
			if (item) select(item.key);
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
		v-model:show="show"
		:trigger="trigger === 'click' ? 'click' : 'manual'"
		:placement="placement"
		:anchor="anchor"
		panel-class="text-sm"
		@clickoutside="show = false">
		<template v-if="$slots.default" #trigger>
			<span
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
			class="py-1 outline-none"
			:aria-activedescendant="
				active >= 0 ? `${id}-${active}` : undefined
			"
			@keydown="onMenuKeydown"
			@mousedown.prevent
			@mouseenter="onEnter"
			@mouseleave="
				active = -1;
				onLeave();
			">
			<template v-for="(o, i) in options" :key="'type' in o ? i : o.key">
				<div
					v-if="'type' in o"
					role="separator"
					class="h-px my-1 bg-line-strong" />
				<div
					v-else
					:id="`${id}-${items.indexOf(o)}`"
					role="menuitem"
					class="touch-target flex cursor-pointer leading-[34px] before:absolute before:inset-y-0 before:inset-x-1 before:rounded-control"
					:class="[
						o.hint ? '' : 'h-[34px]',
						o.danger ? 'text-negative' : 'text-ink',
						active === items.indexOf(o) ? 'before:bg-hover' : '',
					]"
					@mouseenter="active = items.indexOf(o)"
					@click="select(o.key)">
					<span
						class="relative flex justify-center shrink-0"
						:class="withIcon ? 'w-9' : 'w-3.5'">
						<span v-if="o.icon" class="flex items-center h-[34px]">
							<PIcon><component :is="o.icon" /></PIcon>
						</span>
					</span>
					<span v-if="o.hint" class="relative flex-1 flex flex-col pb-2">
						<span class="whitespace-nowrap">{{ o.label }}</span>
						<span class="text-xs leading-4 text-muted">
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
