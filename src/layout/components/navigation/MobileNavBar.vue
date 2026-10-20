<script setup lang="ts">
	import { computed, ref, watch } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Composables
	import { useNavigation } from "@/layout/components/navigation/useNavigation";
	import { useEmpireProfits } from "@/features/empire/useEmpireProfits";
	import { useVersionCheck } from "@/lib/useVersionCheck";

	// Util
	import {
		initials,
		trackNav,
	} from "@/layout/components/navigation/navigation.util";

	// Components
	import NavPlanList from "@/layout/components/navigation/NavPlanList.vue";
	import VersionUpdateChip from "@/layout/components/VersionUpdateChip.vue";

	// Types & Interfaces
	import type { NavSection } from "@/layout/components/navigation/navigation.types";

	// UI
	import { PDrawer, PDropdown, PIcon } from "@/ui";
	import {
		AddSharp,
		CodeSharp,
		GridViewSharp,
		HelpOutlineSharp,
		HomeOutlined,
		LayersOutlined,
		LogOutSharp,
		PersonOutlineSharp,
		SearchSharp,
		UnfoldMoreSharp,
	} from "@vicons/material";

	/**
	 * Phone navigation (< md): a bottom bar with a Plans and a More sheet
	 *
	 * @author jplacht
	 */
	const route = useRoute();
	const router = useRouter();
	const userStore = useUserStore();
	const { cachedProfits } = useEmpireProfits();
	const { showChip } = useVersionCheck();
	const {
		empires,
		currentEmpire,
		plans,
		switchEmpire,
		openPlanUuid,
		strayPlan,
		isActive,
		planning,
		toolGroups,
		fioSynced,
	} = useNavigation();

	const plansOpen = ref(false);
	const moreOpen = ref(false);
	watch(
		() => route.fullPath,
		() => {
			plansOpen.value = false;
			moreOpen.value = false;
		}
	);

	const profits = computed(() =>
		plansOpen.value && currentEmpire.value
			? cachedProfits(currentEmpire.value.uuid)
			: undefined
	);

	const empireOptions = computed(() =>
		empires.value.map((e) => ({ key: e.uuid, label: e.empire_name }))
	);

	// a link to the page already open doesn't navigate: close anyway
	function go(target: string, section: NavSection): void {
		trackNav(target, "mobile_sheet", section);
		plansOpen.value = false;
		moreOpen.value = false;
	}

	function logout(): void {
		go("logout", "footer");
		userStore.logout();
		router.push("/");
	}

	const appVersion = __APP_VERSION__;

	const barItem =
		"flex flex-col items-center justify-center gap-0.5 flex-1 min-h-11 text-xs cursor-pointer";
	function barIcon(active: boolean): string {
		return [
			"flex items-center justify-center w-14 h-7 rounded-full",
			active ? "bg-prunplanner/15 text-prunplanner" : "text-muted-strong",
		].join(" ");
	}
	const tile =
		"flex flex-col justify-between gap-2 min-h-19 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-ink";
	const sheetLabel =
		"flex items-center justify-between pt-3 pb-1.5 text-xs font-medium uppercase tracking-wider text-muted";
	const listItem =
		"flex items-center gap-3 min-h-11 px-1 text-ink w-full cursor-pointer";
</script>

<template>
	<nav
		class="md:hidden fixed inset-x-0 bottom-0 z-1001 flex items-stretch h-16 px-1 pb-[env(safe-area-inset-bottom)] border-t border-line bg-gray-dark"
		:aria-label="t('common.navigation.planning')">
		<RouterLink
			to="/empire"
			:class="barItem"
			:aria-current="isActive('empire') ? 'page' : undefined"
			@click="trackNav('empire', 'mobile_bar', 'empire')">
			<span :class="barIcon(isActive('empire'))">
				<PIcon :size="20"><HomeOutlined /></PIcon>
			</span>
			<span
				:class="isActive('empire') ? 'text-prunplanner' : 'text-muted'">
				{{ t("common.navigation.empire") }}
			</span>
		</RouterLink>
		<button
			type="button"
			:class="barItem"
			:aria-expanded="plansOpen"
			:aria-current="openPlanUuid ? 'page' : undefined"
			@click="plansOpen = true">
			<span :class="barIcon(plansOpen || !!openPlanUuid)">
				<PIcon :size="20"><LayersOutlined /></PIcon>
			</span>
			<span
				:class="
					plansOpen || openPlanUuid
						? 'text-prunplanner'
						: 'text-muted'
				">
				{{ t("common.navigation.plans") }}
			</span>
		</button>
		<RouterLink
			to="/search"
			:class="barItem"
			:aria-current="isActive('search') ? 'page' : undefined"
			@click="trackNav('search', 'mobile_bar', 'planning')">
			<span :class="barIcon(isActive('search'))">
				<PIcon :size="20"><SearchSharp /></PIcon>
			</span>
			<span
				:class="isActive('search') ? 'text-prunplanner' : 'text-muted'">
				{{ t("common.navigation.planet_search") }}
			</span>
		</RouterLink>
		<button
			type="button"
			:class="barItem"
			:aria-expanded="moreOpen"
			@click="moreOpen = true">
			<span class="relative" :class="barIcon(moreOpen)">
				<PIcon :size="20"><GridViewSharp /></PIcon>
				<!-- an update waits: the chip is in the sheet -->
				<span
					v-if="showChip"
					class="absolute top-0.5 right-3 size-2 rounded-full bg-prunplanner"
					data-update-dot />
			</span>
			<span :class="moreOpen ? 'text-prunplanner' : 'text-muted'">
				{{ t("common.navigation.more") }}
			</span>
		</button>
	</nav>

	<!-- Plans -->
	<PDrawer
		v-model:show="plansOpen"
		placement="bottom"
		:closable="false"
		:auto-focus="false"
		body-class="flex flex-col !px-3 !pt-2"
		:aria-label="t('common.navigation.plans')">
		<template v-if="currentEmpire">
			<div
				class="flex items-center gap-3 px-1 pb-3 mb-2 border-b border-line">
				<span
					class="flex items-center justify-center size-9 shrink-0 rounded-lg bg-prunplanner text-black text-xs font-bold">
					{{ initials(currentEmpire.empire_name) }}
				</span>
				<RouterLink
					to="/empire"
					class="flex-1 min-w-0 text-ink-strong"
					@click="go('empire', 'empire')">
					<span class="block truncate text-base font-medium" :title="currentEmpire.empire_name">
						{{ currentEmpire.empire_name }}
					</span>
					<span class="block text-xs text-muted">
						{{
							t("common.navigation.plans_count", {
								name: t("common.navigation.empire"),
								count: plans.length,
							})
						}}
					</span>
				</RouterLink>
				<PDropdown
					:options="empireOptions"
					placement="bottom-end"
					@select="switchEmpire">
					<button
						type="button"
						class="flex items-center justify-center size-11 rounded-lg text-muted hover:bg-hover cursor-pointer"
						:aria-label="t('common.navigation.empire_switch')">
						<PIcon :size="20"><UnfoldMoreSharp /></PIcon>
					</button>
				</PDropdown>
			</div>
			<NavPlanList
				class="flex-1"
				:plans="plans"
				:empire-uuid="currentEmpire.uuid"
				:open-plan-uuid="openPlanUuid"
				:stray="strayPlan"
				:profits="profits"
				area="mobile_sheet"
				large />
			<RouterLink
				to="/search"
				class="flex items-center justify-center gap-2 shrink-0 min-h-12 mt-3 rounded-lg bg-primary text-white"
				@click="go('search', 'plans')">
				<PIcon :size="20"><AddSharp /></PIcon>
				{{ t("common.navigation.new_plan") }}
			</RouterLink>
		</template>
		<RouterLink
			v-else
			to="/manage"
			:class="listItem"
			@click="go('manage', 'empire')">
			<PIcon :size="20"><AddSharp /></PIcon>
			{{ t("common.navigation.create_empire") }}
		</RouterLink>
	</PDrawer>

	<!-- More -->
	<PDrawer
		v-model:show="moreOpen"
		placement="bottom"
		:closable="false"
		:auto-focus="false"
		body-class="!px-4 !pt-0"
		:aria-label="t('common.navigation.more')">
		<div v-if="showChip" class="flex justify-end pt-3">
			<VersionUpdateChip />
		</div>
		<div :class="sheetLabel">{{ t("common.navigation.planning") }}</div>
		<div class="grid grid-cols-3 gap-2">
			<RouterLink
				v-for="item in planning.filter((i) => i.name !== 'search')"
				:key="item.name"
				:to="item.to"
				:class="tile"
				:aria-current="isActive(item.name) ? 'page' : undefined"
				@click="go(item.name, 'planning')">
				<PIcon :size="20" class="text-prunplanner">
					<component :is="item.icon" />
				</PIcon>
				<span class="text-sm leading-tight">
					{{ t(`common.navigation.${item.label}`) }}
				</span>
			</RouterLink>
		</div>
		<template v-for="group in toolGroups" :key="group.label">
			<template v-if="group.items.some((i) => i.display)">
				<div :class="sheetLabel">
					{{ t(`common.navigation.${group.label}`) }}
					<span
						v-if="group.label === 'fio.fio' && fioSynced"
						class="flex items-center gap-1 normal-case tracking-normal">
						<span class="size-1.5 rounded-full bg-positive" />
						{{ fioSynced }}
					</span>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<template v-for="item in group.items" :key="item.name">
						<RouterLink
							v-if="item.display"
							:to="item.to"
							:class="tile"
							:aria-current="
								isActive(item.name) ? 'page' : undefined
							"
							@mouseenter="item.prefetch?.()"
							@focus="item.prefetch?.()"
							@click="go(item.name, 'tools')">
							<PIcon :size="20" class="text-prunplanner">
								<component :is="item.icon" />
							</PIcon>
							<span class="text-sm leading-tight">
								{{ t(`common.navigation.${item.label}`) }}
							</span>
						</RouterLink>
					</template>
				</div>
			</template>
		</template>
		<div class="mt-4 pt-1 border-t border-line">
			<RouterLink
				to="/profile"
				:class="listItem"
				@click="go('profile', 'footer')">
				<PIcon :size="20"><PersonOutlineSharp /></PIcon>
				{{ t("common.navigation.profile") }}
			</RouterLink>
			<RouterLink
				to="/apikey"
				:class="listItem"
				@click="go('apikey', 'footer')">
				<PIcon :size="20"><CodeSharp /></PIcon>
				{{ t("common.navigation.api") }}
			</RouterLink>
			<RouterLink
				to="/help"
				:class="listItem"
				@click="go('help', 'footer')">
				<PIcon :size="20"><HelpOutlineSharp /></PIcon>
				{{ t("common.navigation.help") }}
			</RouterLink>
			<button type="button" :class="listItem" @click="logout">
				<PIcon :size="20"><LogOutSharp /></PIcon>
				{{ t("common.navigation.logout") }}
			</button>
			<RouterLink
				to="/debug"
				class="flex justify-between min-h-11 items-center px-1 text-xs text-muted"
				@click="go('debug', 'footer')">
				<span>PRUNplanner</span>
				<span class="font-mono">{{ appVersion }}</span>
			</RouterLink>
		</div>
	</PDrawer>
</template>
