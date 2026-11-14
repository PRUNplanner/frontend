import { describe, expect, it, vi } from "vitest";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";

import HelpView from "@/views/HelpView.vue";
import { GUIDES } from "@/features/help/helpArticles";
import { mountComponent } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {}, hash: "" }),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	reportError: vi.fn(),
}));

// the view loads the changelog before it renders
async function mountView(options: Parameters<typeof mountComponent>[2] = {}) {
	const mounted = await mountComponent(HelpView, {}, options);
	await vi.waitFor(async () => {
		await flushPromises();
		expect(mounted.wrapper.find("h1").exists()).toBe(true);
	});
	return mounted;
}

describe("HelpView", () => {
	it("sets the page title and description", async () => {
		await mountView();

		expect(head.useHead).toHaveBeenCalledWith({
			title: "help.view_title",
			meta: [{ name: "description", content: "help.home.description" }],
		});
	});

	it("shows search, most read, every area and where to ask", async () => {
		const { wrapper } = await mountView();

		expect(wrapper.find("h1").text()).toBe("help.home.title");
		const links = wrapper
			.findAllComponents({ name: "RouterLinkStub" })
			.map((l) => l.props("to"));
		expect(links).toContain("/help/plan_check");
		expect(links).toContain("/help/tools_market_live");
		expect(links).toContain("/help/whats-new");
		expect(wrapper.text()).toContain("help.areas.planning");
		expect(wrapper.text()).toContain("help.home.stuck_title");
	});

	it("shows the latest release only", async () => {
		const { wrapper } = await mountView();
		const card = wrapper.find("[data-testid=help-whats-new]");
		expect(card.text()).toContain("0.36.0");
		expect(card.text()).toContain("Plan layouts");
		expect(card.text()).not.toContain("0.35.1");
	});

	it("starts with the guides and has a glossary card", async () => {
		const { wrapper } = await mountView();
		const linksIn = (testid: string) => {
			const box = wrapper.find(`[data-testid=${testid}]`).element;
			return wrapper
				.findAllComponents(RouterLinkStub)
				.filter((l) => box.contains(l.element));
		};
		const guides = linksIn("help-guides");
		expect(guides.map((l) => l.props("to"))).toEqual(
			GUIDES.map((id) => `/help/${id}`)
		);
		expect(guides[0]!.text()).toContain("help.guides.guide_first_base");

		const chips = linksIn("help-glossary").map((l) => l.props("to"));
		expect(chips).toContain("/help/glossary#cogm");
		expect(chips).toContain("/help/glossary#ghost-sites");
		expect(chips).toContain("/help/glossary");
	});

	it("opens the search from its box and on /", async () => {
		const { wrapper } = await mountView({ attach: true });
		await wrapper.find("[data-testid=help-home-search]").trigger("click");
		await vi.waitFor(async () => {
			await flushPromises();
			expect(document.querySelector("[role=dialog]")).not.toBeNull();
		});
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await flushPromises();
		await vi.waitFor(() =>
			expect(document.querySelector("[role=dialog]")).toBeNull()
		);

		// typing in a field doesn't open it
		const field = document.createElement("input");
		document.body.appendChild(field);
		field.dispatchEvent(
			new KeyboardEvent("keydown", { key: "/", bubbles: true })
		);
		await flushPromises();
		expect(document.querySelector("[role=dialog]")).toBeNull();
		field.remove();

		window.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
		await vi.waitFor(async () => {
			await flushPromises();
			expect(document.querySelector("[role=dialog]")).not.toBeNull();
		});
	});
});
