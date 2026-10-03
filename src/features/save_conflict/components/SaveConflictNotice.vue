<script setup lang="ts">
	import type { PropType } from "vue";

	// UI
	import { PButton } from "@/ui";

	defineProps({
		notice: {
			type: String as PropType<"saved" | "deleted" | null>,
			default: null,
		},
	});

	const emit = defineEmits<{ (e: "reload"): void }>();
</script>

<template>
	<div
		v-if="notice"
		role="status"
		class="text-xs bg-warning/20 text-white p-2 flex flex-row flex-wrap gap-2 items-center">
		<span class="grow">
			{{
				notice === "saved"
					? $t("save_conflict.notice.saved_elsewhere")
					: $t("save_conflict.notice.deleted_elsewhere")
			}}
		</span>
		<PButton
			v-if="notice === 'saved'"
			size="sm"
			type="secondary"
			@click="emit('reload')">
			{{ $t("save_conflict.notice.reload") }}
		</PButton>
	</div>
</template>
