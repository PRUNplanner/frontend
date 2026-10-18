import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { config, flushPromises } from "@vue/test-utils";

import PlanView from "@/views/PlanView.vue";
import { mountComponent } from "@/tests/mountComponent";
import { calcDebug } from "@/lib/debugMode";
import {
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. A tool chunk
// loads once its gate opens. __esModule lets defineAsyncComponent pick
// the default export of a mocked module
const { gate, tool, stub } = vi.hoisted(() => ({
	gate: () => {
		let open!: () => void;
		const loaded = new Promise<void>((r) => (open = r));
		return { loaded, open };
	},
	tool: async (name: string, loaded: Promise<void>) => {
		const { h } = await import("vue");
		await loaded;
		return {
			__esModule: true,
			default: { name, render: () => h("p", name) },
		};
	},
	stub: (name: string) => ({
		__esModule: true,
		default: { name, render: () => null },
	}),
}));
const debugPanel = vi.hoisted(() => ({ loads: 0 }));
vi.mock("@/features/planning/components/debug/PlanCalcDebug.vue", async () => {
	debugPanel.loads++;
	const { h } = await import("vue");
	return {
		__esModule: true,
		default: {
			name: "PlanCalcDebug",
			props: ["plan"],
			render(this: { plan?: { plan_name?: string } }) {
				return h("p", `debug panel ${this.plan?.plan_name}`);
			},
		},
	};
});
const constructionCart = vi.hoisted(() => gate());
const supplyCart = vi.hoisted(() => gate());

vi.mock("@/features/planning/components/tools/PlanConstructionCart.vue", () =>
	tool("PlanConstructionCart", constructionCart.loaded)
);
vi.mock("@/features/planning/components/tools/PlanSupplyCart.vue", () =>
	tool("PlanSupplyCart", supplyCart.loaded)
);
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ getPlanet: async () => planet_etherwind }),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ execute: async () => undefined }),
}));
vi.mock("@/features/plan_analytics/components/PlanAnalyticsBox.vue", () =>
	stub("PlanAnalyticsBox")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/ui/useToast", () => ({ useToast: () => () => {} }));

const errors: unknown[] = [];

describe("PlanView", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
		config.global.config.errorHandler = (err) => {
			errors.push(err);
		};
	});
	afterAll(() => {
		config.global.config.errorHandler = undefined;
	});
	afterEach(() => {
		errors.length = 0;
	});

	// #561: switching to another tool while the first one still loads and
	// shows its spinner left the view broken until a reload
	it("switches tools while the first tool still loads", async () => {
		const { wrapper } = await mountComponent(PlanView, {
			planData: etherwindPlan(),
		});
		const toolTab = (label: string) =>
			wrapper
				.findAll("nav button")
				.find((b) => b.text() === `plan.tools.labels.${label}`)!;

		await toolTab("construction_cart").trigger("click");
		await flushPromises();
		// the fallback shows its spinner after 200 ms
		await new Promise((r) => setTimeout(r, 250));

		await toolTab("supply_cart").trigger("click");
		await flushPromises();
		constructionCart.open();
		supplyCart.open();
		await flushPromises();

		expect(errors).toEqual([]);
		expect(wrapper.text()).toContain("PlanSupplyCart");
		expect(wrapper.text()).not.toContain("PlanConstructionCart");
	});

	it("has no Debug button and loads no panel with debug off", async () => {
		calcDebug.value = false;
		const { wrapper } = await mountComponent(PlanView, {
			planData: etherwindPlan(),
		});

		expect(wrapper.find("[data-calc-debug-button]").exists()).toBe(false);
		window.dispatchEvent(
			new KeyboardEvent("keydown", { code: "Backquote", ctrlKey: true })
		);
		await flushPromises();
		expect(debugPanel.loads).toBe(0);
	});

	it("opens the debug panel with the button and Ctrl+`", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountComponent(PlanView, {
			planData: etherwindPlan(),
		});
		const button = wrapper.find("[data-calc-debug-button]");
		expect(button.exists()).toBe(true);

		await button.trigger("click");
		await flushPromises();
		expect(wrapper.text()).toContain("debug panel");
		expect(button.attributes("aria-pressed")).toBe("true");

		window.dispatchEvent(
			new KeyboardEvent("keydown", { code: "Backquote", metaKey: true })
		);
		await flushPromises();
		expect(wrapper.text()).not.toContain("debug panel");

		window.dispatchEvent(
			new KeyboardEvent("keydown", { code: "Backquote", ctrlKey: true })
		);
		await flushPromises();
		expect(wrapper.text()).toContain("debug panel");

		// the panel shows what save sends, a rename included
		await wrapper
			.findAll("nav button")
			.find((b) => b.text() === "plan.components.configuration.label")!
			.trigger("click");
		await flushPromises();
		wrapper
			.findComponent({ name: "PlanConfiguration" })
			.vm.$emit("update:plan-name", "Renamed plan");
		await flushPromises();
		expect(wrapper.text()).toContain("debug panel Renamed plan");
		calcDebug.value = false;
	});
});
