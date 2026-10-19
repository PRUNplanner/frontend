import { describe, expect, it } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";

import HelpTutorial from "@/features/help/components/HelpTutorial.vue";
import { mountComponent } from "@/tests/mountComponent";

// keys render as is, <i18n-t> needs messages to render its link slot
const messages = {
	help: {
		getting_started: {
			l1: { title: "Set up {link} first", link: "Management" },
			l2: { title: "Add {link} data", link: "Management" },
			l3: { title: "Pick a planet in {link}", link: "Search" },
		},
	},
};

describe("HelpTutorial", () => {
	it("lists the five steps in order, numbered", async () => {
		const { wrapper } = await mountComponent(HelpTutorial);

		const steps = wrapper.findAll("ol > li");
		expect(steps).toHaveLength(5);
		expect(steps.map((s) => s.find("span[aria-hidden]").text())).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5",
		]);
		expect(steps[3].text()).toContain("help.getting_started.l4.title");
		expect(steps[4].text()).toContain("help.getting_started.l5.p");
	});

	it("links the steps that name a page and leaves the others plain", async () => {
		const { wrapper } = await mountComponent(
			HelpTutorial,
			{},
			{ messages }
		);

		const steps = wrapper.findAll("ol > li");
		const target = (i: number) =>
			steps[i].findComponent(RouterLinkStub).exists()
				? steps[i].findComponent(RouterLinkStub).props("to")
				: undefined;
		expect([0, 1, 2, 3, 4].map(target)).toEqual([
			"/manage",
			"/manage",
			"/search",
			undefined,
			undefined,
		]);
		expect(steps[0].text()).toContain("Set up Management first");
		expect(steps[2].findComponent(RouterLinkStub).text()).toBe("Search");
	});

	it("explains the core concepts and key features", async () => {
		const { wrapper } = await mountComponent(HelpTutorial);

		const headings = wrapper.findAll("h3").map((h) => h.text());
		expect(headings).toEqual([
			"help.core_concepts.p1.title",
			"help.core_concepts.p2.title",
			"help.core_concepts.p3.title",
			"help.key_features.p1.title",
			"help.key_features.p2.title",
			"help.key_features.p3.title",
			"help.key_features.p4.title",
			"help.key_features.p5.title",
		]);
		expect(wrapper.text()).toContain("help.tutorial.intro");
	});

	it("shows the management screenshot with its caption", async () => {
		const { wrapper } = await mountComponent(HelpTutorial);

		const figure = wrapper.find("figure");
		expect(figure.find("img").attributes("src")).toBe(
			"/images/help/management-screenshot.png"
		);
		expect(figure.find("figcaption").text()).toBe(
			"help.getting_started.image_label"
		);
	});
});
