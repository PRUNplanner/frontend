<script setup lang="ts">
	// Util
	import { formatNumber } from "@/util/numbers";
	import { shortPlanetName } from "@/features/empire/util/empireMaterialIO.util";

	// Types & Interfaces
	import type { IEmpireMaterialIOSide } from "@/features/empire/empire.types";

	/**
	 * One line summary of a Material I/O side: the largest plan's planet and
	 * amount, "+N" for the rest and a bar with one segment per plan, filled
	 * against the row's larger side
	 *
	 * @author jplacht
	 */
	const { side, planetNames } = defineProps<{
		side: IEmpireMaterialIOSide;
		planetNames: Map<string, string>;
	}>();

	const name = (planetId: string) => shortPlanetName(planetNames, planetId);
</script>

<template>
	<div class="flex flex-col justify-center gap-1 h-9 min-w-0">
		<div
			v-if="side.top"
			class="flex items-baseline gap-1.5 whitespace-nowrap min-w-0">
			<span class="truncate">{{ name(side.top.planetId) }}</span>
			<strong>{{ formatNumber(side.top.amount) }}</strong>
			<span v-if="side.more > 0" class="text-white/55">
				+{{ side.more }}
			</span>
		</div>
		<span v-else class="text-white/55">—</span>
		<div
			v-if="side.top"
			class="h-1.5 rounded-[2px] overflow-hidden bg-white/7"
			aria-hidden="true">
			<div class="flex h-full gap-px" :style="{ width: `${side.fillPct}%` }">
				<div
					v-for="(e, i) in side.entries"
					:key="e.planUuid"
					class="min-w-0.5"
					:class="i === 0 ? 'bg-white/80' : 'bg-white/32'"
					:style="{ flexGrow: e.amount, flexBasis: 0 }"
					:title="`${name(e.planetId)}: ${formatNumber(e.amount)} (${formatNumber(e.share * 100, 0)} %)`" />
			</div>
		</div>
	</div>
</template>
