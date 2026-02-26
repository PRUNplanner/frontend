<script setup lang="ts">
	import { computed, ComputedRef, watch } from "vue";

	// Stores
	import { useUserStore } from "@/stores/userStore";
	import { useQueryStore } from "@/lib/query_cache/queryStore";
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { layoutNavigationStyle } = usePreferences();
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Router
	import router from "@/router";

	// Util
	import { relativeFromDate } from "@/util/date";

	// Types & Interfaces
	import { IMenuSection } from "@/layout/components/navigation.types";

	// UI
	import { PTag, PTooltip, PTable, PIcon } from "@/ui";
	import {
		HomeSharp,
		SearchRound,
		SettingsRound,
		LogOutRound,
		ShoppingBasketSharp,
		CompareSharp,
		ProductionQuantityLimitsSharp,
		PersonSharp,
		HelpOutlineSharp,
		LocalFireDepartmentSharp,
		AutoFixNormalSharp,
		MoneySharp,
		ExploreSharp,
		TravelExploreSharp,
		KeyboardDoubleArrowLeftSharp,
		KeyboardDoubleArrowRightSharp,
	} from "@vicons/material";

	const userStore = useUserStore();
	const queryStore = useQueryStore();
	const planningStore = usePlanningStore();
	/*
	 * FIO Data Refresh, if the user either already has FIO or if this is changed,
	 * a background refresh of FIO data is triggered in the gamedata store
	 */

	watch(
		() => userStore.hasFIO,
		(newValue: boolean) => {
			if (newValue) {
				useQuery("GetFIOStorage").execute();
			} else {
				queryStore.invalidateKey(["gamedata", "fio"], {
					exact: false,
					skipRefetch: true,
				});
			}
		},
		{ immediate: true }
	);

	const storageTimestamp = computed(
		() =>
			queryStore.peekQueryState(["gamedata", "fio", "storage"])
				?.timestamp ?? 0
	);

	const storageAge = computed(() => planningStore.fio_storage_timestamp ?? 0);

	const menuItems: ComputedRef<IMenuSection[]> = computed(() => [
		{
			label: "Planning",
			labelShort: "Plan",
			display: true,
			children: [
				{
					label: "Empire",
					display: true,
					routerLink: "/",
					icon: HomeSharp,
				},
				{
					label: "Planet Search",
					display: true,
					routerLink: "/search",
					icon: SearchRound,
				},
				{
					label: "Management",
					display: true,
					routerLink: "/manage",
					icon: SettingsRound,
				},
				{
					label: "Exchanges",
					display: true,
					routerLink: "/exchanges",
					icon: ShoppingBasketSharp,
				},
				// {
				// 	label: "Projects",
				// 	routerLink: "/not-implemented",
				// 	icon: GroupWorkRound,
				// },
			],
		},
		// {
		// 	label: "Configuration",
		// 	children: [
		// 		{
		// 			label: "Project Settings",
		// 			routerLink: "/not-implemented",
		// 			icon: PermDataSettingSharp,
		// 		},
		// 	],
		// },
		{
			label: "Tools",
			labelShort: "Tool",
			display: true,
			children: [
				{
					label: "Market Exploration",
					display: true,
					routerLink: "/market-exploration",
					icon: ExploreSharp,
				},
				{
					label: "Recipe ROI",
					display: true,
					routerLink: "/roi-overview",
					icon: MoneySharp,
				},
				{
					label: "Resource ROI",
					display: true,
					routerLink: "/resource-roi-overview",
					icon: TravelExploreSharp,
				},
				// {
				// 	label: "Market Data",
				// 	display: true,
				// 	routerLink: "/not-implemented",
				// 	icon: CandlestickChartSharp,
				// 	children: [
				// 		{
				// 			label: "Exploration",
				// 			display: true,
				// 			routerLink: "/market-exploration",
				// 			icon: ExploreSharp,
				// 		},
				// 		{
				// 			label: "Recipe ROI",
				// 			display: true,
				// 			routerLink: "/roi-overview",
				// 			icon: MoneySharp,
				// 		},
				// 		{
				// 			label: "Resource ROI",
				// 			display: true,
				// 			routerLink: "/resource-roi-overview",
				// 			icon: TravelExploreSharp,
				// 		},
				// 	],
				// },
				{
					label: "HQ Calculator",
					display: true,
					routerLink: "/hq-upgrade-calculator",
					icon: ProductionQuantityLimitsSharp,
				},
				{
					label: "Production Chains",
					display: true,
					routerLink: "/production-chain",
					icon: CompareSharp,
				},
				// {
				// 	label: "Base Compare",
				// 	display: true,
				// 	routerLink: "/not-implemented",
				// 	icon: UpgradeSharp,
				// },
				// {
				// 	label: "Government",
				// 	display: true,
				// 	routerLink: "/not-implemented",
				// 	icon: StarsSharp,
				// },
				{
					label: "FIO Burn",
					display: userStore.hasFIO,
					routerLink: "/fio/burn",
					icon: LocalFireDepartmentSharp,
				},
				{
					label: "FIO Repair",
					display: userStore.hasFIO,
					routerLink: "/fio/repair",
					icon: AutoFixNormalSharp,
				},
				// {
				// 	label: "FIO",
				// 	display: userStore.hasFIO,
				// 	routerLink: "/not-implemented",
				// 	icon: ApiSharp,
				// 	children: [
				// 		{
				// 			label: "Burn",
				// 			display: userStore.hasFIO,
				// 			routerLink: "/fio/burn",
				// 			icon: LocalFireDepartmentSharp,
				// 		},
				// 		// {
				// 		// 	label: "Storage",
				// 		// 	display: userStore.hasFIO,
				// 		// 	routerLink: "/not-implemented",
				// 		// },
				// 		{
				// 			label: "Repair",
				// 			display: userStore.hasFIO,
				// 			routerLink: "/fio/repair",
				// 			icon: AutoFixNormalSharp,
				// 		},
				// 		// {
				// 		// 	label: "Plan Import",
				// 		// 	display: userStore.hasFIO,
				// 		// 	routerLink: "/not-implemented",
				// 		// },
				// 	],
				// },
			],
		},
		{
			label: "Account",
			labelShort: "Acc",
			display: true,
			children: [
				// {
				// 	label: "API",
				// 	display: true,
				// 	routerLink: "/api",
				// 	icon: ExtensionSharp,
				// },
				{
					label: "Profile",
					display: true,
					routerLink: "/profile",
					icon: PersonSharp,
				},
				{
					label: "Help",
					display: true,
					routerLink: "/help",
					icon: HelpOutlineSharp,
				},
				{
					label: "Logout",
					display: true,
					icon: LogOutRound,
					functionCall: () => {
						userStore.logout();
						router.push("/");
					},
				},
			],
		},
	]);

	const appVersion = __APP_VERSION__;

	function toggleNavigationSize(): void {
		layoutNavigationStyle.value === "full"
			? (layoutNavigationStyle.value = "collapsed")
			: (layoutNavigationStyle.value = "full");

		trackEvent("navigation_toggle", { size: layoutNavigationStyle.value });
	}

	const isFull = computed(() => !!(layoutNavigationStyle.value === "full"));

	const containerClass = computed(() =>
		layoutNavigationStyle.value === "full" ? "px-4 " : "px-2"
	);

	const itemClass = computed(() =>
		layoutNavigationStyle.value === "full"
			? "px-2 py-2"
			: "p-2 pb-0 justify-center"
	);
</script>

<template>
	<!-- Mobile menu toggle button -->
	<input id="menu-toggle" type="checkbox" class="hidden peer" />
	<!-- Sidebar -->
	<div
		class="hidden peer-checked:flex md:h-screen md:sticky md:top-0 md:flex border-r border-white/5 flex-col bg-gray-dark transition-all duration-300 ease-in-out"
		:class="containerClass"
		style="scrollbar-width: none">
		<div class="items-center justify-between sm:hidden md:flex">
			<div class="w-full flex flex-row items-baseline pt-4">
				<div
					class="grow text-prunplanner text-xl font-light text-center">
					<router-link to="/">
						<template v-if="isFull">
							<span class="font-bold">PRUN</span>planner
						</template>
						<span v-else class="font-bold">PP</span>
					</router-link>
				</div>
				<div v-if="isFull" class="text-end text-[10px] text-white/40">
					<RouterLink to="/debug">
						{{ appVersion }}
					</RouterLink>
				</div>
			</div>
		</div>
		<div class="flex flex-col flex-1 overflow-y-auto">
			<nav class="flex-1 pt-0 pb-4 text-white/80">
				<template
					v-for="section in menuItems"
					:key="'SECTION#' + section.label">
					<div v-if="section.display" class="pb-4">
						<div
							class="text-sm text-gray-400"
							:class="[itemClass, !isFull ? 'text-center' : '']">
							{{ isFull ? section.label : section.labelShort }}
						</div>
						<template
							v-for="item in section.children"
							:key="
								'SECTION#' + section.label + '#' + item.label
							">
							<!-- without children-->
							<RouterLink
								v-if="
									item.display &&
									!item.children &&
									item.routerLink
								"
								:key="
									'ROUTER#' + section.label + '#' + item.label
								"
								:to="item.routerLink"
								class="flex items-center hover:bg-white/20 hover:rounded-sm group"
								:class="itemClass"
								active-class="bg-white/10 rounded-sm">
								<PTooltip v-if="!isFull" placement="right">
									<template #trigger>
										<PIcon v-if="item.icon" :size="20">
											<component :is="item.icon" />
										</PIcon>
									</template>
									{{ item.label }}
								</PTooltip>
								<template v-else>
									<PIcon
										v-if="item.icon"
										class="mr-2"
										:size="20">
										<component :is="item.icon" />
									</PIcon>
									{{ item.label }}
								</template>
							</RouterLink>
							<template
								v-else-if="!item.children && item.functionCall">
								<div
									class="flex items-center hover:bg-white/20 hover:rounded-sm group hover:cursor-pointer"
									:class="itemClass"
									@click="item.functionCall()">
									<PTooltip v-if="!isFull" placement="right">
										<template #trigger>
											<PIcon
												v-if="item.icon"
												:class="isFull ? 'mr-2' : ''"
												:size="20">
												<component :is="item.icon" />
											</PIcon>
										</template>
										{{ item.label }}
									</PTooltip>
									<template v-else>
										<PIcon
											v-if="item.icon"
											:class="isFull ? 'mr-2' : ''"
											:size="20">
											<component :is="item.icon" />
										</PIcon>
										{{ item.label }}
									</template>
								</div>
							</template>
							<template v-else>
								<div v-if="item.display" class="relative group">
									<input
										:id="item.label + '-toggle'"
										type="checkbox"
										:checked="isFull ? false : true"
										class="hidden peer" />
									<label
										:for="item.label + '-toggle'"
										class="flex items-center hover:bg-white/20 hover:rounded-sm cursor-pointer w-full"
										:class="[
											itemClass,
											isFull ? 'visible' : 'hidden',
										]">
										<PIcon
											v-if="item.icon"
											:class="isFull ? 'mr-2' : ''"
											:size="20">
											<component :is="item.icon" />
										</PIcon>
										{{ item.label }}
										<!-- Arrow Icon -->
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 ml-auto transition-transform peer-checked:rotate-180 absolute right-4 top-3 transform #dis--translate-y-1/2 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7" />
										</svg>
									</label>
									<div
										class="hidden peer-checked:flex transition-all flex-col duration-300">
										<template
											v-for="children in item.children">
											<RouterLink
												v-if="children.display"
												:key="
													'ROUTER#' +
													children.label +
													'#' +
													children.label
												"
												:to="
													children.routerLink
														? children.routerLink
														: ''
												"
												class="flex items-center hover:bg-white/20 hover:rounded-sm group"
												:class="[
													children.icon && isFull
														? 'pl-6'
														: 'pl-2',
													itemClass,
												]"
												active-class="bg-white/10 rounded-sm">
												<PTooltip
													v-if="!isFull"
													placement="right">
													<template #trigger>
														<PIcon
															v-if="children.icon"
															:size="20">
															<component
																:is="
																	children.icon
																" />
														</PIcon>
													</template>
													{{ children.label }}
												</PTooltip>
												<template v-else>
													<PIcon
														v-if="children.icon"
														:class="
															isFull ? 'mr-2' : ''
														"
														:size="20">
														<component
															:is="
																children.icon
															" />
													</PIcon>
													<template v-if="isFull">
														{{ children.label }}
													</template>
												</template>
											</RouterLink>
										</template>
									</div>
								</div>
							</template>
						</template>
					</div>
				</template>
			</nav>
		</div>
		<div
			class="text-center child:my-auto"
			:class="isFull ? 'py-2' : 'py-1'">
			<div
				class="flex gap-1 justify-between items-center"
				:class="isFull ? 'flex-row' : 'flex-col'">
				<div>
					<PTooltip v-if="userStore.hasFIO && storageTimestamp !== 0">
						<template #trigger>
							<PTag size="sm" type="success" :bordered="false">
								{{ isFull ? "FIO Active" : "FIO" }}
							</PTag>
						</template>
						<PTable striped>
							<thead>
								<tr>
									<th>Backend</th>
									<th>FIO</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										{{ relativeFromDate(storageTimestamp) }}
									</td>
									<td>
										{{ relativeFromDate(storageAge) }}
									</td>
								</tr>
							</tbody>
						</PTable>
					</PTooltip>
					<RouterLink v-else to="/profile">
						<PTag size="sm" type="warning" :bordered="false">
							{{ isFull ? "FIO Inactive" : "FIO" }}
						</PTag>
					</RouterLink>
				</div>
				<div @click="toggleNavigationSize">
					<div class="hover:bg-white/20 hover:rounded-sm p-2">
						<KeyboardDoubleArrowLeftSharp
							v-if="isFull"
							class="w-5 h-5" />
						<KeyboardDoubleArrowRightSharp v-else class="w-5 h-5" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
