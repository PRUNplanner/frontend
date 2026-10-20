import { describe, expect, it, vi } from "vitest";

import NotImplementedView from "@/views/NotImplementedView.vue";
import { mountComponent } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);

describe("NotImplementedView", () => {
	it("has a title of its own", async () => {
		await mountComponent(NotImplementedView);

		expect(head.useHead).toHaveBeenCalledWith({
			title: "Feature Not Yet Implemented",
		});
	});
});
