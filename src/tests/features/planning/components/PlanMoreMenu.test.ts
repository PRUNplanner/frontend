import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountMenu(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanMoreMenu,
		{ existing: true, canShare: true, ...props },
		{ attach: true }
	);
}

const menu = () => document.body.querySelector<HTMLElement>("[role=menu]");
const items = () =>
	Array.from(document.body.querySelectorAll<HTMLElement>("[role=menuitem]"));
const item = (key: string) =>
	items().find((o) => o.textContent?.includes(key));

async function open(wrapper: VueWrapper) {
	await wrapper.find("button").trigger("click");
	await flushPromises();
}

function key(k: string, target: Element) {
	target.dispatchEvent(
		new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })
	);
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
		expect(document.body.querySelector("[role=separator]")).not.toBeNull();
		expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
	});

	it("emits the chosen action and closes", async () => {
		const { wrapper, component } = await mountMenu();

		for (const [label, event] of [
			["plan.actions.save_as_copy", "save-as"],
			["plan.actions.share_link", "share"],
			["plan.actions.reload_hint", "reload"],
		]) {
			await open(wrapper);
			item(label)!.click();
			await flushPromises();
			expect(component.emitted(event)).toHaveLength(1);
			expect(menu()).toBeNull();
		}
	});

	it("opens with the down arrow, moves, closes with Escape and returns focus", async () => {
		const { wrapper, component } = await mountMenu();
		const button = wrapper.find("button").element;
		button.focus();

		key("ArrowDown", button);
		await flushPromises();
		expect(menu()).not.toBeNull();
		expect(document.activeElement).toBe(menu());

		key("Escape", menu()!);
		await flushPromises();
		expect(menu()).toBeNull();
		expect(document.activeElement).toBe(button);

		key("ArrowDown", button);
		await flushPromises();
		key("ArrowDown", menu()!);
		key("Enter", menu()!);
		await flushPromises();
		expect(component.emitted("share")).toHaveLength(1);
		expect(document.activeElement).toBe(button);
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
