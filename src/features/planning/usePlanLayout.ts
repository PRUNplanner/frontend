import {
	type Component,
	computed,
	type ComputedRef,
	defineAsyncComponent,
	nextTick,
	onUnmounted,
	ref,
	type Ref,
	useTemplateRef,
} from "vue";
import { useI18n } from "vue-i18n";

// Stores
import { useUserStore } from "@/stores/userStore";

// Composables
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Util
import {
	foldedPanes,
	type BaseSection,
	type PlanTool,
	type ResultTile,
} from "@/features/planning/planView.util";

// Production is the default view, a tool replaces it in place
type TabKey = PlanTool | "production";
type PhoneSection = "production" | "base" | "io" | "tools";

const TOOL_COMPONENTS: Record<PlanTool, Component> = {
	"visitation-frequency": defineAsyncComponent(
		() =>
			import("@/features/planning/components/tools/PlanVisitationFrequency.vue")
	),
	"repair-analysis": defineAsyncComponent(
		() =>
			import("@/features/planning/components/tools/PlanRepairAnalysis.vue")
	),
	popr: defineAsyncComponent(
		() => import("@/features/planning/components/tools/PlanPOPR.vue")
	),
	"supply-cart": defineAsyncComponent(
		() => import("@/features/planning/components/tools/PlanSupplyCart.vue")
	),
	"construction-cart": defineAsyncComponent(
		() =>
			import("@/features/planning/components/tools/PlanConstructionCart.vue")
	),
	"profit-breakdown": defineAsyncComponent(
		() =>
			import("@/features/planning/components/tools/PlanProfitBreakdown.vue")
	),
	"plan-check": defineAsyncComponent(
		() => import("@/features/planning/components/tools/PlanCheck.vue")
	),
};

// a strip: the pane's title read top-down, a detail below it
const stripClasses = {
	strip: "sticky top-20 shrink-0 w-10 flex-col items-center gap-3 py-2 rounded border border-line bg-surface text-muted-strong hover:border-line-strong hover:text-white cursor-pointer transition-colors",
	stripIcon:
		"flex items-center justify-center size-6 rounded-control bg-hover",
	stripTitle:
		"[writing-mode:vertical-rl] text-sm font-medium text-ink-strong",
	stripDetail: "[writing-mode:vertical-rl] text-xs text-muted",
};

/**
 * Plan page layout: the tool tabs, folding Base and Material I/O into
 * strips, their overlays on narrower pages, results tiles opening their
 * source and a phone's one section at a time. Binds the template refs
 * `layout` and `base`.
 * @author jplacht
 *
 * @param {ComputedRef<number>} flagCount Plan check flags, shown as a dot
 */
export function usePlanLayout(flagCount: ComputedRef<number>) {
	const { t } = useI18n();
	const userStore = useUserStore();
	const { view: planCheckView } = usePlanCheckView();

	/**
	 * Tool Setup
	 */
	const refShowTool: Ref<PlanTool | null> = ref(null);

	function toggleTool(key: PlanTool | null): void {
		const isVisisble = refShowTool.value === key;
		refShowTool.value = null;
		if (isVisisble) return;

		trackEvent("plan:tool_toggle", { panel: key });
		nextTick(() => {
			key != refShowTool.value
				? (refShowTool.value = key)
				: (refShowTool.value = null);
		});
	}

	// from the Material I/O: Plan check on its Market check, in place
	function openPlanCheck(): void {
		planCheckView.value = "market";
		refPhoneSection.value = "tools";
		if (refShowTool.value !== "plan-check") toggleTool("plan-check");
	}

	const toolTabs = computed(() =>
		(
			[
				["production", "plan.tools.labels.production"],
				["construction-cart", "plan.tools.labels.construction_cart"],
				["supply-cart", "plan.tools.labels.supply_cart"],
				[
					"visitation-frequency",
					"plan.tools.labels.visitation_frequency",
				],
				["repair-analysis", "plan.tools.labels.repair_analysis"],
				["profit-breakdown", "plan.tools.labels.profit_breakdown"],
				["plan-check", "plan.tools.labels.plan_check"],
				...(userStore.isLoggedIn
					? [["popr", "plan.tools.labels.popr"]]
					: []),
			] as [TabKey, string][]
		).map(([key, label]) => ({
			key,
			label: t(label),
			dot:
				key === "plan-check" && flagCount.value > 0
					? t(
							"plan.layout.flags",
							{ n: flagCount.value },
							flagCount.value
						)
					: undefined,
		}))
	);

	function selectTab(key: TabKey): void {
		if (key === "production") {
			if (refShowTool.value !== null) toggleTool(refShowTool.value);
		} else toggleTool(key);
	}

	const compViewToolComponent = computed(() =>
		refShowTool.value ? TOOL_COMPONENTS[refShowTool.value] : null
	);

	/*
	 * Folding: Base starts as a strip between 81 and 100rem of page width,
	 * wide tools fold Material I/O into one; a strip pins its pane open,
	 * over tool switches, until the user folds it again
	 */
	const refBasePinned: Ref<boolean> = ref(false);
	const refIOPinned: Ref<boolean> = ref(false);
	const folded = computed(() => foldedPanes(refShowTool.value));
	const baseFolded = computed(
		() => folded.value.base && !refBasePinned.value
	);
	const ioFolded = computed(() => folded.value.io && !refIOPinned.value);

	function pinPane(panel: "base" | "io", pinned: boolean): void {
		if (panel === "base") refBasePinned.value = pinned;
		else refIOPinned.value = pinned;
		trackEvent("plan:panel_fold", { panel, folded: !pinned });
	}

	// a results tile opens where its figure comes from: a Base section, in
	// whatever form Base has (a phone's section, the overlay below 81rem of
	// page width, a folded strip), or a tool in place of the production list
	const refLayout = useTemplateRef<HTMLElement>("layout");
	const refBase = useTemplateRef<{ openSection: (s: BaseSection) => void }>(
		"base"
	);

	// the user folds Base by hand, at any width it sits side by side
	const refBaseCollapsed: Ref<boolean> = ref(false);
	// the pressed button goes away: the focus moves to the one replacing it
	function focusLayout(selector: string): void {
		nextTick(() =>
			refLayout.value?.querySelector<HTMLElement>(selector)?.focus()
		);
	}
	function foldBase(): void {
		refBaseCollapsed.value = true;
		pinPane("base", false);
		focusLayout("[data-base-strip]");
	}
	function unfoldBase(): void {
		refBaseCollapsed.value = false;
		pinPane("base", true);
		focusLayout("[data-base-fold]");
	}
	// the same for Material I/O, side by side from 71rem; a wide tool folds it
	const refIOCollapsed: Ref<boolean> = ref(false);
	function foldIO(): void {
		refIOCollapsed.value = true;
		pinPane("io", false);
		focusLayout("[data-io-strip]");
	}
	function unfoldIO(): void {
		refIOCollapsed.value = false;
		pinPane("io", true);
		focusLayout("[data-io-fold]");
	}

	// below 1296 px of page width (a 1360 px window with the rail, 1544 px
	// with the full sidebar) Base opens as an overlay from the tab row
	const refBaseOverlay: Ref<boolean> = ref(false);
	// below 71rem of page width (a tablet) Material I/O does too
	const refIOOverlay: Ref<boolean> = ref(false);

	function toggleOverlay(panel: "base" | "io"): void {
		const open = panel === "base" ? refBaseOverlay : refIOOverlay;
		open.value = !open.value;
		if (!open.value) return;
		trackEvent("plan:overlay_open", { panel });
		// the focus goes in; Esc or Close brings it back to the toggle
		focusLayout(`[data-${panel}-close]`);
	}

	// Esc closes them, the focus goes back to their button
	function closeOverlays(): void {
		const open = refBaseOverlay.value
			? "[data-base-toggle]"
			: refIOOverlay.value
				? "[data-io-toggle]"
				: undefined;
		refBaseOverlay.value = false;
		refIOOverlay.value = false;
		if (open) document.querySelector<HTMLElement>(open)?.focus();
	}

	function openBase(section: BaseSection): void {
		if (refIsPhone.value) showSection("base");
		refBaseCollapsed.value = false;
		refBasePinned.value = true;
		const rem = parseFloat(
			getComputedStyle(document.documentElement).fontSize
		);
		if (
			!refIsPhone.value &&
			(refLayout.value?.clientWidth ?? Infinity) < 81 * rem
		)
			refBaseOverlay.value = true;
		nextTick(() => refBase.value?.openSection(section));
	}
	function openTool(key: PlanTool): void {
		if (refIsPhone.value) showSection("tools");
		if (refShowTool.value !== key) toggleTool(key);
	}
	function openTile(tile: ResultTile): void {
		trackEvent("plan:result_tile_open", { tile });
		if (tile === "area") openBase("planet");
		else if (tile === "workforce") openBase("workforce");
		else if (tile === "profit") openTool("profit-breakdown");
		else if (tile === "payback") openTool("construction-cart");
		else openTool("visitation-frequency");
	}

	/*
	 * A phone (below md, where the app shows its bottom bar): one section
	 * at a time, picked in a tab row under the results
	 */
	const phoneQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(max-width: 767.98px)")
			: null;
	const refIsPhone: Ref<boolean> = ref(phoneQuery?.matches ?? false);
	const onPhoneMedia = (e: MediaQueryListEvent) =>
		(refIsPhone.value = e.matches);
	phoneQuery?.addEventListener("change", onPhoneMedia);
	onUnmounted(() => phoneQuery?.removeEventListener("change", onPhoneMedia));

	const refPhoneSection: Ref<PhoneSection> = ref("production");
	function showSection(section: PhoneSection): void {
		if (section === refPhoneSection.value) return;
		refPhoneSection.value = section;
		trackEvent("plan:section_view", { section });
	}
	const phoneSections = computed(() => [
		{
			key: "production" as const,
			label: t("plan.tools.labels.production"),
		},
		{ key: "base" as const, label: t("plan.base.label") },
		{
			key: "io" as const,
			label: t("plan.components.materialio.label"),
			dot:
				flagCount.value > 0
					? t(
							"plan.layout.flags",
							{ n: flagCount.value },
							flagCount.value
						)
					: undefined,
		},
		{ key: "tools" as const, label: t("plan.layout.tools") },
	]);
	// on a phone only the picked section shows, elsewhere every pane
	const onPhone = (section: PhoneSection): boolean =>
		!refIsPhone.value || refPhoneSection.value === section;

	return {
		...stripClasses,
		refShowTool,
		toggleTool,
		openPlanCheck,
		toolTabs,
		selectTab,
		compViewToolComponent,
		baseFolded,
		ioFolded,
		pinPane,
		refBaseCollapsed,
		foldBase,
		unfoldBase,
		refIOCollapsed,
		foldIO,
		unfoldIO,
		refBaseOverlay,
		refIOOverlay,
		toggleOverlay,
		closeOverlays,
		openTile,
		refIsPhone,
		refPhoneSection,
		showSection,
		phoneSections,
		onPhone,
	};
}
