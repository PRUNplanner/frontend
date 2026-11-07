<script setup lang="ts">
	import { computed, type ComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PDropdownOption } from "@/ui/ui.types";
	import type { LayoutChoice } from "@/features/planning/layout/planLayout.schemas";

	// Util
	import { PRESET_KEYS } from "@/features/planning/layout/presets";

	// UI
	import { PButton, PDropdown } from "@/ui";
	import { DashboardCustomizeOutlined } from "@vicons/material";

	/**
	 * The plan header's Layout menu: the presets, Custom Layout when there
	 * is one, and customising from the layout in use (not on a phone).
	 * Tinted parts is set while customising (owner, 2026-11-07)
	 *
	 * @author jplacht
	 */
	const { choice, hasCustom, canCustomise } = defineProps<{
		choice: LayoutChoice;
		hasCustom: boolean;
		canCustomise: boolean;
	}>();

	const emit = defineEmits<{
		(e: "pick", choice: LayoutChoice): void;
		(e: "customise"): void;
	}>();

	const name = (c: LayoutChoice): string =>
		t(`plan.layout.presets.${c}.name`);

	const options: ComputedRef<PDropdownOption[]> = computed(() => [
		...PRESET_KEYS.map((key) => ({
			key,
			label: name(key),
			hint: t(`plan.layout.presets.${key}.description`),
			checked: choice === key,
		})),
		...(hasCustom
			? [
					{
						key: "custom",
						label: name("custom"),
						hint: t("plan.layout.presets.custom.description"),
						checked: choice === "custom",
					},
				]
			: []),
		...(canCustomise
			? [
					{ type: "divider" as const },
					{
						key: "customise",
						label:
							choice === "custom"
								? t("plan.layout.customise_custom")
								: t("plan.layout.customise_from", {
										name: name(choice),
									}),
					},
				]
			: []),
	]);

	function onSelect(key: string): void {
		if (key === "customise") emit("customise");
		else if (key !== choice) emit("pick", key as LayoutChoice);
	}
</script>

<template>
	<PDropdown :options="options" placement="bottom-end" @select="onSelect">
		<PButton
			type="secondary"
			class="pointer-coarse:h-11"
			:aria-label="`${t('plan.layout.menu')}: ${name(choice)}`"
			data-layout-menu>
			<template #icon><DashboardCustomizeOutlined /></template>
			<span class="max-md:sr-only">{{ t("plan.layout.menu") }}</span>
		</PButton>
	</PDropdown>
</template>
