<script setup lang="ts">
	import { computed, type ComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PDropdownOption } from "@/ui/ui.types";

	// UI
	import { PButton, PDropdown } from "@/ui";
	import {
		FileDownloadSharp,
		MoreHorizSharp,
		TerminalOutlined,
	} from "@vicons/material";

	type MoreAction = "csv" | "debug";

	/**
	 * The plan header's secondary actions, so Save stays the one primary.
	 * Save as copy is in the save control's menu.
	 */
	const { debug } = defineProps<{
		// calculation debug is opted in
		debug: boolean;
	}>();

	const emit = defineEmits<{
		(e: MoreAction): void;
	}>();

	const options: ComputedRef<PDropdownOption[]> = computed(() => {
		const items: PDropdownOption[] = [];
		items.push({
			key: "csv",
			label: t("plan.actions.download_csv"),
			icon: FileDownloadSharp,
		});
		if (debug)
			items.push(
				{ type: "divider" },
				{
					key: "debug",
					label: "Calculation debug",
					icon: TerminalOutlined,
				}
			);
		return items;
	});

	function onSelect(key: string): void {
		emit(key as MoreAction);
	}
</script>

<template>
	<PDropdown placement="bottom-end" :options="options" @select="onSelect">
		<PButton
			type="ghost"
			aria-haspopup="menu"
			:aria-label="t('plan.actions.more')">
			<template #icon><MoreHorizSharp /></template>
		</PButton>
	</PDropdown>
</template>
