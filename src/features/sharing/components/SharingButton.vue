<script setup lang="ts">
	import { onMounted, PropType, ref, Ref } from "vue";

	// Composables
	import { useSharing } from "@/features/sharing/useSharing";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { copyToClipboard } from "@/util/data";

	// UI
	import { NModal } from "naive-ui";
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

	const {
		isShared,
		viewCount,
		url,
		deleteSharing,
		createSharing,
		refreshStore,
	} = useSharing(props.planUuid);

	const showModal: Ref<boolean> = ref(false);
	const isDeleting: Ref<boolean> = ref(false);
	const isCreating: Ref<boolean> = ref(false);

	async function stopSharing(): Promise<void> {
		isDeleting.value = true;
		try {
			await deleteSharing();
			showModal.value = false;
			trackEvent("plan_share_delete");
		} catch (err) {
			console.error(err);
		} finally {
			isDeleting.value = false;
		}
	}

	async function doCreateSharing(): Promise<void> {
		isCreating.value = true;
		try {
			await createSharing();
			trackEvent("plan_share_create");
		} catch (err) {
			console.error(err);
		} finally {
			isCreating.value = false;
		}
	}

	onMounted(() => {
		if (props.load) {
			refreshStore();
		}
	});
</script>

<template>
	<n-modal
		v-model:show="showModal"
		class="w-fit! max-w-175!"
		preset="card"
		title="Share Plan">
		<template v-if="!isShared">
			<div>
				{{ $t("sharing.info") }}
			</div>
		</template>
		<template v-else>
			<div class="pb-3">
				{{ $t("sharing.share_count", { count: viewCount }) }}
			</div>
			<div v-if="url" class="font-mono">
				{{ url }}
			</div>
		</template>
		<template v-if="!isShared" #action>
			<PButton
				:size="buttonSize"
				:loading="isCreating"
				@click="doCreateSharing">
				{{ $t("sharing.buttons.create_link") }}
			</PButton>
		</template>
		<template v-else #action>
			<div class="flex justify-between">
				<PButton
					v-if="url"
					:size="buttonSize"
					type="success"
					@click="copyToClipboard(url)">
					{{ $t("sharing.buttons.copy_url") }}
				</PButton>
				<PButton
					:size="buttonSize"
					type="error"
					:loading="isDeleting"
					@click="stopSharing">
					{{ $t("sharing.buttons.stop_sharing") }}
				</PButton>
			</div>
		</template>
	</n-modal>

	<PButton
		:size="buttonSize"
		:type="isShared ? 'success' : 'primary'"
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
