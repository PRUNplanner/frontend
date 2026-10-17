import { computed, type ComputedRef, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";

// Composables
import { usePreferences } from "@/features/preferences/usePreferences";
import { useQuery } from "@/lib/query_cache/useQuery";

// Util
import { relativeFromDate } from "@/util/date";
import {
	pickEmpire,
	sortPlans,
} from "@/layout/components/navigation/navigation.util";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type {
	INavGroup,
	INavItem,
	INavPlan,
} from "@/layout/components/navigation/navigation.types";

// UI
import {
	AccountTreeOutlined,
	BuildOutlined,
	ExploreOutlined,
	HomeWorkOutlined,
	LocalFireDepartmentOutlined,
	PercentSharp,
	ReceiptLongOutlined,
	SearchSharp,
	ShoppingBasketOutlined,
	ShowChartSharp,
	TerrainOutlined,
	TuneSharp,
} from "@vicons/material";

const TOOLS_KEY = "prunplanner_nav_tools";

function readToolsOpen(): boolean {
	try {
		return localStorage.getItem(TOOLS_KEY) === "1";
	} catch {
		return false;
	}
}

// one fold state for the page, kept per device
const toolsOpen = ref(readToolsOpen());

/**
 * State and entries shared by the sidebar, the rail and the phone bar:
 * the current empire and its plans, the open plan, the menu and its
 * fold state, and the nav_click event.
 *
 * @author jplacht
 */
export function useNavigation() {
	const route = useRoute();
	const router = useRouter();
	const userStore = useUserStore();
	const planningStore = usePlanningStore();
	const { defaultEmpireUuid } = usePreferences();

	// a save drops the cached list without refetching it: load it again
	const { state, execute } = useQuery("GetAllEmpires");
	watch(
		() => !state.value,
		(missing) => {
			if (missing) execute().catch(console.error);
		},
		{ immediate: true }
	);

	const empires: ComputedRef<PlanEmpireElement[]> = computed(() =>
		Object.values(planningStore.empires)
	);
	const currentEmpire: ComputedRef<PlanEmpireElement | undefined> = computed(
		() => pickEmpire(empires.value, defaultEmpireUuid.value)
	);
	const plans: ComputedRef<INavPlan[]> = computed(() =>
		sortPlans(currentEmpire.value?.plans ?? [])
	);

	function switchEmpire(uuid: string): void {
		defaultEmpireUuid.value = uuid;
		// an empire named in the URL would win over the switch
		if (route.name === "empire" && route.params.empireUuid)
			router.push("/empire");
	}

	// a saved plan; a new one (no uuid) and shared ones mark nothing
	const openPlanUuid: ComputedRef<string | undefined> = computed(() =>
		route.name === "plan"
			? (route.params.planUuid as string | undefined) || undefined
			: undefined
	);

	const openPlanInEmpire = computed(
		() =>
			!!openPlanUuid.value &&
			plans.value.some((p) => p.uuid === openPlanUuid.value)
	);

	// the open plan when the current empire doesn't hold it
	const strayPlan: ComputedRef<INavPlan | undefined> = computed(() => {
		const uuid = openPlanUuid.value;
		if (!uuid || openPlanInEmpire.value) return undefined;
		const listed = empires.value
			.flatMap((e) => e.plans)
			.find((p) => p.uuid === uuid);
		if (listed) return listed;
		const plan = planningStore.plans[uuid];
		return {
			uuid,
			plan_name: plan?.plan_name ?? "",
			planet_natural_id:
				plan?.planet_natural_id ??
				(route.params.planetNaturalId as string),
		};
	});

	function isActive(name: string): boolean {
		return route.name === name;
	}

	const planning: INavItem[] = [
		{
			label: "planet_search",
			name: "search",
			to: "/search",
			icon: SearchSharp,
			display: true,
		},
		{
			label: "management",
			name: "manage",
			to: "/manage",
			icon: TuneSharp,
			display: true,
		},
		{
			label: "exchanges",
			name: "exchanges",
			to: "/exchanges",
			icon: ShoppingBasketOutlined,
			display: true,
		},
	];

	const toolGroups: ComputedRef<INavGroup[]> = computed(() => [
		{
			label: "market",
			items: [
				{
					label: "market_exploration",
					name: "market-exploration",
					to: "/market-exploration",
					icon: ExploreOutlined,
					display: true,
				},
				{
					label: "market_live",
					name: "market-live",
					to: "/market-live",
					icon: ShowChartSharp,
					display: true,
				},
				{
					label: "recipe_roi",
					name: "roi-overview",
					to: "/roi-overview",
					icon: PercentSharp,
					display: true,
				},
				{
					label: "resource_roi",
					name: "resource-roi-overview",
					to: "/resource-roi-overview",
					icon: TerrainOutlined,
					display: true,
				},
			],
		},
		{
			label: "calculators",
			items: [
				{
					label: "hq_calculator",
					name: "hq-upgrade-calculator",
					to: "/hq-upgrade-calculator",
					icon: HomeWorkOutlined,
					display: true,
				},
				{
					label: "production_chains",
					name: "production-chain",
					to: "/production-chain",
					icon: AccountTreeOutlined,
					display: true,
				},
				{
					label: "upkeep_price_calculator",
					name: "upkeep-price-calculator",
					to: "/upkeep-price-calculator",
					icon: ReceiptLongOutlined,
					display: true,
				},
			],
		},
		{
			label: "fio.fio",
			items: [
				{
					label: "fio_burn",
					name: "fio-burn",
					to: "/fio/burn",
					icon: LocalFireDepartmentOutlined,
					display: userStore.hasFIO,
				},
				{
					label: "fio_repair",
					name: "fio-repair",
					to: "/fio/repair",
					icon: BuildOutlined,
					display: userStore.hasFIO,
				},
			],
		},
	]);

	const tools: ComputedRef<INavItem[]> = computed(() =>
		toolGroups.value.flatMap((g) => g.items).filter((i) => i.display)
	);
	const toolActive = computed(() =>
		tools.value.some((i) => isActive(i.name))
	);

	// age of the FIO data, next to the FIO tools
	const fioSynced = computed(() =>
		planningStore.fio_storage_timestamp
			? relativeFromDate(planningStore.fio_storage_timestamp)
			: undefined
	);

	function toggleTools(): void {
		toolsOpen.value = !toolsOpen.value;
		try {
			localStorage.setItem(TOOLS_KEY, toolsOpen.value ? "1" : "0");
		} catch {
			// storage blocked: kept for this page only
		}
	}

	return {
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
	};
}
