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
	import { PTag, PTooltip } from "@/ui";

	/**
	 * Free / total plots of a planet: red Full, amber Full · ghost sites,
	 * muted when unknown.
	 * @author jplacht
	 */
	const { planet } = defineProps<{
		/** unknown plots without one */
		planet?: IPlanetPlotFields;
	}>();

	const plots = computed(() => planetPlots(planet));
	const asOf = computed(() =>
		plots.value?.updated
			? t("planet_search.plots.as_of", {
					date: formatDate(new Date(plots.value.updated)),
				})
			: ""
	);
	const tooltip = computed(() => {
		if (!plots.value) return "";
		if (plots.value.blocked)
			return `${t("planet_search.plots.full_tooltip")} ${asOf.value}`;
		if (plots.value.full)
			return `${t("planet_search.plots.ghost_tooltip", { n: plots.value.ghost })} ${asOf.value}`;
		return asOf.value;
	});

</script>

<template>
	<!-- one inline root: a caller's class lands here, the chip sits beside its neighbours -->
	<span class="inline-block align-middle">
		<span
			v-if="!plots"
			class="text-xs text-muted whitespace-nowrap"
			data-testid="planet-plots">
			{{ t("planet_search.plots.unknown") }}
		</span>
		<PTooltip v-else :disabled="!tooltip">
			<template #trigger>
				<!-- 24 px of its own: the tooltip trigger is the focus and click target -->
				<span
					class="inline-flex items-center min-h-6 whitespace-nowrap"
					data-testid="planet-plots">
					<PTag v-if="plots.blocked" type="error" size="sm">
						{{ t("planet_search.plots.full") }}
					</PTag>
					<PTag v-else-if="plots.full" type="warning" size="sm">
						{{ t("planet_search.plots.full_ghost") }}
					</PTag>
					<span v-else class="text-xs tabular-nums">
						{{ t("planet_search.plots.free", { free: plots.free, total: plots.total }) }}
					</span>
				</span>
			</template>
			{{ tooltip }}
		</PTooltip>
	</span>
</template>
