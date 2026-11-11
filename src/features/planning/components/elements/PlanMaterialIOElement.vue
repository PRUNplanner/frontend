<script setup lang="ts">
	import {
		computed,
		inject,
		onBeforeUnmount,
		onMounted,
		ref,
		useTemplateRef,
	} from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";
	import { usePlanCheckView } from "@/features/planning/usePlanCheckView";

	// Components
	import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";

	// UI
	import { PSegmented } from "@/ui";

	// Util
	import { FILTER_BAR } from "@/features/planning/planView.util";
	import { partRoomKey } from "@/features/planning/layout/planGrid.util";

	/**
	 * The plan's material flow: source, filter and value, the table with
	 * its market flags; a flag opens Plan check on its market view
	 *
	 * @author jplacht
	 */
	const { io, marketChecks, focusElement } = usePlanView();
	const {
		refIOSource,
		refIOFilter,
		refIOValue,
		ioRows,
		ioSourceOptions,
		ioFilterOptions,
		ioValueOptions,
	} = io;
	const { view: planCheckView } = usePlanCheckView();

	// in a part set to a height, the table scrolls in a box filling what is
	// left of it, its header in view; fitting its content, or on a touch
	// screen (no scroll box inside the scrolling page), it shows whole
	const room = inject(partRoomKey, null);
	const coarse =
		typeof window.matchMedia === "function" &&
		window.matchMedia("(pointer: coarse)").matches;
	const root = useTemplateRef<HTMLElement>("root");
	// px of it that aren't rows: all but the table box (the filter bar,
	// which wraps, and the note below), and the table's header
	const above = ref(0);
	const measure = (): void => {
		const box = root.value?.querySelector<HTMLElement>(".p-data-table-box");
		if (!root.value || !box) return;
		above.value =
			root.value.offsetHeight -
			box.offsetHeight +
			(box.querySelector("thead")?.offsetHeight ?? 0);
	};
	let observer: ResizeObserver | undefined;
	onMounted(() => {
		measure();
		if (typeof ResizeObserver === "undefined" || !root.value) return;
		// the box's own size cancels out: a change of it settles at once
		observer = new ResizeObserver(measure);
		observer.observe(root.value);
	});
	onBeforeUnmount(() => observer?.disconnect());
	// the room less the part's padding (24), all but the rows, the border
	const maxHeight = computed(() =>
		coarse || room?.value == null
			? undefined
			: `${Math.max(120, room.value - 24 - above.value - 2)}px`
	);

	function openPlanCheck(): void {
		planCheckView.value = "market";
		focusElement("plan-check");
	}
</script>

<template>
	<div ref="root" data-io>
		<!-- the same filter bar as the Supply Cart's: which materials, then
			which way and what value; it wraps where it doesn't fit -->
		<div :class="FILTER_BAR" class="px-3 pb-2">
			<PSegmented
				v-model:value="refIOSource"
				size="sm"
				:options="ioSourceOptions"
				:label="t('plan.io.source.label')" />
			<PSegmented
				v-model:value="refIOFilter"
				size="sm"
				:options="ioFilterOptions"
				:label="t('plan.io.filter.label')" />
			<PSegmented
				v-model:value="refIOValue"
				size="sm"
				class="@min-[480px]:ml-auto"
				:options="ioValueOptions"
				:label="t('plan.io.value.label')" />
		</div>
		<PlanMaterialIO
			:material-i-o-data="ioRows"
			:max-height="maxHeight"
			:value="refIOValue"
			:filter="refIOFilter"
			:checks="refIOSource === 'all' ? marketChecks : undefined"
			:market="marketChecks"
			@open:plan-check="openPlanCheck" />
	</div>
</template>
