import {
	expect,
	beforeAll,
	beforeEach,
	afterAll,
	afterEach,
	vi,
	type Mock,
} from "vitest";
import {
	config,
	DOMWrapper,
	flushPromises,
	type VueWrapper,
} from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Component } from "vue";
import PlanView from "@/views/PlanView.vue";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import { mountComponent } from "@/tests/mountComponent";
import { calcDebug } from "@/lib/debugMode";
import { remoteChange } from "@/lib/crossTab";
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";
import {
	emptyPlan,
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import empire_list from "@/tests/test_data/api_data_empire_list.json";
import cx_list from "@/tests/test_data/api_data_cx_list.json";

vi.mock("@unhead/vue", () => ({
	useHead: (...args: unknown[]) => mocks.useHead(...args),
}));

// vi.mock factories are hoisted, so are their helpers. A tool chunk
// loads once its gate opens. __esModule lets defineAsyncComponent pick
// the default export of a mocked module
const { gate, tool, stub, attrsTool, mocks } = vi.hoisted(() => ({
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
	// a tool that keeps the props it gets readable as $attrs
	attrsTool: async (name: string) => {
		const { h } = await import("vue");
		return {
			__esModule: true,
			default: { name, inheritAttrs: false, render: () => h("p", name) },
		};
	},
	mocks: {
		query: vi.fn(),
		getPlanet: vi.fn(),
		push: vi.fn(),
		toast: vi.fn(),
		useHead: vi.fn(),
		openInsights: vi.fn(),
	} as Record<
		"query" | "getPlanet" | "push" | "toast" | "useHead" | "openInsights",
		Mock
	>,
}));
vi.mock("@/features/planning/components/debug/PlanCalcDebug.vue", async () => {
	const { h } = await import("vue");
	return {
		__esModule: true,
		default: {
			name: "PlanCalcDebug",
			props: ["plan", "meta"],
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
vi.mock(
	"@/features/planning/components/tools/PlanVisitationFrequency.vue",
	() => attrsTool("PlanVisitationFrequency")
);
vi.mock("@/features/planning/components/tools/PlanRepairAnalysis.vue", () =>
	attrsTool("PlanRepairAnalysis")
);
vi.mock("@/features/planning/components/tools/PlanPOPR.vue", () =>
	attrsTool("PlanPOPR")
);
vi.mock("@/features/planning/components/tools/PlanProfitBreakdown.vue", () =>
	attrsTool("PlanProfitBreakdown")
);
vi.mock("@/features/planning/components/tools/PlanCheck.vue", () =>
	attrsTool("PlanCheck")
);
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({
		getPlanet: mocks.getPlanet,
		planetName: (id: string) => `Planet ${id}`,
	}),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, args: unknown) => ({
		execute: (options?: unknown) => mocks.query(name, args, options),
	}),
}));
vi.mock("@/router", () => ({ default: { push: mocks.push } }));
vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
	flushPlanEdits: vi.fn(),
}));
vi.mock("@/features/planning/calculations/habOptimization", async (orig) => {
	const actual =
		await orig<
			typeof import("@/features/planning/calculations/habOptimization")
		>();
	return { ...actual, optimizeHabs: vi.fn(actual.optimizeHabs) };
});
vi.mock("@/lib/useUnsavedGuard", async (orig) => {
	const actual = await orig<typeof import("@/lib/useUnsavedGuard")>();
	return { ...actual, useUnsavedGuard: vi.fn(actual.useUnsavedGuard) };
});
// the Base panel's planet link opens the box through its exposed open()
vi.mock("@/features/plan_analytics/components/PlanAnalyticsBox.vue", () => ({
	__esModule: true,
	default: {
		name: "PlanAnalyticsBox",
		setup(_: unknown, { expose }: { expose: (e: object) => void }) {
			expose({ open: mocks.openInsights });
			return () => null;
		},
	},
}));
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/ui/useToast", () => ({
	useToast: () => mocks.toast,
	toast: vi.fn(),
}));

export const errors: unknown[] = [];

export const PLAN_UUID = etherwindPlan().uuid!;
export const SAVED_AT = "2026-10-02T08:00:00.000000Z";
export const SKY_EMPIRE = "32aed118-c4ed-4a4e-9eb4-3cf6aa0068da";
export const SKY_CX = "8eec58c8-7fcb-4bc6-bfc9-56879d297a18";
export const SHARE_EMPIRE = "a208d74e-d07f-4722-8192-9b55d4140f58";
export const SHARE_CX = "41c6f4dc-d1cd-4bde-b61a-c1595101d980";
// the other empire the fixture plan is in, after Sky Productions
export const PRUN_REAL = "cfddf9ec-6f9b-4c74-affb-bd55fd1f8aa6";

export const empires = () =>
	structuredClone(empire_list) as unknown as PlanEmpireElement[];
export const cxs = () => structuredClone(cx_list) as unknown as CX[];

/** A plan that was never saved */
export function newPlan(): IPlanDefinition {
	return { ...emptyPlan(), uuid: undefined, plan_name: undefined };
}

/** A plan with content that was never saved, like a shared plan's copy */
export function draftPlan(): IPlanDefinition {
	return { ...etherwindPlan(), uuid: undefined, empires: [] };
}

export interface IMountOptions {
	login?: boolean;
	// in the document, for focus
	attach?: boolean;
	seed?: (stores: {
		user: ReturnType<typeof useUserStore>;
		planning: ReturnType<typeof usePlanningStore>;
	}) => void;
}

export async function mountView(
	props: Record<string, unknown> = {},
	options: IMountOptions = {}
) {
	const pinia = createPinia();
	setActivePinia(pinia);
	const user = useUserStore();
	const planning = usePlanningStore();
	if (options.login) {
		user.accessToken = "access";
		user.refreshToken = "refresh";
	}
	options.seed?.({ user, planning });

	const mounted = await mountComponent(
		PlanView,
		{ planData: etherwindPlan(), ...props },
		{ pinia, attach: options.attach }
	);
	// the children load game data, Suspense shows the page once they did
	await vi.waitFor(() =>
		expect(mounted.wrapper.findComponent(PlanProduction).exists()).toBe(
			true
		)
	);
	return { ...mounted, user, planning };
}

export type Mounted = Awaited<ReturnType<typeof mountView>>;

/** Answers the backend queries by name; the rest resolve undefined */
export function respond(
	handlers: Record<string, (args: any, options?: any) => unknown>
) {
	mocks.query.mockImplementation(async (name, args, options) =>
		handlers[name]?.(args, options)
	);
}

export function queryCalls(name: string) {
	return mocks.query.mock.calls.filter(([n]) => n === name);
}

export function press(init: KeyboardEventInit, target?: HTMLElement) {
	const event = new KeyboardEvent("keydown", {
		bubbles: true,
		cancelable: true,
		...init,
	});
	if (target) target.dispatchEvent(event);
	else window.dispatchEvent(event);
	return event;
}

export async function emitFrom(
	wrapper: VueWrapper,
	component: Component,
	event: string,
	...args: unknown[]
) {
	wrapper.findComponent(component).vm.$emit(event, ...args);
	await flushPromises();
}

export async function openTool(wrapper: VueWrapper, label: string) {
	await wrapper
		.findAll("nav button")
		.find((b) => b.text() === label)!
		.trigger("click");
	await flushPromises();
}

export const dialog = () => new DOMWrapper(document.body).find("[role=dialog]");

export const dialogButton = (label: string) =>
	dialog()
		.findAll("button")
		.find((b) => b.text() === label)!;

/** Renames the plan in the header: pencil, type, Enter */
export async function rename(wrapper: VueWrapper, name: string) {
	const pencil = wrapper.find("button[aria-label='plan.header.rename']");
	if (pencil.exists()) await pencil.trigger("click");
	await flushPromises();
	const input = wrapper.find("input[aria-label='plan.header.name']");
	await input.setValue(name);
	await input.trigger("keydown", { key: "Enter" });
	await flushPromises();
}

/** Calculation debug from the ⋯ menu */
export async function openDebug(wrapper: VueWrapper) {
	wrapper.findComponent({ name: "PlanMoreMenu" }).vm.$emit("debug");
	await flushPromises();
}

/** What the debug panel names: plan, planet, CX and empire */
export function debugMeta(wrapper: VueWrapper) {
	return wrapper.findComponent({ name: "PlanCalcDebug" }).props("meta");
}

// the production list stays mounted under a tool, v-show hides it
export const productionShown = (wrapper: VueWrapper): boolean =>
	(wrapper.find("[data-production]").element as HTMLElement).style
		.display !== "none";

/** Catches a file download: returns the spy on the link's click */
export function stubDownload() {
	const click = vi
		.spyOn(HTMLAnchorElement.prototype, "click")
		.mockImplementation(() => undefined);
	vi.stubGlobal("URL", {
		...URL,
		createObjectURL: vi.fn(() => "blob:csv"),
		revokeObjectURL: vi.fn(),
	});
	return click;
}

export function buildingAmounts(wrapper: VueWrapper): Record<string, number> {
	const production = wrapper
		.findComponent(PlanProduction)
		.props("productionData") as {
		buildings: { name: string; amount: number }[];
	};
	return Object.fromEntries(
		production.buildings.map((b) => [b.name, b.amount])
	);
}

/** The arguments of the last toast */
export function lastToast() {
	return mocks.toast.mock.calls.at(-1)!;
}

export function lastTitle(): string {
	return mocks.useHead.mock.calls.at(-1)![0].title.value;
}

/** Registers the hooks every PlanView suite needs */
export function setupPlanViewSuite(): void {
	beforeAll(async () => {
		await setupPlanningTestData();
		config.global.config.errorHandler = (err) => {
			errors.push(err);
		};
	});
	afterAll(() => {
		config.global.config.errorHandler = undefined;
	});
	beforeEach(() => {
		// a test may answer differently, see respond()
		mocks.query.mockResolvedValue(undefined);
		mocks.getPlanet.mockResolvedValue(planet_etherwind);
		mocks.toast.mockImplementation(() => ({ destroy: vi.fn() }));
		remoteChange.value = null;
	});
	afterEach(() => {
		errors.length = 0;
		calcDebug.value = false;
		vi.restoreAllMocks();
	});
}

export { mocks, constructionCart, supplyCart };
