import { afterEach, describe, expect, it, vi } from "vitest";
import {
	DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
} from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

import PPopover from "@/ui/components/PPopover.vue";

enableAutoUnmount(afterEach);

const body = () => new DOMWrapper(document.body);
const panels = () => body().findAll<HTMLElement>("[data-panel]");

function down(target: Element) {
	target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
}
function esc() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
	);
}

function mountPopover(
	props: Record<string, unknown> = {},
	content: () => unknown = () => h("input", { id: "inside" })
) {
	const show = ref(false);
	const onClickoutside = vi.fn();
	const wrapper = mount(
		defineComponent({
			setup: () => () =>
				h("div", [
					h(
						PPopover,
						{
							show: show.value,
							"onUpdate:show": (v: boolean) => (show.value = v),
							onClickoutside,
							"data-panel": "",
							...props,
						},
						{
							trigger: () => h("button", { id: "trigger" }, "Open"),
							default: content,
						}
					),
					h("p", { id: "outside" }, "page"),
				]),
		}),
		{ attachTo: document.body }
	);
	return { wrapper, show, onClickoutside };
}

describe("PPopover", () => {

	it("toggles on its trigger and sets aria-expanded", async () => {
		const { wrapper, show } = mountPopover();
		const trigger = wrapper.find("#trigger");
		await flushPromises();
		expect(trigger.attributes("aria-expanded")).toBe("false");

		await trigger.trigger("click");
		await flushPromises();
		expect(show.value).toBe(true);
		expect(trigger.attributes("aria-expanded")).toBe("true");
		// teleported, with the default panel look
		expect(panels()).toHaveLength(1);
		expect(panels()[0].element.parentElement).toBe(document.body);
		expect(panels()[0].classes()).toEqual(
			expect.arrayContaining(["bg-gray-dark", "p-3", "rounded-md"])
		);

		await trigger.trigger("click");
		expect(show.value).toBe(false);
	});

	it("closes on a click outside, not on the trigger, panel or a PSelect list", async () => {
		const { wrapper, show, onClickoutside } = mountPopover();
		show.value = true;
		await flushPromises();

		down(wrapper.find("#trigger").element);
		down(panels()[0].find("#inside").element);
		const list = document.createElement("div");
		list.setAttribute("data-pselect-dropdown", "");
		list.appendChild(document.createElement("span"));
		document.body.appendChild(list);
		down(list.firstElementChild!);
		list.remove();
		expect(show.value).toBe(true);
		expect(onClickoutside).not.toHaveBeenCalled();

		down(wrapper.find("#outside").element);
		expect(onClickoutside).toHaveBeenCalledTimes(1);
		expect(show.value).toBe(false);
	});

	it("only reports a click outside in manual mode", async () => {
		const { wrapper, show, onClickoutside } = mountPopover({
			trigger: "manual",
		});
		await wrapper.find("#trigger").trigger("click");
		expect(show.value).toBe(false);

		show.value = true;
		await flushPromises();
		down(wrapper.find("#outside").element);
		expect(onClickoutside).toHaveBeenCalledTimes(1);
		expect(show.value).toBe(true);
	});

	it("closes on Esc and returns focus only from inside", async () => {
		const { wrapper, show } = mountPopover();
		const trigger = wrapper.find<HTMLElement>("#trigger").element;
		trigger.focus();
		show.value = true;
		await flushPromises();

		(panels()[0].find("#inside").element as HTMLElement).focus();
		esc();
		await flushPromises();
		expect(show.value).toBe(false);
		expect(document.activeElement).toBe(trigger);

		// a click elsewhere keeps the focus where it is
		show.value = true;
		await flushPromises();
		const outside = wrapper.find<HTMLElement>("#outside").element;
		outside.tabIndex = -1;
		outside.focus();
		down(outside);
		await flushPromises();
		expect(show.value).toBe(false);
		expect(document.activeElement).toBe(outside);
	});

	it("leaves Esc to a PSelect list that handled it", async () => {
		const { show } = mountPopover();
		show.value = true;
		await flushPromises();

		const event = new KeyboardEvent("keydown", {
			key: "Escape",
			cancelable: true,
		});
		event.preventDefault();
		document.dispatchEvent(event);
		expect(show.value).toBe(true);
	});

	it("stacks: Esc and clicks in a popover opened from inside spare the outer one", async () => {
		const inner = ref(false);
		const { show } = mountPopover({}, () =>
			h(
				PPopover,
				{
					show: inner.value,
					"onUpdate:show": (v: boolean) => (inner.value = v),
					"data-panel": "",
				},
				{
					trigger: () => h("button", { id: "inner-trigger" }, "More"),
					default: () => h("button", { id: "inner-item" }, "Item"),
				}
			)
		);
		show.value = true;
		await flushPromises();
		inner.value = true;
		await flushPromises();
		expect(panels()).toHaveLength(2);
		// the later layer is on top
		const [outerZ, innerZ] = panels().map((p) =>
			Number(p.element.style.zIndex)
		);
		expect(innerZ).toBeGreaterThan(outerZ);

		down(body().find("#inner-item").element);
		expect(show.value).toBe(true);

		esc();
		await flushPromises();
		expect(inner.value).toBe(false);
		expect(show.value).toBe(true);
		esc();
		expect(show.value).toBe(false);
	});

	it("positions at an anchor instead of the trigger", async () => {
		const anchor = document.createElement("button");
		document.body.appendChild(anchor);
		const { show, onClickoutside } = mountPopover({
			anchor,
			trigger: "manual",
		});
		show.value = true;
		await flushPromises();

		down(anchor);
		expect(onClickoutside).not.toHaveBeenCalled();
		// the trigger slot is not the reference, so it isn't marked
		expect(body().find("#trigger").attributes("aria-expanded")).toBeUndefined();
		anchor.remove();
	});

	it("draws the arrow on request", async () => {
		const { show } = mountPopover({ arrow: true, panelClass: "bg-black" });
		show.value = true;
		await flushPromises();

		expect(panels()[0].find(".parrow").exists()).toBe(true);
		expect(panels()[0].classes()).toContain("bg-black");
	});
});
