<script setup lang="ts">
	import type { PropType } from "vue";

	// UI
	import { PButton } from "@/ui";
	import { SaveSharp } from "@vicons/material";

	defineProps({
		count: {
			type: Number,
			required: true,
		},
		/** muted detail, e.g. "3 plans · 2 empires" */
		detail: {
			type: String,
			required: false,
			default: undefined,
		},
		state: {
			type: String as PropType<"idle" | "saving" | "error">,
			required: false,
			default: "idle",
		},
	});

	defineEmits<{
		(e: "save"): void;
		(e: "discard"): void;
	}>();
</script>

<template>
	<div
		role="region"
		:aria-label="$t('management.save_bar.label')"
		class="sticky bottom-6 z-10 mx-6 flex flex-wrap items-center gap-x-4 gap-y-2 min-h-16 py-3 pl-5 pr-4 bg-gray-dark border rounded-md shadow-[0_-8px_32px_rgba(0,0,0,0.7)]"
		:class="
			state === 'error' ? 'border-negative' : 'border-positive/45'
		">
		<span
			v-if="state === 'error'"
			class="size-2 rounded-full bg-negative" />
		<span
			v-else
			class="size-5.5 rounded-sm border border-positive/50 bg-unsaved-stripes" />
		<div class="grow flex flex-wrap items-baseline gap-x-4" role="status">
			<span class="font-medium text-[15px]">
				<template v-if="state === 'error'">
					{{ $t("management.save_bar.error") }}
				</template>
				<template v-else-if="state === 'saving'">
					{{ $t("management.save_bar.saving", count) }}
				</template>
				<template v-else>
					{{ $t("management.save_bar.unsaved", count) }}
				</template>
			</span>
			<span v-if="detail && state !== 'error'" class="text-white/55">
				{{ detail }}
			</span>
		</div>
		<div class="flex gap-3">
			<PButton
				type="secondary"
				:disabled="state === 'saving'"
				@click="$emit('discard')">
				{{ $t("management.save_bar.discard") }}
			</PButton>
			<PButton :loading="state === 'saving'" @click="$emit('save')">
				<template #icon><SaveSharp /></template>
				{{
					state === "error"
						? $t("management.save_bar.retry")
						: $t("management.save_bar.save")
				}}
			</PButton>
		</div>
	</div>
</template>
