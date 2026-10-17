<script setup lang="ts">
	import { ref, watch } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Util
	import { trackNav } from "@/layout/components/navigation/navigation.util";

	// Types & Interfaces
	import type { NavArea } from "@/layout/components/navigation/navigation.types";

	// UI
	import { PIcon, PPopover, PTooltip } from "@/ui";
	import {
		CodeSharp,
		LogOutSharp,
		PersonOutlineSharp,
		UnfoldMoreSharp,
	} from "@vicons/material";

	/**
	 * Footer account button: Profile, API, Logout and the version
	 *
	 * @author jplacht
	 */
	const { area, compact = false } = defineProps<{
		area: NavArea;
		/** icon only (rail) */
		compact?: boolean;
	}>();

	const route = useRoute();
	const router = useRouter();
	const userStore = useUserStore();
	const show = ref(false);
	watch(
		() => route.fullPath,
		() => (show.value = false)
	);

	const appVersion = __APP_VERSION__;

	function logout(): void {
		trackNav("logout", area, "footer");
		show.value = false;
		userStore.logout();
		router.push("/");
	}

	const itemClass =
		"flex items-center gap-3 h-9 px-3 rounded-control text-ink hover:bg-hover w-full cursor-pointer";
</script>

<template>
	<PPopover
		v-model:show="show"
		:placement="compact ? 'right-end' : 'top-start'"
		panel-class="p-1.5 w-56">
		<template #trigger>
			<PTooltip v-if="compact" placement="right" :disabled="show">
				<template #trigger>
					<button
						type="button"
						class="flex items-center justify-center size-9 pointer-coarse:size-11 rounded-md hover:bg-hover cursor-pointer text-ink"
						:aria-label="t('common.navigation.account_menu')"
						:aria-expanded="show">
						<span
							class="flex items-center justify-center size-7 rounded-full bg-white/10">
							<PIcon :size="16"><PersonOutlineSharp /></PIcon>
						</span>
					</button>
				</template>
				{{ t("common.navigation.account") }}
			</PTooltip>
			<button
				v-else
				type="button"
				class="flex items-center gap-2 h-9 pointer-coarse:h-11 px-2 flex-1 rounded-md hover:bg-hover cursor-pointer text-ink"
				:aria-label="t('common.navigation.account_menu')">
				<span
					class="flex items-center justify-center size-7 rounded-full bg-white/10">
					<PIcon :size="16"><PersonOutlineSharp /></PIcon>
				</span>
				<span class="flex-1 text-left">
					{{ t("common.navigation.account") }}
				</span>
				<PIcon :size="16" class="text-muted">
					<UnfoldMoreSharp />
				</PIcon>
			</button>
		</template>
		<nav :aria-label="t('common.navigation.account')">
			<RouterLink
				to="/profile"
				:class="itemClass"
				@click="trackNav('profile', area, 'footer')">
				<PIcon :size="18"><PersonOutlineSharp /></PIcon>
				{{ t("common.navigation.profile") }}
			</RouterLink>
			<RouterLink
				to="/apikey"
				:class="itemClass"
				@click="trackNav('apikey', area, 'footer')">
				<PIcon :size="18"><CodeSharp /></PIcon>
				{{ t("common.navigation.api") }}
			</RouterLink>
			<button type="button" :class="itemClass" @click="logout">
				<PIcon :size="18"><LogOutSharp /></PIcon>
				{{ t("common.navigation.logout") }}
			</button>
			<RouterLink
				to="/debug"
				class="flex justify-between mt-1 pt-2 pb-1 px-3 border-t border-line text-xs text-muted hover:text-ink"
				@click="trackNav('debug', area, 'footer')">
				<span>PRUNplanner</span>
				<span class="font-mono">{{ appVersion }}</span>
			</RouterLink>
		</nav>
	</PPopover>
</template>
