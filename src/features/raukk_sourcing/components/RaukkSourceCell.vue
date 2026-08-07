<script setup lang="ts">
	import { computed, ComputedRef, h, PropType, VNode } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Naive UI
	import { NSelect } from "naive-ui";
	import type { SelectOption } from "naive-ui";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { formatSourceOptionLabel } from "@/features/raukk_sourcing/raukkSourcingPricing";

	// UI
	import { PCheckbox } from "@/ui";

	// Types & Interfaces
	import { IRaukkTickerSource } from "@/features/raukk_sourcing/raukkSourcing.types";
	import { IRaukkSourceOption } from "@/features/raukk_sourcing/raukkSourcingUi.types";

	const props = defineProps({
		source: {
			type: Object as PropType<IRaukkTickerSource | undefined>,
			required: false,
			default: undefined,
		},
		options: {
			type: Array as PropType<IRaukkSourceOption[]>,
			required: true,
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const emit = defineEmits<{
		(e: "update:source", value: IRaukkTickerSource | undefined): void;
	}>();

	const isPlanSourced: ComputedRef<boolean> = computed(
		() => props.source?.mode === "plan"
	);

	const selectedValue: ComputedRef<string | null> = computed(() =>
		props.source?.mode === "plan" ? props.source.sourcePlanUuid : null
	);

	const hasOptions: ComputedRef<boolean> = computed(
		() => props.options.length > 0
	);

	/**
	 * Translated display name of an option, aggregates carry their
	 * sentinel as name.
	 */
	function optionName(option: IRaukkSourceOption): string {
		if (!option.aggregate) return option.planName;

		return option.value === "AGG_AVG"
			? t("raukk_sourcing.source_option.agg_avg")
			: t("raukk_sourcing.source_option.agg_max");
	}

	function optionLabel(option: IRaukkSourceOption): string {
		return formatSourceOptionLabel(
			{ ...option, planName: optionName(option) },
			(value: number) => formatNumber(value),
			{
				yours: t("raukk_sourcing.source_option.yours"),
				others: t("raukk_sourcing.source_option.others"),
			}
		);
	}

	interface IRaukkSelectOption extends SelectOption {
		raukk: IRaukkSourceOption;
	}

	const selectOptions: ComputedRef<IRaukkSelectOption[]> = computed(() =>
		props.options.map((option) => ({
			label: optionLabel(option),
			value: option.value,
			disabled: option.disabled,
			raukk: option,
		}))
	);

	/**
	 * Renders an option with a red subscription share on
	 * oversubscription, a stale marker and, for options refused by the
	 * cycle guard, the explaining tooltip.
	 */
	function renderLabel(raw: SelectOption): VNode {
		const option: IRaukkSourceOption = (raw as IRaukkSelectOption).raukk;

		const oversubscribed: boolean = option.ownPct + option.othersPct > 1;

		const children: VNode[] = [
			h(
				"span",
				`${optionName(option)}${
					option.aggregate ? "" : ` (${option.planetNaturalId})`
				} — ${formatNumber(option.costPerUnit)} ȼ/u — `
			),
			h(
				"span",
				{ class: oversubscribed ? "text-negative font-bold" : "" },
				`${formatNumber(option.ownPct * 100)}% ${t(
					"raukk_sourcing.source_option.yours"
				)} / ${formatNumber(option.othersPct * 100)}% ${t(
					"raukk_sourcing.source_option.others"
				)}`
			),
		];

		if (option.stale)
			children.push(
				h(
					"span",
					{ class: "pl-1 text-amber-400" },
					`(${t("raukk_sourcing.source_option.stale")})`
				)
			);

		if (option.disabled)
			children.push(
				h(
					"span",
					{ class: "pl-1 text-white/50" },
					`(${t("raukk_sourcing.source_option.cycle")})`
				)
			);

		return h(
			"span",
			{
				class: "text-nowrap",
				title: option.disabled
					? t("raukk_sourcing.source_option.cycle")
					: optionLabel(option),
			},
			children
		);
	}

	function toggle(checked: boolean | undefined): void {
		if (!checked) {
			emit("update:source", undefined);
			return;
		}

		const first: IRaukkSourceOption | undefined = props.options.find(
			(option) => !option.disabled
		);

		if (!first) return;

		emit("update:source", {
			mode: "plan",
			sourcePlanUuid: first.value,
		});
	}

	function select(value: string): void {
		emit("update:source", { mode: "plan", sourcePlanUuid: value });
	}
</script>

<template>
	<div class="flex flex-row gap-x-2 items-center">
		<PCheckbox
			:checked="isPlanSourced"
			:disabled="disabled || !hasOptions"
			@update:checked="toggle" />
		<template v-if="!hasOptions">
			<span class="text-white/40 text-nowrap">
				{{ $t("raukk_sourcing.inputs.no_producers") }}
			</span>
		</template>
		<template v-else-if="isPlanSourced">
			<n-select
				class="min-w-75"
				size="small"
				:value="selectedValue"
				:options="selectOptions"
				:disabled="disabled"
				:render-label="renderLabel"
				@update:value="select" />
		</template>
	</div>
</template>
