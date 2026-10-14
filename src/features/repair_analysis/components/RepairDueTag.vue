<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { dueTagType } from "@/features/repair_analysis/repairAnalysis.util";

	// UI
	import { PTag } from "@/ui";

	/**
	 * When a building is due: overdue (error), within a week (warning)
	 * or later (secondary). `days` from dueInDays.
	 *
	 * @author jplacht
	 */
	const { days } = defineProps<{ days: number }>();

	const key = computed(() =>
		days < 0
			? "overdue"
			: days === 0
				? "today"
				: days <= 7
					? "soon"
					: "later"
	);
</script>

<template>
	<PTag :type="dueTagType(days)" class="text-nowrap">
		{{ $t(`plan.tools.repair_analysis.due.${key}`, { n: Math.abs(days) }) }}
	</PTag>
</template>
