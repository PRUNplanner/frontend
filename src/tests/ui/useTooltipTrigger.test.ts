import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { mountComponent } from "@/tests/mountComponent";
import { useTooltipTrigger } from "@/ui/useTooltipTrigger";

type Tooltip = ReturnType<typeof useTooltipTrigger>;

describe("useTooltipTrigger", () => {
	let trigger: HTMLElement;
	let panel: HTMLElement;
	let control: HTMLButtonElement;
	let outside: HTMLElement;
	let tooltip: Tooltip;
	let isDisabled: boolean;

	async function setup(withDisabled = true) {
		const mounted = await mountComponent(
			defineComponent({
				setup() {
					tooltip = withDisabled
						? useTooltipTrigger(
								ref(trigger),
								ref(panel),
								() => isDisabled
							)
						: useTooltipTrigger(ref(trigger), ref(panel));
					return () => h("div");
				},
			})
		);
		return mounted.wrapper;
	}

	/** Pending watcher flush, so the document listeners are (un)registered */
	const settle = () => nextTick();

	function focusEvent(target: Element, relatedTarget: Element | null) {
		return { target, relatedTarget } as unknown as FocusEvent;
	}

	function clickEvent(target: Element) {
		return { target } as unknown as MouseEvent;
	}

	function press(key: string): KeyboardEvent {
		const event = new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true,
		});
		document.body.dispatchEvent(event);
		return event;
	}

	beforeEach(() => {
		vi.useFakeTimers();
		isDisabled = false;
		trigger = document.createElement("div");
		control = document.createElement("button");
		trigger.append(control);
		panel = document.createElement("div");
		outside = document.createElement("div");
		document.body.append(trigger, panel, outside);
	});

	afterEach(() => {
		vi.useRealTimers();
		trigger.remove();
		panel.remove();
		outside.remove();
	});

	it("gives the panel an id and starts closed", async () => {
		await setup();

		expect(tooltip.open.value).toBe(false);
		expect(tooltip.id).toBeTruthy();
	});

	it("is never disabled without a disabled getter", async () => {
		await setup(false);

		tooltip.show();

		expect(tooltip.open.value).toBe(true);
	});

	describe("hover", () => {
		it("opens on enter and closes 150 ms after leaving", async () => {
			await setup();

			tooltip.triggerEvents.mouseenter();
			expect(tooltip.open.value).toBe(true);

			tooltip.triggerEvents.mouseleave();
			vi.advanceTimersByTime(149);
			expect(tooltip.open.value).toBe(true);
			vi.advanceTimersByTime(1);
			expect(tooltip.open.value).toBe(false);
		});

		it("stays open while the pointer moves to the panel", async () => {
			await setup();
			tooltip.triggerEvents.mouseenter();

			tooltip.triggerEvents.mouseleave();
			tooltip.panelEvents.mouseenter();
			vi.advanceTimersByTime(500);
			expect(tooltip.open.value).toBe(true);

			tooltip.panelEvents.mouseleave();
			vi.advanceTimersByTime(150);
			expect(tooltip.open.value).toBe(false);
		});

		it("never opens while disabled", async () => {
			await setup();
			isDisabled = true;

			tooltip.triggerEvents.mouseenter();
			tooltip.show();

			expect(tooltip.open.value).toBe(false);
		});

		it("hide closes at once and cancels a scheduled hide", async () => {
			await setup();
			tooltip.show();
			tooltip.scheduleHide();

			tooltip.hide();

			expect(tooltip.open.value).toBe(false);
		});
	});

	describe("focus", () => {
		it("opens on focus inside and closes when focus leaves", async () => {
			await setup();

			tooltip.triggerEvents.focusin(focusEvent(control, null));
			expect(tooltip.open.value).toBe(true);

			// focus moves between elements of the trigger
			tooltip.triggerEvents.focusout(focusEvent(control, trigger));
			expect(tooltip.open.value).toBe(true);

			tooltip.triggerEvents.focusout(focusEvent(control, outside));
			expect(tooltip.open.value).toBe(false);
		});

		it("closes when focus leaves to nowhere", async () => {
			await setup();
			tooltip.show();

			tooltip.triggerEvents.focusout(focusEvent(control, null));

			expect(tooltip.open.value).toBe(false);
		});
	});

	describe("document listeners", () => {
		it("closes on Escape and marks the key as handled", async () => {
			await setup();
			tooltip.show();
			await settle();

			const other = press("Enter");
			expect(other.defaultPrevented).toBe(false);
			expect(tooltip.open.value).toBe(true);

			const escape = press("Escape");
			expect(escape.defaultPrevented).toBe(true);
			expect(tooltip.open.value).toBe(false);
		});

		it("leaves Escape alone while closed", async () => {
			await setup();
			tooltip.show();
			await settle();
			tooltip.hide();
			await settle();

			expect(press("Escape").defaultPrevented).toBe(false);
		});

		it("closes on a press outside, not inside trigger or panel", async () => {
			await setup();
			tooltip.show();
			await settle();
			const down = (el: Element) =>
				el.dispatchEvent(new Event("pointerdown", { bubbles: true }));

			down(control);
			down(panel);
			expect(tooltip.open.value).toBe(true);

			down(outside);
			expect(tooltip.open.value).toBe(false);
		});

		it("stops listening once closed and on unmount", async () => {
			const wrapper = await setup();
			tooltip.show();
			await settle();
			tooltip.hide();
			await settle();
			tooltip.show();
			tooltip.scheduleHide();
			await settle();

			wrapper.unmount();
			vi.advanceTimersByTime(200);

			// the pending hide was cancelled, the listeners are gone
			expect(tooltip.open.value).toBe(true);
			expect(press("Escape").defaultPrevented).toBe(false);
		});
	});

	describe("touch", () => {
		const tap = () => tooltip.triggerEvents.touchstart();

		it("ignores the compatibility hover of a tap", async () => {
			await setup();

			tap();
			tooltip.triggerEvents.mouseenter();
			expect(tooltip.open.value).toBe(false);

			tooltip.show();
			tooltip.triggerEvents.mouseleave();
			vi.advanceTimersByTime(200);
			expect(tooltip.open.value).toBe(true);
		});

		it("takes hover again after the tap window", async () => {
			await setup();
			tap();
			vi.advanceTimersByTime(800);

			tooltip.triggerEvents.mouseenter();

			expect(tooltip.open.value).toBe(true);
		});

		it("toggles on a tap on a non-interactive trigger", async () => {
			await setup();

			tap();
			tooltip.triggerEvents.click(clickEvent(trigger));
			expect(tooltip.open.value).toBe(true);

			tap();
			tooltip.triggerEvents.click(clickEvent(trigger));
			expect(tooltip.open.value).toBe(false);
		});

		it("shows nothing for a tap on a control inside", async () => {
			await setup();

			tap();
			tooltip.triggerEvents.click(clickEvent(control));
			tooltip.triggerEvents.focusin(focusEvent(control, null));

			expect(tooltip.open.value).toBe(false);
		});

		it("does not open on the focus a tap causes", async () => {
			await setup();
			const plain = document.createElement("span");
			trigger.append(plain);

			tap();
			tooltip.triggerEvents.focusin(focusEvent(plain, null));

			expect(tooltip.open.value).toBe(false);
		});

		it("ignores a click without a tap before", async () => {
			await setup();

			tooltip.triggerEvents.click(clickEvent(trigger));

			expect(tooltip.open.value).toBe(false);
		});

		it("is a control only inside the trigger", async () => {
			await setup();
			const stray = document.createElement("button");
			outside.append(stray);

			// a button the trigger does not contain, and a click that
			// is no element at all
			tap();
			tooltip.triggerEvents.click(clickEvent(stray));
			expect(tooltip.open.value).toBe(true);

			tooltip.hide();
			tap();
			tooltip.triggerEvents.click({
				target: null,
			} as unknown as MouseEvent);
			expect(tooltip.open.value).toBe(true);
		});

		it("treats a trigger that is a control itself as the trigger", async () => {
			const button = document.createElement("button");
			trigger.remove();
			trigger = button;
			document.body.append(button);
			await setup();

			tap();
			tooltip.triggerEvents.click(clickEvent(button));

			expect(tooltip.open.value).toBe(true);
		});
	});
});
