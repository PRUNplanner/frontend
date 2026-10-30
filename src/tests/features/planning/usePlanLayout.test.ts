import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computed, nextTick, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { usePlanLayout } from "@/features/planning/usePlanLayout";
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { useUserStore } from "@/stores/userStore";
import { mountComposable } from "@/tests/mountComponent";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));

const pinia = createPinia();
const flags = ref(0);
let media: {
	matches: boolean;
	addEventListener: ReturnType<typeof vi.fn>;
	removeEventListener: ReturnType<typeof vi.fn>;
};

async function mountLayout() {
	return mountComposable(() => usePlanLayout(computed(() => flags.value)), {
		pinia,
	});
}

describe("usePlanLayout", () => {
	beforeEach(() => {
		setActivePinia(pinia);
		vi.clearAllMocks();
		flags.value = 0;
		media = {
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => media)
		);
	});

	afterEach(() => vi.unstubAllGlobals());

	it("opens a tool in place of production, a second press closes it", async () => {
		const { result: layout } = await mountLayout();

		layout.selectTab("supply-cart");
		await nextTick();
		expect(layout.refShowTool.value).toBe("supply-cart");
		expect(layout.compViewToolComponent.value).not.toBeNull();
		expect(trackEvent).toHaveBeenCalledWith("plan:tool_toggle", {
			panel: "supply-cart",
		});

		layout.selectTab("production");
		await nextTick();
		expect(layout.refShowTool.value).toBeNull();
		expect(layout.compViewToolComponent.value).toBeNull();

		layout.toggleTool("popr");
		await nextTick();
		layout.toggleTool("popr");
		await nextTick();
		expect(layout.refShowTool.value).toBeNull();
	});

	it("lists POPR for logged in users and a dot for plan check flags", async () => {
		const { result: layout } = await mountLayout();
		expect(layout.toolTabs.value.map((t) => t.key)).not.toContain("popr");
		expect(layout.toolTabs.value.every((t) => !t.dot)).toBe(true);

		useUserStore().$patch({ accessToken: "a", refreshToken: "r" });
		flags.value = 2;
		expect(layout.toolTabs.value.map((t) => t.key)).toContain("popr");
		expect(
			layout.toolTabs.value.find((t) => t.key === "plan-check")?.dot
		).toBe("plan.layout.flags");
		expect(layout.phoneSections.value[2].dot).toBe("plan.layout.flags");
		useUserStore().$patch({
			accessToken: undefined,
			refreshToken: undefined,
		});
	});

	it("folds Base into a strip and pins it open, tracked", async () => {
		const { result: layout } = await mountLayout();
		expect(layout.baseFolded.value).toBe(true);
		expect(layout.ioFolded.value).toBe(false);

		layout.unfoldBase();
		expect(layout.baseFolded.value).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("plan:panel_fold", {
			panel: "base",
			folded: false,
		});

		layout.foldBase();
		expect(layout.refBaseCollapsed.value).toBe(true);
		expect(layout.baseFolded.value).toBe(true);

		layout.foldIO();
		expect(layout.refIOCollapsed.value).toBe(true);
		layout.unfoldIO();
		expect(layout.refIOCollapsed.value).toBe(false);
	});

	it("opens and closes the overlays, Esc returns the focus", async () => {
		const { result: layout } = await mountLayout();
		const toggle = document.createElement("button");
		toggle.dataset.ioToggle = "";
		document.body.append(toggle);

		layout.toggleOverlay("io");
		expect(layout.refIOOverlay.value).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("plan:overlay_open", {
			panel: "io",
		});

		layout.closeOverlays();
		expect(layout.refIOOverlay.value).toBe(false);
		expect(document.activeElement).toBe(toggle);
		toggle.remove();

		layout.toggleOverlay("base");
		layout.toggleOverlay("base");
		expect(layout.refBaseOverlay.value).toBe(false);
	});

	it("opens a results tile where its figure comes from", async () => {
		const { result: layout } = await mountLayout();

		layout.openTile("profit");
		await nextTick();
		expect(layout.refShowTool.value).toBe("profit-breakdown");
		expect(trackEvent).toHaveBeenCalledWith("plan:result_tile_open", {
			tile: "profit",
		});

		layout.openTile("area");
		expect(layout.refBaseCollapsed.value).toBe(false);
		expect(layout.baseFolded.value).toBe(false);
	});

	it("opens Plan check on its market view from Material I/O", async () => {
		const { result: layout } = await mountLayout();
		const { view } = usePlanCheckView();
		view.value = "what_if" as typeof view.value;

		layout.openPlanCheck();
		await nextTick();
		expect(view.value).toBe("market");
		expect(layout.refPhoneSection.value).toBe("tools");
		expect(layout.refShowTool.value).toBe("plan-check");
	});

	it("shows one section at a time on a phone and stops listening on unmount", async () => {
		media.matches = true;
		const { result: layout, wrapper } = await mountLayout();
		expect(layout.refIsPhone.value).toBe(true);
		expect(layout.onPhone("base")).toBe(false);

		layout.showSection("base");
		layout.showSection("base");
		expect(layout.onPhone("base")).toBe(true);
		expect(trackEvent).toHaveBeenCalledTimes(1);

		const onChange = media.addEventListener.mock.calls[0][1];
		onChange({ matches: false });
		expect(layout.onPhone("production")).toBe(true);

		wrapper.unmount();
		expect(media.removeEventListener).toHaveBeenCalledWith(
			"change",
			onChange
		);
	});
});
