<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";
	import { usePlanCheckView } from "@/features/planning/usePlanCheckView";

	// Components
	import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";

	// UI
	import { PSegmented, PSelect } from "@/ui";

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
		<!-- the filters wrap below 480 px, one line from there; on a touch
			screen each button is a whole 44 px target -->
		<div
			class="flex flex-wrap @min-[480px]:flex-nowrap items-center gap-2 px-3 pb-2 [&_button]:px-2 [&_button]:min-w-6 pointer-coarse:[&_button]:h-11 pointer-coarse:[&_button]:min-w-11">
			<PSelect
				v-model:value="refIOSource"
				size="sm"
				class="w-36"
				:aria-label="t('plan.io.source.label')"
				:options="ioSourceOptions" />
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
