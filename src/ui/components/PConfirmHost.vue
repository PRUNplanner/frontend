<script setup lang="ts">
	import { computed, ref, type Ref, watch } from "vue";

	// Composables
	import { pendingConfirm, settleConfirm } from "@/ui/useConfirm";

	// Types & Interfaces
	import type { PConfirmOptions } from "@/ui/ui.types";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PModal from "@/ui/components/PModal.vue";
	import { WarningSharp } from "@vicons/material";

	const show = computed<boolean>({
		get: () => pendingConfirm.value !== null,
		set: (value) => {
			if (!value) settleConfirm(false);
		},
	});

	// kept while the modal fades out
	const options: Ref<PConfirmOptions | null> = ref(null);
	watch(pendingConfirm, (pending) => {
		if (pending) options.value = pending.options;
	});
</script>

<template>
	<PModal
		v-model:show="show"
		:width="446"
		:title="options?.title">
		<div class="flex gap-3 items-start">
			<WarningSharp class="size-6 shrink-0 text-warning" />
			<p>{{ options?.content }}</p>
		</div>
		<template #action>
			<div class="flex justify-end gap-3">
				<PButton type="secondary" @click="settleConfirm(false)">
					{{ options?.negativeText }}
				</PButton>
				<PButton type="error" @click="settleConfirm(true)">
					{{ options?.positiveText }}
				</PButton>
			</div>
		</template>
	</PModal>
</template>
