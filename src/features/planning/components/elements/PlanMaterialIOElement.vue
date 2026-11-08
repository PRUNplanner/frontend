<script setup lang="ts">
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

	// a mouse keeps the table in a box as high as the window; a touch
	// screen shows it whole (no scroll box inside the scrolling page), and
	// the item's own height mode can still cap it
	const maxHeight =
		typeof window.matchMedia === "function" &&
		window.matchMedia("(pointer: coarse)").matches
			? undefined
			: "calc(100dvh - 20rem)";

	function openPlanCheck(): void {
		planCheckView.value = "market";
		focusElement("plan-check");
	}
</script>

<template>
	<div data-io>
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
