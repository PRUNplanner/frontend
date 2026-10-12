<script setup lang="ts">
	import { computed, type ComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PDropdownOption } from "@/ui/ui.types";

	// UI
	import { PButton, PDropdown, PIcon } from "@/ui";
	import {
		ArrowDropDownSharp,
		ChangeCircleOutlined,
		ContentCopySharp,
		LinkSharp,
	} from "@vicons/material";

	/**
	 * The plan header's secondary actions, so Save stays the one primary.
	 * Only shown for plans the user may change.
	 */
	const { existing, canShare } = defineProps<{
		existing: boolean;
		canShare: boolean;
	}>();

	const emit = defineEmits<{
		(e: "save-as" | "share" | "reload"): void;
	}>();

	const options: ComputedRef<PDropdownOption[]> = computed(() => {
		const items: PDropdownOption[] = [];
		if (existing)
			items.push({
				key: "save-as",
				label: t("plan.actions.save_as_copy"),
				icon: ContentCopySharp,
			});
		if (canShare)
			items.push({
				key: "share",
				label: t("plan.actions.share_link"),
				icon: LinkSharp,
			});
		if (existing)
			items.push(
				{ type: "divider" },
				{
					key: "reload",
					label: t("plan.actions.reload"),
					hint: t("plan.actions.reload_hint"),
					icon: ChangeCircleOutlined,
				}
			);
		return items;
	});

	function onSelect(key: string): void {
		emit(key as "save-as" | "share" | "reload");
	}
</script>

<template>
	<PDropdown
		v-if="options.length > 0"
		placement="bottom-end"
		:options="options"
		@select="onSelect">
		<PButton type="secondary" aria-haspopup="menu">
			{{ t("plan.actions.more") }}
			<PIcon class="-mr-1 align-middle">
				<ArrowDropDownSharp />
			</PIcon>
		</PButton>
	</PDropdown>
</template>
