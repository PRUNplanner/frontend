<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { statusTagType } from "@/features/fio_repair/fioRepair.util";

	// Types & Interfaces
	import type { FIORepairStatus } from "@/features/fio_repair/fioRepair.types";

	// UI
	import { PTag } from "@/ui";

	/**
	 * When a base or building type is due: overdue or without date (error),
	 * due soon (warning) or later (secondary)
	 *
	 * @author jplacht
	 */
	const { status, due } = defineProps<{
		status: FIORepairStatus;
		due: number | null;
	}>();

	const key = computed(() =>
		status === "soon" && due === 0 ? "today" : status
	);
</script>

<template>
	<PTag :type="statusTagType(status)" class="text-nowrap">
		{{ $t(`fio.repair.due.${key}`, { n: Math.abs(due ?? 0) }) }}
	</PTag>
</template>
