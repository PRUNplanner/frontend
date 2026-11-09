<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";

	// UI
	import { PValue } from "@/ui";

	/**
	 * Material I/O's totals: exports, imports, and with every source the
	 * degradation, the production fees and the profit; five lines, two
	 * columns from 420 px, three from 720 px, one row from 1080 px
	 *
	 * @author jplacht
	 */
	const { io, calculation } = usePlanView();
	const { ioTotals, refIOSource } = io;
	const { overviewData } = calculation;

	const cell = "flex justify-between gap-3";
</script>

<template>
	<dl
		class="grid grid-cols-1 @min-[420px]:grid-cols-2 @min-[720px]:grid-cols-3 @min-[1080px]:grid-cols-5 gap-x-6 gap-y-1 px-3 py-2 text-sm tabular-nums"
		data-io-totals>
		<div :class="cell">
			<dt class="text-muted-strong">{{ t("plan.io.exports") }}</dt>
			<dd class="text-right"><PValue :value="ioTotals.exports" /></dd>
		</div>
		<div :class="cell">
			<dt class="text-muted-strong">{{ t("plan.io.imports") }}</dt>
			<dd class="text-right"><PValue :value="ioTotals.imports" /></dd>
		</div>
		<template v-if="refIOSource === 'all'">
			<div :class="cell">
				<dt class="text-muted-strong">
					{{ t("plan.io.degradation") }}
				</dt>
				<dd class="text-right">
					<PValue :value="-overviewData.dailyDegradationCost" />
				</dd>
			</div>
			<div :class="cell">
				<dt class="text-muted-strong">
					{{ t("plan.io.production_fees") }}
				</dt>
				<dd class="text-right">
					<PValue :value="-overviewData.dailyProductionFeeCost" />
				</dd>
			</div>
			<div :class="cell">
				<dt class="font-medium text-ink-strong">
					{{ t("plan.io.profit") }}
				</dt>
				<dd class="text-right font-medium">
					<PValue :value="overviewData.profit" />
				</dd>
			</div>
		</template>
	</dl>
</template>
