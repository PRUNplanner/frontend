import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountMenu(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanMoreMenu,
		{ debug: false, ...props },
		{ attach: true }
	);
}

const menu = () => document.body.querySelector<HTMLElement>("[role=menu]");
const items = () =>
	Array.from(document.body.querySelectorAll<HTMLElement>("[role=menuitem]"));
const item = (key: string) => items().find((o) => o.textContent?.includes(key));

async function open(wrapper: VueWrapper) {
	await wrapper.find("button").trigger("click");
	await flushPromises();
}

function key(k: string, target: Element) {
	target.dispatchEvent(
		new KeyboardEvent("keydown", {
			key: k,
			bubbles: true,
			cancelable: true,
		})
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

	it("lists the CSV download; save as copy is in the save menu", async () => {
		const { wrapper } = await mountMenu();
		await open(wrapper);

		expect(items().map((o) => o.textContent?.trim())).toEqual([
			"plan.actions.download_csv",
		]);
		expect(document.body.querySelector("[role=separator]")).toBeNull();
		expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
	});

	it.each([
		["plan.actions.download_csv", "csv"],
		["Calculation debug", "debug"],
	])("emits %s as %s and closes", async (label, event) => {
		const { wrapper, component } = await mountMenu({ debug: true });
		await open(wrapper);

		item(label)!.click();
		await flushPromises();

		expect(component.emitted(event)).toHaveLength(1);
		expect(menu()).toBeNull();
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
		key("Enter", menu()!);
		await flushPromises();
		expect(component.emitted("csv")).toHaveLength(1);
		expect(document.activeElement).toBe(button);
	});

	it("adds the calculation debug after a divider when opted in", async () => {
		const { wrapper } = await mountMenu({ debug: true });
		await open(wrapper);

		expect(items().at(-1)?.textContent?.trim()).toBe("Calculation debug");
		expect(document.body.querySelector("[role=separator]")).not.toBeNull();
	});
});
