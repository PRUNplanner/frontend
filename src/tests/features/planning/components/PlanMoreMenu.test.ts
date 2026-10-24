import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountMenu(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanMoreMenu,
		{ existing: true, own: true, debug: false, ...props },
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
	it("is an icon-only ghost button, so Save stays the only primary", async () => {
		const { wrapper } = await mountMenu();

		expect(wrapper.findComponent(PButton).props("type")).toBe("ghost");
		expect(wrapper.find("button").attributes("aria-haspopup")).toBe("menu");
		expect(wrapper.find("button").attributes("aria-label")).toBe(
			"plan.actions.more"
		);
	});

	it("lists save as copy, reload with its hint and the CSV download", async () => {
		const { wrapper } = await mountMenu();
		await open(wrapper);

		expect(items().map((o) => o.textContent?.trim())).toEqual([
			"plan.actions.save_as_copy",
			"plan.actions.reloadplan.actions.reload_hint",
			"plan.actions.download_csv",
		]);
		// sharing moved out of the menu
		expect(item("plan.actions.share_link")).toBeUndefined();
		expect(document.body.querySelector("[role=separator]")).toBeNull();
		expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
	});

	it("emits the chosen action and closes", async () => {
		const { wrapper, component } = await mountMenu({ debug: true });

		for (const [label, event] of [
			["plan.actions.save_as_copy", "save-as"],
			["plan.actions.reload_hint", "reload"],
			["plan.actions.download_csv", "csv"],
			["Calculation debug", "debug"],
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
		expect(component.emitted("reload")).toHaveLength(1);
		expect(document.activeElement).toBe(button);
	});

	it("offers only the CSV download on a plan without a saved version", async () => {
		const { wrapper } = await mountMenu({ existing: false });
		await open(wrapper);

		expect(items().map((o) => o.textContent?.trim())).toEqual([
			"plan.actions.download_csv",
		]);
	});

	it("offers only the CSV download on a plan that isn't the user's", async () => {
		const { wrapper } = await mountMenu({ own: false });
		await open(wrapper);

		expect(items().map((o) => o.textContent?.trim())).toEqual([
			"plan.actions.download_csv",
		]);
	});

	it("adds the calculation debug after a divider when opted in", async () => {
		const { wrapper } = await mountMenu({ debug: true });
		await open(wrapper);

		expect(items().at(-1)?.textContent?.trim()).toBe("Calculation debug");
		expect(document.body.querySelector("[role=separator]")).not.toBeNull();
	});
});
