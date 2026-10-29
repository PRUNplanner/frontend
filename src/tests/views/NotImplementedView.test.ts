import { describe, expect, it, vi } from "vitest";

import NotImplementedView from "@/views/NotImplementedView.vue";
import { mountComponent } from "@/tests/mountComponent";
import common from "@/locales/en_US/common.json";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);

describe("NotImplementedView", () => {
	it("has a title of its own and links the repository and Discord", async () => {
		const { wrapper } = await mountComponent(
			NotImplementedView,
			{},
			{ messages: { common } }
		);

		expect(head.useHead).toHaveBeenCalledWith({
			title: "Feature Not Yet Implemented",
		});
		expect(wrapper.text()).toContain("Feature Not Yet Implemented");
		expect(wrapper.text()).toContain(
			"PRUNplanner v2 is Open Source. Check out the Github repository."
		);
		expect(wrapper.text()).toContain(
			"Get in touch on the PrUn Community Tools Discord."
		);
		expect(
			wrapper.findAll("a").map((a) => a.attributes("href"))
		).toStrictEqual([
			"https://github.com/PRUNplanner/frontend",
			"https://discord.gg/2MDR5DYSfY",
		]);
	});
});
