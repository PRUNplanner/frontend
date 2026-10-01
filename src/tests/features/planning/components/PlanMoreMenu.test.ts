import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { NDropdown } from "naive-ui";

import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountMenu(props: Record<string, unknown> = {}) {
	return mountComponent(PlanMoreMenu, {
		existing: true,
		canShare: true,
		...props,
	});
}

const items = () =>
	Array.from(
		document.body.querySelectorAll<HTMLElement>(".n-dropdown-option-body")
	);
const item = (key: string) =>
	items().find((o) => o.textContent?.includes(key));

async function open(wrapper: VueWrapper) {
	await wrapper.find("button").trigger("click");
	await flushPromises();
}

describe("PlanMoreMenu", () => {
	it("is a secondary button, so Save stays the only primary", async () => {
		const { wrapper } = await mountMenu();

		expect(wrapper.findComponent(PButton).props("type")).toBe("secondary");
		expect(wrapper.find("button").attributes("aria-haspopup")).toBe("menu");
	});

	it("lists save as copy, share and reload with its hint", async () => {
		const { wrapper } = await mountMenu();
		await open(wrapper);

		expect(items().map((o) => o.textContent?.trim())).toEqual([
			"plan.actions.save_as_copy",
			"plan.actions.share_link",
			"plan.actions.reloadplan.actions.reload_hint",
		]);
		expect(document.body.textContent).toContain("plan.actions.shortcuts");
		expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
	});

	it("emits the chosen action and closes", async () => {
		const { wrapper, component } = await mountMenu();

		for (const [key, event] of [
			["plan.actions.save_as_copy", "save-as"],
			["plan.actions.share_link", "share"],
			["plan.actions.reload_hint", "reload"],
		]) {
			await open(wrapper);
			item(key)!.click();
			await flushPromises();
			expect(component.emitted(event)).toHaveLength(1);
			expect(wrapper.findComponent(NDropdown).props("show")).toBe(false);
		}
	});

	it("opens with the down arrow and closes with Escape", async () => {
		const { wrapper } = await mountMenu();

		await wrapper.find("button").trigger("keydown", { key: "ArrowDown" });
		await flushPromises();
		expect(wrapper.findComponent(NDropdown).props("show")).toBe(true);

		// the dropdown listens on the whole page, the key press has to bubble
		document.body.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		await flushPromises();
		expect(wrapper.findComponent(NDropdown).props("show")).toBe(false);
	});

	it("offers only sharing on a plan without a saved version", async () => {
		const { wrapper } = await mountMenu({ existing: false });
		await open(wrapper);

		expect(items().map((o) => o.textContent?.trim())).toEqual([
			"plan.actions.share_link",
		]);
	});

	it("renders nothing without any item", async () => {
		const { wrapper } = await mountMenu({
			existing: false,
			canShare: false,
		});

		expect(wrapper.find("button").exists()).toBe(false);
	});
});
