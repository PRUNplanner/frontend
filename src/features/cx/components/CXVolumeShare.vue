<script setup lang="ts">
	import { computed, ComputedRef, PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PTooltip } from "@/ui";
	import { WarningAmberOutlined } from "@vicons/material";

	// Types & Interfaces
	import {
		ICXVolumeShare,
		ICXVolumeWindow,
	} from "@/features/cx/cxVolumeShare.types";

	const props = defineProps({
		share: {
			type: Object as PropType<ICXVolumeShare | undefined>,
			required: false,
			default: undefined,
		},
	});

	const localShare: ComputedRef<ICXVolumeShare | undefined> = computed(
		() => props.share
	);

	// the 7d share carries the label whatever coloured the row: it is the
	// market as it stands now
	const localLabel: ComputedRef<string> = computed(() => {
		const share: ICXVolumeShare | undefined = localShare.value;

		if (!share) return "";

		if (share.illiquid)
			return t("cx_volume.illiquid", { exchange: share.exchange });

		if (share.window7d.share === undefined)
			return t("cx_volume.share_no_volume", { exchange: share.exchange });

		return t("cx_volume.share", {
			percent: formatNumber(share.window7d.share * 100, 1),
			exchange: share.exchange,
		});
	});

	const localColorClass: ComputedRef<string> = computed(() => {
		switch (localShare.value?.level) {
			case "red":
				return "text-negative";
			case "yellow":
				return "text-amber-400";
			default:
				return "text-white/40";
		}
	});

	function windowLine(
		window: ICXVolumeWindow,
		exchange: string,
		label: string
	): string {
		if (window.share === undefined)
			return t("cx_volume.tooltip_window_empty", {
				window: label,
				exchange,
			});

		return t("cx_volume.tooltip_window", {
			window: label,
			exchange,
			traded: formatNumber(window.sumTraded, 0),
			perDay: formatNumber(window.sumTraded / window.days, 1),
			percent: formatNumber(window.share * 100, 1),
		});
	}

	const localTooltipLines: ComputedRef<string[]> = computed(() => {
		const share: ICXVolumeShare | undefined = localShare.value;

		if (!share) return [];

		const lines: string[] = [
			t("cx_volume.tooltip_intro", {
				units: formatNumber(share.soldPerDay),
				ticker: share.ticker,
				exchange: share.exchange,
			}),
		];

		if (share.illiquid) {
			lines.push(
				t("cx_volume.tooltip_illiquid", {
					exchange: share.exchange,
					ticker: share.ticker,
					traded: formatNumber(share.window7d.sumTraded, 0),
				})
			);
		} else {
			lines.push(
				windowLine(share.window7d, share.exchange, t("terms.7d")),
				windowLine(share.window30d, share.exchange, t("terms.30d"))
			);
		}

		return lines;
	});
</script>

<template>
	<PTooltip v-if="localShare">
		<template #trigger>
			<div
				class="text-xs hover:cursor-help flex flex-row gap-x-1 items-center"
				:class="localColorClass">
				<WarningAmberOutlined
					v-if="localShare.level !== 'none'"
					class="w-3.5 h-3.5 shrink-0" />
				<span>{{ localLabel }}</span>
			</div>
		</template>
		<div class="flex flex-col gap-y-1 max-w-100">
			<div v-for="(line, index) in localTooltipLines" :key="index">
				{{ line }}
			</div>
		</div>
	</PTooltip>
</template>
