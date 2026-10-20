import { describe, expect, it, vi } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";

import NotFoundView from "@/views/NotFoundView.vue";
import { mountComponent } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);

describe("NotFoundView", () => {
	it("says the page doesn't exist and links to the start", async () => {
		const { wrapper } = await mountComponent(NotFoundView);

		expect(head.useHead).toHaveBeenCalledWith({
			title: "common.not_found.title",
		});
		expect(wrapper.find("h1").text()).toBe("common.not_found.title");
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe("/");
	});
});
