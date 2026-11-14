<script setup lang="ts">
	/**
	 * The glossary popover of an article's `[[term]]` links (a.help-term):
	 * hover or keyboard focus shows the term's short definition and a link
	 * to its glossary entry; on touch the first tap opens it instead of
	 * following the link. Listens on the article body, which is v-html.
	 *
	 * @author jplacht
	 */
	import { onBeforeUnmount, ref, type Ref, useId, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t, locale } = useI18n();

	// Components
	import PPopover from "@/ui/components/PPopover.vue";

	// Util
	import { glossaryTerm } from "@/features/help/helpGlossary";

	// Types & Interfaces
	import type { IGlossaryTerm } from "@/features/help/helpGlossary";

	const { root } = defineProps<{
		/** the article body holding the term links */
		root: HTMLElement | null;
	}>();

	const emit = defineEmits<{
		(e: "navigate"): void;
	}>();

	const OPEN_DELAY = 250;
	const CLOSE_DELAY = 200;

	const id = useId();
	const show = ref(false);
	const anchor: Ref<HTMLElement | undefined> = ref(undefined);
	const term: Ref<IGlossaryTerm | null> = ref(null);
	const panel: Ref<HTMLElement | null> = ref(null);

	let timer: ReturnType<typeof setTimeout> | undefined;
	const later = (fn: () => void, ms: number) => {
		clearTimeout(timer);
		timer = setTimeout(fn, ms);
	};

	const termOf = (target: EventTarget | null) =>
		(target as Element | null)?.closest?.<HTMLElement>("a.help-term") ??
		null;

	async function open(el: HTMLElement): Promise<void> {
		clearTimeout(timer);
		const found = await glossaryTerm(el.dataset.term ?? "", locale.value);
		if (!found) return;
		anchor.value?.removeAttribute("aria-describedby");
		term.value = found;
		anchor.value = el;
		el.setAttribute("aria-describedby", id);
		show.value = true;
	}

	function close(): void {
		clearTimeout(timer);
		show.value = false;
	}

	watch(show, (open) => {
		if (!open) anchor.value?.removeAttribute("aria-describedby");
	});

	const keep = () => clearTimeout(timer);
	const leave = () => later(close, CLOSE_DELAY);
	const inPanel = (node: EventTarget | null) =>
		!!node && !!panel.value?.contains(node as Node);

	function onOver(e: Event): void {
		const el = termOf(e.target);
		if (el) later(() => void open(el), show.value ? 0 : OPEN_DELAY);
	}
	function onOut(e: Event): void {
		const to = (e as MouseEvent).relatedTarget;
		if (termOf(e.target) && !inPanel(to) && termOf(to) !== anchor.value)
			later(close, CLOSE_DELAY);
	}
	function onFocusIn(e: Event): void {
		const el = termOf(e.target);
		if (el) void open(el);
	}
	function onFocusOut(e: Event): void {
		const to = (e as FocusEvent).relatedTarget;
		if (!inPanel(to) && termOf(to) !== anchor.value) close();
	}
	// touch: the first tap shows the definition, a second one follows it
	function onClick(e: Event): void {
		const el = termOf(e.target);
		if (!el || !window.matchMedia?.("(pointer: coarse)").matches) return;
		if (show.value && anchor.value === el) return;
		e.preventDefault();
		e.stopPropagation();
		void open(el);
	}

	const listeners: [string, (e: Event) => void, boolean][] = [
		["mouseover", onOver, false],
		["mouseout", onOut, false],
		["focusin", onFocusIn, false],
		["focusout", onFocusOut, false],
		["click", onClick, true],
	];
	watch(
		() => root,
		(el, old) => {
			for (const [type, fn, capture] of listeners) {
				old?.removeEventListener(type, fn, capture);
				el?.addEventListener(type, fn, capture);
			}
		},
		{ immediate: true }
	);
	onBeforeUnmount(() => {
		clearTimeout(timer);
		for (const [type, fn, capture] of listeners)
			root?.removeEventListener(type, fn, capture);
	});
</script>

<template>
	<PPopover
		v-model:show="show"
		trigger="manual"
		placement="bottom-start"
		:anchor="anchor"
		panel-class="w-[300px] max-w-[calc(100vw-2rem)] px-3.5 py-3"
		@clickoutside="close">
		<div
			:id="id"
			ref="panel"
			role="tooltip"
			class="flex flex-col gap-1.5 text-sm leading-normal"
			data-testid="help-term-popover"
			@mouseenter="keep"
			@mouseleave="leave"
			@focusout="onFocusOut">
			<span
				class="text-[11px] font-medium uppercase tracking-wider text-muted">
				{{ t("help.term.eyebrow") }}
			</span>
			<strong class="text-ink-strong">{{ term?.title }}</strong>
			<p class="text-ink">{{ term?.definition }}</p>
			<RouterLink
				:to="`/help/glossary#${term?.id}`"
				class="text-link-primary hover:underline"
				@click="
					close();
					emit('navigate');
				">
				{{ t("help.term.open") }}
			</RouterLink>
		</div>
	</PPopover>
</template>
