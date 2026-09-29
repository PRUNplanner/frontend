<script setup lang="ts">
	import { computed, type ComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// UI
	import { PButton } from "@/ui";

	const props = defineProps<{
		existing: boolean;
		saveable: boolean;
		saving: boolean;
		failed: boolean;
		modified: boolean;
		savedAt: Date;
	}>();

	const emit = defineEmits<{
		(e: "retry"): void;
	}>();

	const text: ComputedRef<string> = computed(() => {
		if (!props.saveable)
			return props.existing
				? t("plan.save_status.name_to_save")
				: t("plan.save_status.name_to_create");
		if (props.saving) return t("plan.save_status.saving");
		if (props.failed) return t("plan.save_status.failed");
		if (props.modified) return t("plan.save_status.unsaved");
		return t("plan.save_status.saved_at", {
			time: props.savedAt.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		});
	});
</script>

<template>
	<span role="status" class="flex items-center gap-x-2 text-sm text-white/60">
		{{ text }}
		<PButton
			v-if="failed && !saving && saveable"
			size="sm"
			@click="emit('retry')">
			{{ t("plan.save_status.retry") }}
		</PButton>
	</span>
</template>
