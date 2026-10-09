<script setup lang="ts">
	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// UI
	import { PButton } from "@/ui";
	import {
		ContentCopySharp,
		RestartAltSharp,
		SaveSharp,
	} from "@vicons/material";

	defineProps({
		// the working copy differs from the shared plan
		changed: {
			type: Boolean,
			required: false,
			default: false,
		},
		// "universe 30-day average" or the viewer's exchange settings
		priceSource: {
			type: String,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "reset"): void;
		(e: "copy"): void;
		(e: "save"): void;
	}>();

	const userStore = useUserStore();
	const { open } = useAuthPanel();
</script>

<template>
	<div
		class="mx-3 mt-3 px-3 py-2 rounded border border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
		<div class="flex flex-col gap-y-1 min-w-0">
			<div>
				<span class="font-bold text-white">
					{{ $t("sharing.banner.title") }}
				</span>
				<span
					class="pl-3"
					:class="changed ? 'text-warning font-bold' : ''">
					{{
						changed
							? $t("sharing.banner.changed")
							: $t("sharing.banner.info")
					}}
				</span>
			</div>
			<div class="text-xs text-muted">
				{{ $t("sharing.banner.prices", { source: priceSource }) }}
				{{ $t("sharing.banner.prices_hint") }}
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<template v-if="changed">
				<PButton type="secondary" @click="emit('reset')">
					<template #icon><RestartAltSharp /></template>
					{{ $t("sharing.banner.reset") }}
				</PButton>
				<PButton type="secondary" @click="emit('copy')">
					<template #icon><ContentCopySharp /></template>
					{{ $t("sharing.banner.copy") }}
				</PButton>
			</template>
			<PButton
				v-if="userStore.isLoggedIn"
				type="primary"
				@click="emit('save')">
				<template #icon><SaveSharp /></template>
				{{ $t("sharing.banner.save") }}
			</PButton>
			<template v-else>
				<PButton type="primary" @click="open('registration')">
					{{ $t("sharing.banner.signup") }}
				</PButton>
				<PButton type="secondary" @click="open('login')">
					{{ $t("homepage.navigation.login") }}
				</PButton>
			</template>
		</div>
	</div>
</template>
