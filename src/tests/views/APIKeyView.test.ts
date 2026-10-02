import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import APIKeyView from "@/views/APIKeyView.vue";
import PTable from "@/ui/components/PTable.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { APIKey } from "@/features/api/schemas/apiKeysData.schemas";

const keys = vi.hoisted(() => ({ value: [] as APIKey[] }));

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ execute: async () => keys.value }),
}));

async function mountView(data: APIKey[]) {
	keys.value = data;
	const mounted = await mountComponent(APIKeyView);
	await flushPromises();
	return mounted;
}

describe("APIKeyView", () => {
	it("renders the manage heading key", async () => {
		const { wrapper } = await mountView([]);
		expect(wrapper.find("h2").text()).toBe("api_keys.manage.title");
	});

	it("shows the empty state without keys", async () => {
		const { wrapper } = await mountView([]);
		expect(wrapper.findComponent(PTable).exists()).toBe(false);
		expect(wrapper.text()).toContain("api_keys.manage.empty");
	});

	it("lists keys in the table", async () => {
		const { wrapper } = await mountView([
			{
				id: "1",
				name: "Sheet",
				prefix: "abc",
				created: new Date("2026-01-01"),
				last_used: null,
			},
		]);
		expect(wrapper.findComponent(PTable).text()).toContain("Sheet");
		expect(wrapper.text()).not.toContain("api_keys.manage.empty");
	});
});
