<script setup lang="ts" generic="T extends string">
	import {
		computed,
		nextTick,
		onBeforeUnmount,
		onMounted,
		ref,
		watch,
	} from "vue";

	/**
	 * One view at a time: a tab strip, where clicking the open tab closes
	 * it again. A dot marks a tab with something to look at. When the tabs
	 * don't fit, the strip scrolls (wheel or swipe), fades at the cut edge and keeps the
	 * active tab in view.
	 */
	const props = defineProps<{
		tabs: { key: T; label: string; dot?: string }[];
		active: T | null;
		label: string;
	}>();

	const emit = defineEmits<{
		(e: "toggle", key: T): void;
	}>();

	const nav = ref<HTMLElement | null>(null);
	const fade = ref({ left: false, right: false });

	function measure(): void {
		const el = nav.value;
		if (!el) return;
		fade.value = {
			left: el.scrollLeft > 1,
			right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
		};
	}

	function showActive(): void {
		nav.value
			?.querySelector('[aria-pressed="true"]')
			?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
	}

	// no scrollbar: a mouse wheel scrolls the strip sideways instead
	function onWheel(event: WheelEvent): void {
		const el = nav.value;
		if (!el || el.scrollWidth <= el.clientWidth) return;
		if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
		el.scrollLeft += event.deltaY;
		event.preventDefault();
	}

	let resize: ResizeObserver | undefined;
	onMounted(() => {
		measure();
		showActive();
		if (typeof ResizeObserver === "undefined" || !nav.value) return;
		resize = new ResizeObserver(measure);
		resize.observe(nav.value);
	});
	onBeforeUnmount(() => resize?.disconnect());

	watch(
		() => props.active,
		() => nextTick(showActive)
	);

	const MASK = {
		left: "linear-gradient(to right, transparent, black 2rem)",
		right: "linear-gradient(to left, transparent, black 2rem)",
		both: "linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent)",
	};
	// which edge hides tabs
	const cut = computed(() =>
		fade.value.left && fade.value.right
			? "both"
			: fade.value.left
				? "left"
				: fade.value.right
					? "right"
					: undefined
	);
</script>

<template>
	<nav
		ref="nav"
		:aria-label="label"
		class="flex min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-x-1 @max-[64rem]:gap-x-0"
		:style="{ maskImage: cut ? MASK[cut] : undefined }"
		:data-fade="cut"
		@scroll.passive="measure"
		@wheel="onWheel">
		<button
			v-for="tab in tabs"
			:key="tab.key"
			type="button"
			:aria-pressed="active === tab.key ? 'true' : 'false'"
			class="flex items-center gap-1.5 h-10 pointer-coarse:h-11 px-2.5 @max-[64rem]:px-2 border-b-2 cursor-pointer text-nowrap hover:text-white"
			:class="
				active === tab.key
					? 'border-prunplanner text-white font-medium'
					: 'border-transparent text-muted-strong'
			"
			@click="emit('toggle', tab.key)">
			{{ tab.label }}
			<span
				v-if="tab.dot"
				role="img"
				:aria-label="tab.dot"
				class="size-1.5 rounded-full bg-warning" />
		</button>
	</nav>
</template>
