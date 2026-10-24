<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import {
		planetPlots,
		type IPlanetPlotFields,
	} from "@/features/planet_search/planetPlots.util";
	import { formatDate } from "@/util/date";

	// UI
	import { PTooltip } from "@/ui";
	import { BlockSharp } from "@vicons/material";

	/**
	 * Red icon on a planet no new base can settle: every plot taken, no
	 * ghost sites. Shown whether or not the plots column is.
	 * @author jplacht
	 */
	const { planet } = defineProps<{
		planet: IPlanetPlotFields;
	}>();

	const plots = computed(() => planetPlots(planet));
	const tooltip = computed(() =>
		[
			t("planet_search.plots.full_tooltip"),
			plots.value?.updated
				? t("planet_search.plots.as_of", {
						date: formatDate(new Date(plots.value.updated)),
					})
				: "",
		]
			.join(" ")
			.trim()
	);
</script>

<template>
	<!-- one inline root next to the planet name -->
	<span v-if="plots?.blocked" class="inline-block align-middle">
		<PTooltip>
			<template #trigger>
				<!-- 24 px of its own without growing the name's line -->
				<span
					class="inline-flex items-center justify-center size-6 -my-0.5 text-negative"
					data-testid="planet-full">
					<BlockSharp class="size-4" aria-hidden="true" />
					<span class="sr-only">{{ t("planet_search.plots.full") }}</span>
				</span>
			</template>
			{{ tooltip }}
		</PTooltip>
	</span>
</template>
