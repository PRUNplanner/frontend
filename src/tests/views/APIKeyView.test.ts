import { describe, it, expect, vi, beforeEach, onTestFinished } from "vitest";
import { flushPromises } from "@vue/test-utils";

import APIKeyView from "@/views/APIKeyView.vue";
import APIURLBuilder from "@/features/api_keys/components/APIURLBuilder.vue";
import PTable from "@/ui/components/PTable.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { APIKey } from "@/features/api/schemas/apiKeysData.schemas";

const { keys, calls } = vi.hoisted(() => ({
	keys: { value: [] as APIKey[] },
	calls: [] as { name: string; params: unknown }[],
}));

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			calls.push({ name, params });
			if (name === "PostCreateAPIKey") return { api_key: "secret-key" };
			if (name === "DeleteAPIKey") {
				keys.value = [];
				return true;
			}
			return name === "GetAPIKeys" ? keys.value : [];
		},
	}),
}));
vi.mock("@/features/api_keys/components/APIURLBuilder.vue", () => ({
	default: {
		name: "APIURLBuilder",
		props: ["apiKey"],
		render: () => null,
	},
}));

const KEY: APIKey = {
	id: "1",
	name: "Sheet",
	prefix: "abc",
	created: new Date("2026-01-01"),
	last_used: null,
};

async function mountView(data: APIKey[]) {
	keys.value = data;
	const mounted = await mountComponent(
		APIKeyView,
		{},
		{ withDialog: true, attach: true }
	);
	await flushPromises();
	return mounted;
}

const button = (label: string) =>
	[...document.body.querySelectorAll("button")].find(
		(b) => b.textContent?.trim() === label
	)!;

describe("APIKeyView", () => {
	beforeEach(() => {
		calls.length = 0;
	});

	it("renders the manage heading key", async () => {
		const { wrapper } = await mountView([]);
		expect(
			wrapper.findAll("h2").map((h) => h.text())
		).toContain("api_keys.manage.title");
	});

	it("shows the empty state without keys", async () => {
		const { wrapper } = await mountView([]);
		expect(wrapper.findComponent(PTable).exists()).toBe(false);
		expect(wrapper.text()).toContain("api_keys.manage.empty");
	});

	it("lists keys in the table and as cards, never used as Never", async () => {
		const { wrapper } = await mountView([KEY]);
		expect(wrapper.findComponent(PTable).text()).toContain("Sheet");
		expect(wrapper.find("ul li").text()).toContain("Sheet");
		expect(wrapper.findComponent(PTable).text()).toContain(
			"api_keys.manage.never"
		);
		expect(wrapper.text()).not.toContain("api_keys.manage.empty");
	});

	it("revokes only after the confirm", async () => {
		const { wrapper } = await mountView([KEY]);

		await wrapper
			.findComponent(PTable)
			.find("button")
			.trigger("click");
		await flushPromises();
		expect(document.body.textContent).toContain(
			"api_keys.confirm_revoke.title"
		);
		button("api_keys.confirm_revoke.negative").click();
		await flushPromises();
		expect(calls.some((c) => c.name === "DeleteAPIKey")).toBe(false);

		await wrapper
			.findComponent(PTable)
			.find("button")
			.trigger("click");
		await flushPromises();
		button("api_keys.confirm_revoke.positive").click();
		await flushPromises();
		expect(calls).toContainEqual({
			name: "DeleteAPIKey",
			params: { id: "1" },
		});
		expect(wrapper.findComponent(PTable).exists()).toBe(false);
	});

	it("passes a new key to the URL builder", async () => {
		const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
		onTestFinished(() => scroll.mockRestore());
		const { wrapper } = await mountView([]);
		expect(wrapper.findComponent(APIURLBuilder).props("apiKey")).toBeNull();

		button("api_keys.manage.buttons.new_apikey").click();
		await flushPromises();
		const input = document.body.querySelector(
			"form input"
		) as HTMLInputElement;
		input.value = "Sheet";
		input.dispatchEvent(new Event("input"));
		await flushPromises();
		// Enter submits the form
		input.form!.requestSubmit();
		await flushPromises();

		const key = document.body.querySelector('[data-testid="created-key"]')!;
		expect(key.textContent?.trim()).toBe("secret-key");
		expect(key.classList).toContain("ph-no-capture");

		button("api_keys.create.buttons.use_in_builder").click();
		await flushPromises();
		expect(wrapper.findComponent(APIURLBuilder).props("apiKey")).toBe(
			"secret-key"
		);
		expect(scroll).toHaveBeenCalled();
	});

	it("opens at the name again after closing with X on the key step", async () => {
		await mountView([]);
		button("api_keys.manage.buttons.new_apikey").click();
		await flushPromises();
		const input = document.body.querySelector(
			"form input"
		) as HTMLInputElement;
		input.value = "Sheet";
		input.dispatchEvent(new Event("input"));
		await flushPromises();
		input.form!.requestSubmit();
		await flushPromises();
		expect(
			document.body.querySelector('[data-testid="created-key"]')
		).not.toBeNull();

		(
			document.body.querySelector(
				'[aria-label="common.ui.close"]'
			) as HTMLButtonElement
		).click();
		await flushPromises();
		button("api_keys.manage.buttons.new_apikey").click();
		await flushPromises();

		expect(
			document.body.querySelector('[data-testid="created-key"]')
		).toBeNull();
		expect(document.body.querySelector("form input")).not.toBeNull();
	});
});
