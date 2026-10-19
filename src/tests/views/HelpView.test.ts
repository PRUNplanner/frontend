import { describe, expect, it, vi } from "vitest";

import HelpView from "@/views/HelpView.vue";
import HelpTutorial from "@/features/help/components/HelpTutorial.vue";
import changelog from "@/assets/help/changelog.md?raw";
import { mountComponent } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);

describe("HelpView", () => {
	it("sets the page title", async () => {
		await mountComponent(HelpView);

		expect(head.useHead).toHaveBeenCalledWith({
			title: "help.view_title | PRUNplanner",
		});
	});

	it("shows the tutorial and the changelog heading", async () => {
		const { wrapper } = await mountComponent(HelpView);

		expect(wrapper.find("h1").text()).toBe("help.title");
		expect(wrapper.findComponent(HelpTutorial).exists()).toBe(true);
		expect(wrapper.find("aside h2#changelog").text()).toBe(
			"help.changelog.title"
		);
	});

	it("renders the changelog, one heading per release, once loaded", async () => {
		const { wrapper } = await mountComponent(HelpView);

		await vi.waitFor(() =>
			expect(wrapper.findAll("aside h1").length).toBeGreaterThan(0)
		);
		const releases = changelog.match(/^# /gm) ?? [];
		expect(wrapper.findAll("aside h1")).toHaveLength(releases.length);
		const first = changelog.split("\n")[0].replace(/^# /, "");
		expect(wrapper.find("aside h1").text()).toBe(first);
	});
});
