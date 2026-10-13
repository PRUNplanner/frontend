<script setup lang="ts">
	import type { PropType } from "vue";

	// UI
	import { PButton, PNotice } from "@/ui";

	defineProps({
		notice: {
			type: String as PropType<"saved" | "deleted" | null>,
			default: null,
		},
	});

	const emit = defineEmits<{ (e: "reload"): void }>();
</script>

<template>
	<PNotice v-if="notice" type="warning" class="text-xs">
		{{
			notice === "saved"
				? $t("save_conflict.notice.saved_elsewhere")
				: $t("save_conflict.notice.deleted_elsewhere")
		}}
		<template v-if="notice === 'saved'" #action>
			<PButton size="sm" type="secondary" @click="emit('reload')">
				{{ $t("save_conflict.notice.reload") }}
			</PButton>
		</template>
	</PNotice>
</template>
