<script setup lang="ts">
	import { onMounted, type PropType, ref, type Ref } from "vue";

	// Composables
	import { useSharing } from "@/features/sharing/useSharing";

	// Components
	import SharingModal from "@/features/sharing/components/SharingModal.vue";

	// UI
	import { PButton } from "@/ui";
	import { LinkSharp, RemoveRedEyeSharp } from "@vicons/material";

	const props = defineProps({
		planUuid: {
			type: String,
			required: true,
		},
		buttonSize: {
			type: String as PropType<"sm" | "md">,
			required: false,
			default: "md",
		},
		load: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const { isShared, viewCount, refreshStore } = useSharing(props.planUuid);

	const showModal: Ref<boolean> = ref(false);

	onMounted(() => {
		if (props.load) {
			refreshStore();
		}
	});
</script>

<template>
	<SharingModal
		v-model:show="showModal"
		:plan-uuid="planUuid"
		:button-size="buttonSize" />

	<PButton
		:size="buttonSize"
		:type="isShared ? 'success' : 'primary'"
		:aria-label="
			buttonSize !== 'sm'
				? undefined
				: isShared
					? $t('sharing.buttons.views', { count: viewCount })
					: $t('sharing.buttons.share')
		"
		@click="() => (showModal = !showModal)">
		<template v-if="isShared" #icon><RemoveRedEyeSharp /></template>
		<template v-else #icon><LinkSharp /></template>

		<template v-if="isShared && buttonSize == 'sm'">
			{{ viewCount }}
		</template>
		<template v-if="buttonSize !== 'sm'">
			<template v-if="isShared">
				{{ $t("sharing.buttons.views", { count: viewCount }) }}
			</template>
			<template v-else>{{ $t("sharing.buttons.share") }}</template>
		</template>
	</PButton>
</template>
