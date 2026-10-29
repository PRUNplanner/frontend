<script setup lang="ts">
	import { computed, useId, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { useUserStore } from "@/stores/userStore";
	import { useQueryStore } from "@/lib/query_cache/queryStore";

	// Composables
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { isApiError } from "@/lib/apiError";
	import { useVersionCheck } from "@/lib/useVersionCheck";
	import { useNavigation } from "@/layout/components/navigation/useNavigation";

	// Util
	import {
		initials,
		trackNav,
	} from "@/layout/components/navigation/navigation.util";

	// Components
	import NavPlanList from "@/layout/components/navigation/NavPlanList.vue";
	import NavFioStatus from "@/layout/components/navigation/NavFioStatus.vue";
	import NavAccountMenu from "@/layout/components/navigation/NavAccountMenu.vue";
	import SidebarRail from "@/layout/components/navigation/SidebarRail.vue";
	import VersionUpdateChip from "@/layout/components/VersionUpdateChip.vue";

	// UI
	import { PDropdown, PIcon, PTooltip } from "@/ui";
	import {
		AddSharp,
		ChevronRightSharp,
		HelpOutlineSharp,
		KeyboardDoubleArrowLeftSharp,
		UnfoldMoreSharp,
	} from "@vicons/material";

	/**
	 * Desktop navigation: the expanded sidebar or, collapsed, the rail.
	 * Mounted on every screen size, it also keeps the FIO data fresh.
	 *
	 * @author jplacht
	 */
	const userStore = useUserStore();
	const queryStore = useQueryStore();
	const { layoutNavigationStyle } = usePreferences();
	const { showChip } = useVersionCheck();
	const {
		empires,
		currentEmpire,
		plans,
		switchEmpire,
		openPlanUuid,
		openPlanInEmpire,
		strayPlan,
		isActive,
		planning,
		toolGroups,
		tools,
		toolActive,
		toolsOpen,
		toggleTools,
		fioSynced,
	} = useNavigation();

	/*
	 * FIO Data Refresh, if the user either already has FIO or if this is changed,
	 * a background refresh of FIO data is triggered in the gamedata store
	 */
	watch(
		// only these states can have stored FIO data; asking in the others is a 404
		() => userStore.hasFIO && ["ok", "error"].includes(userStore.fioStatus),
		(newValue: boolean) => {
			if (newValue) {
				// still 404 for an error before any FIO data arrived
				useQuery("GetFIOStorage")
					.execute()
					.catch((err: unknown) => {
						if (!isApiError(err) || err.status !== 404) throw err;
					});
			} else {
				queryStore.invalidateKey(["gamedata", "fio"], {
					exact: false,
					skipRefetch: true,
				});
			}
		},
		{ immediate: true }
	);

	const isFull = computed(() => layoutNavigationStyle.value === "full");

	function toggleNavigationSize(): void {
		layoutNavigationStyle.value = isFull.value ? "collapsed" : "full";
	}

	const empireOptions = computed(() =>
		empires.value.map((e) => ({ key: e.uuid, label: e.empire_name }))
	);

	const toolsId = useId();

	const sectionLabel =
		"px-2.5 text-xs font-medium uppercase tracking-wider text-muted";
	function itemClass(active: boolean): string {
		return [
			"flex items-center gap-3 h-[34px] pointer-coarse:h-11 px-2.5 rounded-md",
			active
				? "bg-prunplanner/10 text-prunplanner"
				: "text-ink hover:bg-hover",
		].join(" ");
	}
</script>

<template>
	<aside
		class="h-screen sticky top-0 shrink-0 flex-col border-r border-line bg-gray-dark overflow-y-auto"
		:class="isFull ? 'w-62' : 'w-16'"
		style="scrollbar-width: thin; scrollbar-color: var(--color-line-strong) transparent">
		<SidebarRail v-if="!isFull" @expand="toggleNavigationSize" />
		<div v-else class="flex flex-col h-full">
			<!-- Logo -->
			<div class="flex items-center justify-between px-4.5 pt-3.5 pb-2">
				<RouterLink to="/" class="text-prunplanner text-xl font-light">
					<span class="font-bold">PRUN</span>planner
				</RouterLink>
				<button
					type="button"
					class="touch-target flex items-center justify-center size-8 rounded-md text-muted hover:text-ink hover:bg-hover cursor-pointer"
					:aria-label="t('common.navigation.collapse')"
					aria-expanded="true"
					@click="toggleNavigationSize">
					<PIcon :size="18"><KeyboardDoubleArrowLeftSharp /></PIcon>
				</button>
			</div>
			<!-- the update notice was put off: its own row, under the logo -->
			<div v-if="showChip" class="flex justify-end px-3 pb-1">
				<VersionUpdateChip />
			</div>

			<nav
				class="shrink-0 px-3 pb-3"
				:aria-label="t('common.navigation.planning')">
				<div :class="sectionLabel" class="h-6 flex items-center">
					{{ t("common.navigation.planning") }}
				</div>
				<RouterLink
					v-for="item in planning"
					:key="item.name"
					:to="item.to"
					:class="itemClass(isActive(item.name))"
					:aria-current="isActive(item.name) ? 'page' : undefined"
					@click="trackNav(item.name, 'sidebar', 'planning')">
					<PIcon :size="18"><component :is="item.icon" /></PIcon>
					{{ t(`common.navigation.${item.label}`) }}
				</RouterLink>
			</nav>

			<!-- Empire and its plans: the list scrolls on its own -->
			<nav
				class="flex flex-col flex-1 min-h-68 px-3"
				:aria-label="t('common.navigation.empire')">
				<div
					class="flex items-center justify-between h-7 pointer-coarse:h-11">
					<span :class="sectionLabel">
						{{ t("common.navigation.empire") }}
					</span>
					<PDropdown
						v-if="empires.length"
						:options="empireOptions"
						placement="bottom-end"
						@select="switchEmpire">
						<button
							type="button"
							class="flex items-center gap-1 px-1.5 h-6 pointer-coarse:h-11 rounded-control text-xs text-muted hover:text-ink hover:bg-hover cursor-pointer">
							{{ t("common.navigation.empire_switch") }}
							<PIcon :size="12"><UnfoldMoreSharp /></PIcon>
						</button>
					</PDropdown>
				</div>
				<template v-if="currentEmpire">
					<RouterLink
						to="/empire"
						class="flex items-center gap-2.5 h-9 pointer-coarse:h-11 px-2 rounded-md"
						:class="
							isActive('empire')
								? 'bg-prunplanner/10 text-prunplanner'
								: openPlanInEmpire
									? 'text-ink-strong font-medium hover:bg-hover'
									: 'text-ink hover:bg-hover'
						"
						:aria-current="isActive('empire') ? 'page' : undefined"
						@click="trackNav('empire', 'sidebar', 'empire')">
						<span
							class="flex items-center justify-center size-6 shrink-0 rounded-md bg-prunplanner text-black text-xs font-bold">
							{{ initials(currentEmpire.empire_name) }}
						</span>
						<span class="truncate text-[15px]" :title="currentEmpire.empire_name">
							{{ currentEmpire.empire_name }}
						</span>
					</RouterLink>
					<div
						class="flex items-center justify-between h-7 pointer-coarse:h-11 pl-4 pr-1">
						<span class="text-sm text-muted-strong">
							{{ t("common.navigation.plans") }}
							<span class="ml-1 font-mono text-xs text-muted">
								{{ plans.length }}
							</span>
						</span>
						<PTooltip placement="right">
							<template #trigger>
								<RouterLink
									to="/search"
									class="flex items-center justify-center size-6 pointer-coarse:size-11 rounded-control text-muted hover:text-ink hover:bg-hover"
									:aria-label="
										t('common.navigation.new_plan')
									"
									@click="
										trackNav('search', 'sidebar', 'plans')
									">
									<PIcon :size="16"><AddSharp /></PIcon>
								</RouterLink>
							</template>
							{{ t("common.navigation.new_plan") }}
						</PTooltip>
					</div>
					<NavPlanList
						class="flex-1 pl-4"
						:plans="plans"
						:empire-uuid="currentEmpire.uuid"
						:open-plan-uuid="openPlanUuid"
						:stray="strayPlan"
						area="sidebar" />
				</template>
				<RouterLink
					v-else
					to="/manage"
					:class="itemClass(false)"
					@click="trackNav('manage', 'sidebar', 'empire')">
					<PIcon :size="18"><AddSharp /></PIcon>
					{{ t("common.navigation.create_empire") }}
				</RouterLink>
			</nav>

			<!-- The folded tools -->
			<nav
				class="shrink-0 px-3 pt-3 pb-2"
				:aria-label="t('common.navigation.tools')">
				<button
					type="button"
					class="flex items-center justify-between w-full h-8 pointer-coarse:h-11 rounded-md hover:bg-hover cursor-pointer"
					:aria-expanded="toolsOpen"
					:aria-controls="toolsId"
					@click="toggleTools">
					<span :class="sectionLabel" class="flex items-center gap-2">
						{{ t("common.navigation.tools") }}
						<span
							v-if="!toolsOpen && toolActive"
							class="size-1.5 rounded-full bg-prunplanner"
							data-tools-dot />
					</span>
					<span class="flex items-center gap-1 pr-1.5 text-muted">
						<span class="font-mono text-xs">{{
							tools.length
						}}</span>
						<PIcon
							:size="16"
							class="transition-transform"
							:class="toolsOpen ? 'rotate-90' : ''">
							<ChevronRightSharp />
						</PIcon>
					</span>
				</button>
				<div v-show="toolsOpen" :id="toolsId">
					<template v-for="group in toolGroups" :key="group.label">
						<template v-if="group.items.some((i) => i.display)">
							<div
								class="flex items-center justify-between px-2.5 pt-1.5 pb-0.5 text-xs text-muted">
								{{ t(`common.navigation.${group.label}`) }}
								<span
									v-if="
										group.label === 'fio.fio' && fioSynced
									"
									class="flex items-center gap-1">
									<span
										class="size-1.5 rounded-full bg-positive" />
									{{ fioSynced }}
								</span>
							</div>
							<template
								v-for="item in group.items"
								:key="item.name">
								<RouterLink
									v-if="item.display"
									:to="item.to"
									:class="itemClass(isActive(item.name))"
									:aria-current="
										isActive(item.name) ? 'page' : undefined
									"
									@mouseenter="item.prefetch?.()"
									@focus="item.prefetch?.()"
									@click="
										trackNav(item.name, 'sidebar', 'tools')
									">
									<PIcon :size="18">
										<component :is="item.icon" />
									</PIcon>
									{{ t(`common.navigation.${item.label}`) }}
								</RouterLink>
							</template>
						</template>
					</template>
				</div>
			</nav>

			<!-- Footer -->
			<div
				class="shrink-0 flex items-center gap-1 px-3 py-2.5 border-t border-line">
				<NavAccountMenu area="sidebar" />
				<NavFioStatus area="sidebar" />
				<PTooltip>
					<template #trigger>
						<RouterLink
							to="/help"
							class="flex items-center justify-center size-9 pointer-coarse:size-11 rounded-md hover:bg-hover"
							:class="
								isActive('help')
									? 'text-prunplanner'
									: 'text-muted-strong hover:text-ink'
							"
							:aria-label="t('common.navigation.help')"
							:aria-current="
								isActive('help') ? 'page' : undefined
							"
							@click="trackNav('help', 'sidebar', 'footer')">
							<PIcon :size="18"><HelpOutlineSharp /></PIcon>
						</RouterLink>
					</template>
					{{ t("common.navigation.help") }}
				</PTooltip>
			</div>
		</div>
	</aside>
</template>
