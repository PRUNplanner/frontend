<script setup lang="ts">
	import { computed, type ComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PDropdownOption } from "@/ui/ui.types";

	// UI
	import { PButton, PDropdown } from "@/ui";
	import {
		ChangeCircleOutlined,
		ContentCopySharp,
		FileDownloadSharp,
		MoreHorizSharp,
		TerminalOutlined,
	} from "@vicons/material";

	type MoreAction = "save-as" | "reload" | "csv" | "debug";

	/**
	 * The plan header's secondary actions, so Save stays the one primary.
	 * Save as and Reload only on the user's own saved plan.
	 */
	const { existing, own, debug } = defineProps<{
		existing: boolean;
		// the user's own plan, not a shared copy or a read-only one
		own: boolean;
		// calculation debug is opted in
		debug: boolean;
	}>();

	const emit = defineEmits<{
		(e: MoreAction): void;
	}>();

	const options: ComputedRef<PDropdownOption[]> = computed(() => {
		const items: PDropdownOption[] = [];
		if (own && existing)
			items.push(
				{
					key: "save-as",
					label: t("plan.actions.save_as_copy"),
					icon: ContentCopySharp,
				},
				{
					key: "reload",
					label: t("plan.actions.reload"),
					hint: t("plan.actions.reload_hint"),
					icon: ChangeCircleOutlined,
				}
			);
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
