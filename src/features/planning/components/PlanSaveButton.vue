<script setup lang="ts">
	import { computed, type ComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { ColorKey } from "@/ui/ui.types";

	// UI
	import { PButton } from "@/ui";
	import { CheckSharp, ErrorOutlineSharp, SaveSharp } from "@vicons/material";

	const props = defineProps<{
		existing: boolean;
		saveable: boolean;
		saving: boolean;
		failed: boolean;
		modified: boolean;
		savedAt: Date;
	}>();

	const emit = defineEmits<{
		(e: "save"): void;
	}>();

	type SaveState = "unnamed" | "saving" | "failed" | "unsaved" | "saved";

	const state: ComputedRef<SaveState> = computed(() => {
		if (!props.saveable) return "unnamed";
		if (props.saving) return "saving";
		if (props.failed) return "failed";
		if (props.modified || !props.existing) return "unsaved";
		return "saved";
	});

	const saveLabel: ComputedRef<string> = computed(() =>
		props.existing ? t("common.buttons.save") : t("common.buttons.create")
	);

	const label: ComputedRef<string> = computed(() => {
		switch (state.value) {
			case "saving":
				return t("plan.save_status.saving");
			case "failed":
				return t("plan.save_status.retry");
			case "saved":
				return t("plan.save_status.saved");
			default:
				return saveLabel.value;
		}
	});

	// the same state in words, shown next to the button
	const status: ComputedRef<string> = computed(() => {
		switch (state.value) {
			case "unnamed":
				return props.existing
					? t("plan.save_status.name_to_save")
					: t("plan.save_status.name_to_create");
			case "saving":
				return t("plan.save_status.saving");
			case "failed":
				return t("plan.save_status.failed");
			case "unsaved":
				return t("plan.save_status.unsaved");
			default:
				return t("plan.save_status.saved_at", {
					time: props.savedAt.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					}),
				});
		}
	});

	const type: ComputedRef<ColorKey> = computed(() => {
		if (state.value === "failed") return "error";
		if (state.value === "saved") return "secondary";
		return "primary";
	});
</script>

<template>
	<div class="flex items-center gap-x-3">
		<!-- the same state in words, next to the button for everyone -->
		<span role="status" class="text-sm text-muted text-nowrap">
			{{ status }}
		</span>
		<PButton
			:type="type"
			:loading="saving"
			:disabled="!saveable"
			class="min-w-30"
			@click="emit('save')">
			<template #icon>
				<CheckSharp v-if="state === 'saved'" />
				<ErrorOutlineSharp v-else-if="state === 'failed'" />
				<SaveSharp v-else />
			</template>
			{{ label }}
			<span
				v-if="state === 'unsaved'"
				aria-hidden="true"
				class="inline-block size-1.5 ml-1 align-middle rounded-full bg-current" />
		</PButton>
	</div>
</template>
