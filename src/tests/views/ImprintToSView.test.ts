import { describe, expect, it, vi } from "vitest";

import ImprintToSView from "@/views/ImprintToSView.vue";
import { mountComponent } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);

describe("ImprintToSView", () => {
	it("has its own title and description", async () => {
		await mountComponent(ImprintToSView);

		expect(head.useHead).toHaveBeenCalledWith({
			title: "homepage.seo.imprint_title",
			meta: [
				{
					name: "description",
					content: "homepage.seo.imprint_description",
				},
			],
		});
	});
});
