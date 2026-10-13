<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();

	// a small used-of-total bar, e.g. base area or housed workforce
	const { value, max, label } = defineProps<{
		value: number;
		max: number;
		label: string;
	}>();

	const over = computed(() => value > max);
	// a need without any total counts as full (and over)
	const ratio = computed(() =>
		max > 0 ? value / max : value > 0 ? 1 : 0
	);
	const fillWidth = computed(() => `${Math.min(ratio.value, 1) * 100}%`);
</script>

<template>
	<div
		role="img"
		:aria-label="
			t('common.ui.meter.used', {
				label,
				pct: Math.round(ratio * 100),
			})
		"
		class="h-1.5 rounded-full bg-white/10 overflow-hidden">
		<div
			class="h-full rounded-full"
			:class="over ? 'bg-negative' : 'bg-(--chart-ink)/72'"
			:style="{ width: fillWidth }" />
	</div>
</template>
