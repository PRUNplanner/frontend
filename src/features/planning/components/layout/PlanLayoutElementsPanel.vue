<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		ElementId,
		GridLayout,
	} from "@/features/planning/layout/planLayout.types";
	import type { IElementMeta } from "@/features/planning/layout/elements";

	// Util
	import { ELEMENT_IDS, ELEMENTS } from "@/features/planning/layout/elements";

	// UI
	import { PButton, PIcon } from "@/ui";
	import { DragIndicatorSharp } from "@vicons/material";

	/**
	 * Customise mode's Elements panel, beside the page: every element with
	 * where it is; a hidden one is added (to the bottom) or dragged onto
	 * the page, a placed one shown
	 *
	 * @author jplacht
	 */
	const { layout, loggedIn, where } = defineProps<{
		layout: GridLayout;
		loggedIn: boolean;
		where: (el: ElementId) => string;
	}>();

	const emit = defineEmits<{
		(e: "add", el: ElementId): void;
		(e: "show", el: ElementId): void;
		(e: "drag", event: PointerEvent, el: ElementId): void;
	}>();

	const GROUPS: IElementMeta["group"][] = [
		"base",
		"production",
		"results",
		"kpis",
	];
	const groups = computed(() =>
		GROUPS.map((group) => ({
			group,
			els: ELEMENT_IDS.filter(
				(el) =>
					ELEMENTS[el].group === group &&
					(loggedIn || !ELEMENTS[el].loggedIn)
			).map((el) => ({
				el,
				placed: layout.items.some((i) => i.els.includes(el)),
			})),
		}))
	);
</script>

<template>
	<aside
		:aria-label="t('plan.layout.elements')"
		class="sticky top-16 shrink-0 w-72 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded border border-line bg-surface text-sm"
		data-elements-panel>
		<h2 class="px-3 pt-3 pb-1 font-bold text-white">
			{{ t("plan.layout.elements") }}
		</h2>
		<p class="px-3 pb-2 text-xs text-muted">
			{{ t("plan.layout.elements_hint") }}
		</p>
		<section v-for="g in groups" :key="g.group" class="pb-2">
			<h3
				class="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted">
				{{ t(`plan.layout.groups.${g.group}`) }}
			</h3>
			<ul>
				<li
					v-for="row in g.els"
					:key="row.el"
					class="flex items-center gap-2 min-h-11 px-2"
					:data-element-row="row.el"
					:data-placed="row.placed || undefined">
					<span
						v-if="!row.placed"
						class="flex items-center justify-center size-6 text-muted cursor-grab touch-none"
						:title="t('plan.layout.drag_onto_page')"
						data-drag
						@pointerdown="
							(e: PointerEvent) => emit('drag', e, row.el)
						">
						<PIcon :size="16"><DragIndicatorSharp /></PIcon>
					</span>
					<span v-else class="size-6" />
					<span class="flex-1 min-w-0">
						<span class="block text-ink-strong truncate">
							{{ t(ELEMENTS[row.el].label) }}
						</span>
						<span class="block text-xs text-muted truncate">
							{{ where(row.el) }}
						</span>
					</span>
					<PButton
						v-if="row.placed"
						size="sm"
						type="ghost"
						:aria-label="
							t('plan.layout.show_named', {
								name: t(ELEMENTS[row.el].label),
							})
						"
						@click="emit('show', row.el)">
						{{ t("plan.layout.show") }}
					</PButton>
					<PButton
						v-else
						size="sm"
						type="secondary"
						:aria-label="
							t('plan.layout.add_named', {
								name: t(ELEMENTS[row.el].label),
							})
						"
						@click="emit('add', row.el)">
						{{ t("plan.layout.add") }}
					</PButton>
				</li>
			</ul>
		</section>
	</aside>
</template>
