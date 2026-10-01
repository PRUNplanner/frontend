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

	// as tall as one option row and at the top, so on a two-line option
	// the icon stays on the first line
	const icon = (component: object) => () =>
		h(
			"span",
			{ class: "self-start h-(--n-option-height) flex items-center" },
			h(PIcon, null, { default: () => h(component) })
		);

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
					// naive fixes every option to one row; this one has two
					props: { class: "h-auto!" },
					label: () =>
						h("div", { class: "flex flex-col pb-2" }, [
							h(
								"span",
								{ class: "leading-(--n-option-height)" },
								t("plan.actions.reload")
							),
							h(
								"span",
								{ class: "text-xs leading-4 text-muted" },
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
						{
							// in line with the option labels
							class: "pl-(--n-option-icon-prefix-width) pr-3 py-2 text-xs leading-4 text-muted",
						},
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
