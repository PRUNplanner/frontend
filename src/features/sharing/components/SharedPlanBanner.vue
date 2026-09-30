<script setup lang="ts">
	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// UI
	import { PButton } from "@/ui";
	import { ContentCopySharp } from "@vicons/material";

	defineProps({
		cloned: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const emit = defineEmits<{ (e: "clone"): void }>();

	const userStore = useUserStore();
	const { open } = useAuthPanel();
</script>

<template>
	<div
		class="mx-3 mt-3 px-3 py-2 rounded border border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
		<div>
			<span class="font-bold text-white">
				{{ $t("sharing.banner.title") }}
			</span>
			<span class="pl-3">{{ $t("sharing.banner.info") }}</span>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<PButton
				v-if="userStore.isLoggedIn"
				:disabled="cloned"
				:type="cloned ? 'success' : 'primary'"
				@click="emit('clone')">
				<template #icon><ContentCopySharp /></template>
				{{
					cloned
						? $t("common.buttons.clone_complete")
						: $t("common.buttons.clone_plan")
				}}
			</PButton>
			<template v-else>
				<span>{{ $t("sharing.banner.signup_hint") }}</span>
				<PButton type="primary" @click="open('registration')">
					{{ $t("homepage.navigation.registration") }}
				</PButton>
				<PButton type="secondary" @click="open('login')">
					{{ $t("homepage.navigation.login") }}
				</PButton>
			</template>
		</div>
	</div>
</template>
