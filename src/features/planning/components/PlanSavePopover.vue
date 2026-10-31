<script setup lang="ts">
	import { nextTick, ref, type Ref, useTemplateRef, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// UI
	import { PButton, PIcon, PInput, PPopover } from "@/ui";
	import {
		ArrowDropDownSharp,
		ContentCopySharp,
		DeleteOutlineSharp,
	} from "@vicons/material";

	/**
	 * The ▾ next to Save: save with an optional version name, save as
	 * copy, discard the unsaved changes
	 */
	defineProps<{
		modified: boolean;
		saving: boolean;
		/** next to Save: primary, alone (nothing to save): ghost */
		primary: boolean;
	}>();

	const emit = defineEmits<{
		(e: "save", name: string): void;
		(e: "save-as-copy"): void;
		(e: "discard"): void;
	}>();

	const show = defineModel<boolean>("show", { default: false });

	const refName: Ref<string> = ref("");
	const refInput = useTemplateRef<{ focus: () => void }>("input");

	watch(show, (open) => {
		if (!open) return;
		refName.value = "";
		void nextTick(() => refInput.value?.focus());
	});

	function submit(): void {
		show.value = false;
		// the backend takes up to 80 characters
		emit("save", refName.value.trim().slice(0, 80));
	}

	function pick(action: "save-as-copy" | "discard"): void {
		show.value = false;
		if (action === "discard") emit("discard");
		else emit("save-as-copy");
	}

	const itemClass =
		"flex items-center gap-3 h-9 pointer-coarse:h-11 px-3 w-full rounded-control text-ink text-sm hover:bg-hover cursor-pointer disabled:text-muted disabled:cursor-auto disabled:hover:bg-transparent";
</script>

<template>
	<PPopover
		v-model:show="show"
		placement="bottom-end"
		panel-class="p-0 w-72"
		:aria-label="t('plan.save_status.save_menu')">
		<template #trigger>
			<PButton
				:type="primary ? 'primary' : 'ghost'"
				class="pointer-coarse:h-11 pointer-coarse:min-w-11"
				:disabled="saving"
				:aria-label="t('plan.save_status.save_menu')"
				:aria-haspopup="true"
				data-save-menu>
				<template #icon><ArrowDropDownSharp /></template>
			</PButton>
		</template>
		<form class="flex flex-col gap-2 p-3" @submit.prevent="submit">
			<span class="text-xs text-muted" aria-hidden="true">
				{{ t("plan.versions.name_label") }}
			</span>
			<PInput
				ref="input"
				v-model:value="refName"
				placeholder=""
				:aria-label="t('plan.versions.name_label')" />
			<div class="flex items-center justify-between gap-3">
				<span class="text-xs text-muted">
					{{
						refName.trim()
							? t("plan.versions.name_hint_named")
							: t("plan.versions.name_hint", {
									shortcut: t("plan.versions.shortcut"),
								})
					}}
				</span>
				<PButton html-type="submit" :disabled="saving">
					{{
						refName.trim()
							? t("plan.save_status.save_named")
							: t("common.buttons.save")
					}}
				</PButton>
			</div>
		</form>
		<div class="flex flex-col p-1.5 border-t border-line">
			<button
				type="button"
				:class="itemClass"
				@click="pick('save-as-copy')">
				<PIcon :size="16"><ContentCopySharp /></PIcon>
				{{ t("plan.actions.save_as_copy") }}
			</button>
			<button
				type="button"
				:class="itemClass"
				:disabled="!modified"
				@click="pick('discard')">
				<PIcon :size="16"><DeleteOutlineSharp /></PIcon>
				{{ t("plan.versions.discard") }}
			</button>
		</div>
	</PPopover>
</template>
