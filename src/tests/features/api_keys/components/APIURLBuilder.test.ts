import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { Slots } from "vue";

import APIURLBuilder from "@/features/api_keys/components/APIURLBuilder.vue";
import { PInput, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { copyToClipboard } from "@/util/data";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import config from "@/lib/config";

// vi.mock factories are hoisted, so are their helpers
const { lists, passThrough } = vi.hoisted(() => ({
	// the user's planning data per query for the next mount
	lists: {} as Record<string, unknown[]>,
	passThrough: (name: string) => ({
		default: {
			name,
			setup:
				(_: unknown, { slots }: { slots: Slots }) =>
				() =>
					slots.default?.(),
		},
	}),
}));

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({ execute: async () => lists[name] ?? [] }),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock("@/util/data", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/util/data")>()),
	copyToClipboard: vi.fn(async () => true),
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);

const BASE = config.API_BASE_URL;
const EMPIRE = "11111111-1111-4111-8111-111111111111";

async function mountBuilder(apiKey: string | null = null) {
	const { wrapper } = await mountComponent(APIURLBuilder, { apiKey });
	await flushPromises();
	return wrapper;
}

async function pickEndpoint(
	wrapper: Awaited<ReturnType<typeof mountBuilder>>,
	id: string
) {
	wrapper.findComponent(PSelect).vm.$emit("update:value", id);
	await flushPromises();
}

const snippet = (
	wrapper: Awaited<ReturnType<typeof mountBuilder>>,
	kind: string
) => wrapper.find(`[data-snippet="${kind}"] pre`);

describe("APIURLBuilder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		lists.GetAllEmpires = [{ uuid: EMPIRE, empire_name: "Main" }];
		lists.GetAllPlans = [
			{ uuid: "p-1", plan_name: "Farm", planet_natural_id: "OT-580b" },
		];
		lists.GetAllCX = [{ uuid: "c-1", cx_name: "Default" }];
	});

	it("builds the empire material I/O URL for the first empire", async () => {
		const wrapper = await mountBuilder();
		const url = `${BASE}/planning/empire/${EMPIRE}/material_io/csv/?api_key=<YOUR_KEY>`;
		expect(snippet(wrapper, "url").text()).toBe(url);
		expect(snippet(wrapper, "sheets").text()).toBe(`=IMPORTDATA("${url}")`);
		expect(wrapper.findAll("pre.ph-no-capture")).toHaveLength(4);
		expect(wrapper.text()).toContain("api_keys.builder.freshness");
	});

	it("hides the Sheets box for JSON", async () => {
		const wrapper = await mountBuilder();
		const json = wrapper
			.findAll("button")
			.find((b) => b.text() === "JSON")!;
		await json.trigger("click");
		expect(snippet(wrapper, "sheets").exists()).toBe(false);
		expect(snippet(wrapper, "url").text()).toContain("/material_io/?");
	});

	it("shows the key warning only with a real key", async () => {
		expect((await mountBuilder()).text()).not.toContain(
			"api_keys.builder.key_warning"
		);
		const wrapper = await mountBuilder("real");
		expect(wrapper.text()).toContain("api_keys.builder.key_warning");
		expect(snippet(wrapper, "url").text()).toContain("?api_key=real");
	});

	it("shows only the inputs an endpoint needs", async () => {
		const wrapper = await mountBuilder();
		// endpoint and empire
		expect(wrapper.findAllComponents(PSelect)).toHaveLength(2);

		await pickEndpoint(wrapper, "materials");
		expect(wrapper.findAllComponents(PSelect)).toHaveLength(1);
		expect(wrapper.text()).not.toContain("api_keys.builder.format");

		await pickEndpoint(wrapper, "market_history");
		// endpoint, ticker, exchange
		expect(wrapper.findAllComponents(PSelect)).toHaveLength(3);

		await pickEndpoint(wrapper, "market_daily");
		// endpoint, exchange, days
		expect(wrapper.findAllComponents(PSelect)).toHaveLength(3);
		expect(snippet(wrapper, "sheets").text()).toBe(
			`=IMPORTDATA("${BASE}/data/cxpc/daily/csv/?days=7&exchange=AI1")`
		);

		await pickEndpoint(wrapper, "planet");
		expect(wrapper.findComponent(PInput).exists()).toBe(true);
		expect(wrapper.text()).toContain("api_keys.builder.incomplete");
	});

	it("puts the picked plan's UUID into One plan", async () => {
		const wrapper = await mountBuilder();
		await pickEndpoint(wrapper, "plan");
		expect(snippet(wrapper, "url").text()).toBe(
			`${BASE}/planning/plan/p-1/?api_key=<YOUR_KEY>`
		);
		expect(snippet(wrapper, "sheets").exists()).toBe(false);
	});

	it.each([
		["GetAllEmpires", "empire_material_io", "empire"],
		["GetAllPlans", "plan", "plan"],
		["GetAllCX", "cx", "cx"],
	])(
		"without %s it links to Manage and builds no URL",
		async (query, endpoint, param) => {
			lists[query] = [];
			const wrapper = await mountBuilder();
			await pickEndpoint(wrapper, endpoint);
			expect(wrapper.text()).toContain(`api_keys.builder.empty.${param}`);
			expect(wrapper.find("pre").exists()).toBe(false);
		}
	);

	it("tracks no copy that failed", async () => {
		vi.mocked(copyToClipboard).mockResolvedValueOnce(false);
		const wrapper = await mountBuilder("real");
		await wrapper
			.find('[data-snippet="curl"]')
			.find("button")
			.trigger("click");
		await flushPromises();
		expect(trackEvent).not.toHaveBeenCalledWith(
			"apikey:snippet_copy",
			expect.anything()
		);
	});

	it("copies exactly the shown text and tracks no key", async () => {
		const wrapper = await mountBuilder("real");
		const box = wrapper.find('[data-snippet="curl"]');
		await box.find("button").trigger("click");
		await flushPromises();
		expect(copyToClipboard).toHaveBeenCalledWith(box.find("pre").text());
		expect(trackEvent).toHaveBeenCalledWith("apikey:snippet_copy", {
			endpoint: "empire_material_io",
			format: "csv",
			kind: "curl",
			has_key: true,
		});
		expect(JSON.stringify(vi.mocked(trackEvent).mock.calls)).not.toMatch(
			/real|111111/
		);
	});
});
