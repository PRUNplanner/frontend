<script setup lang="ts">
	import { computed, type ComputedRef, h, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// UI
	import { NDropdown, type DropdownOption } from "naive-ui";
	import { PButton, PIcon } from "@/ui";
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

	const show: Ref<boolean> = ref(false);

	const icon = (component: object) => () =>
		h(PIcon, null, { default: () => h(component) });

	const options: ComputedRef<DropdownOption[]> = computed(() => {
		const items: DropdownOption[] = [];
		if (existing)
			items.push({
				key: "save-as",
				label: t("plan.actions.save_as_copy"),
				icon: icon(ContentCopySharp),
			});
		if (canShare)
			items.push({
				key: "share",
				label: t("plan.actions.share_link"),
				icon: icon(LinkSharp),
			});
		if (existing)
			items.push(
				{ type: "divider", key: "divider-reload" },
				{
					key: "reload",
					label: () =>
						h("div", { class: "flex flex-col py-1" }, [
							h("span", t("plan.actions.reload")),
							h(
								"span",
								{ class: "text-xs text-muted" },
								t("plan.actions.reload_hint")
							),
						]),
					icon: icon(ChangeCircleOutlined),
				}
			);
		if (items.length === 0) return items;
		return [
			...items,
			{ type: "divider", key: "divider-footer" },
			{
				type: "render",
				key: "shortcuts",
				render: () =>
					h(
						"div",
						{ class: "px-3 py-1.5 text-xs text-muted" },
						t("plan.actions.shortcuts")
					),
			},
		];
	});

	function onSelect(key: "save-as" | "share" | "reload"): void {
		show.value = false;
		emit(key);
	}
</script>

<template>
	<n-dropdown
		v-if="options.length > 0"
		trigger="click"
		placement="bottom-end"
		:show="show"
		:options="options"
		@select="onSelect"
		@update:show="(v: boolean) => (show = v)">
		<!-- naive's dropdown handles ↑/↓/Enter/Esc while open; the
		 focus stays on this button -->
		<PButton
			type="secondary"
			aria-haspopup="menu"
			:aria-expanded="show ? 'true' : 'false'"
			@keydown.down.prevent="show = true">
			{{ t("plan.actions.more") }}
			<PIcon class="-mr-1 align-middle">
				<ArrowDropDownSharp />
			</PIcon>
		</PButton>
	</n-dropdown>
</template>
