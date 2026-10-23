import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { mountComponent } from "@/tests/mountComponent";
import { useHoverCard } from "@/ui/useHoverCard";
import PDrawer from "@/ui/components/PDrawer.vue";

type Card = ReturnType<typeof useHoverCard>;

const pointer = (pointerType = "mouse", buttons = 0) =>
	({ pointerType, buttons }) as unknown as PointerEvent;

describe("useHoverCard", () => {
	let triggers: HTMLElement[];
	let panels: HTMLElement[];
	let cards: Card[];
	let opened: number;
	// the scroll guard keeps its last time across tests: the clock only moves on
	let clock = 0;

	async function setup(count = 2) {
		cards = [];
		await mountComponent(
			defineComponent({
				setup() {
					for (let i = 0; i < count; i++)
						cards.push(
							useHoverCard(ref(triggers[i]), ref(panels[i]), {}, () => opened++)
						);
					return () => h("div");
				},
			})
		);
	}

	const enter = (i: number, e = pointer()) => cards[i].triggerEvents.pointerenter(e);
	const leave = (i: number) => cards[i].triggerEvents.pointerleave(pointer());

	function press(key: string): KeyboardEvent {
		const event = new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true,
		});
		document.body.dispatchEvent(event);
		return event;
	}

	beforeEach(async () => {
		vi.useFakeTimers({ now: (clock += 100_000) });
		opened = 0;
		triggers = [0, 1].map(() => document.body.appendChild(document.createElement("div")));
		panels = [0, 1].map(() => document.body.appendChild(document.createElement("div")));
		await setup();
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.innerHTML = "";
	});

	it("opens nothing when the pointer passes over", () => {
		enter(0);
		vi.advanceTimersByTime(200);
		leave(0);
		vi.advanceTimersByTime(1000);
		expect(cards[0].open.value).toBe(false);
		expect(opened).toBe(0);
	});

	it("opens after resting 300 ms", () => {
		enter(0);
		vi.advanceTimersByTime(299);
		expect(cards[0].open.value).toBe(false);
		vi.advanceTimersByTime(1);
		expect(cards[0].open.value).toBe(true);
		expect(opened).toBe(1);
	});

	it("swaps to the next trigger within 80 ms while one is open", () => {
		enter(0);
		vi.advanceTimersByTime(300);
		leave(0);
		enter(1);
		vi.advanceTimersByTime(80);
		expect(cards[0].open.value).toBe(false);
		expect(cards[1].open.value).toBe(true);
	});

	it("closes 300 ms after leaving trigger and card", () => {
		enter(0);
		vi.advanceTimersByTime(300);
		leave(0);
		vi.advanceTimersByTime(299);
		expect(cards[0].open.value).toBe(true);
		vi.advanceTimersByTime(1);
		expect(cards[0].open.value).toBe(false);
	});

	it("stays open on the card, also when crossing another trigger", () => {
		enter(0);
		vi.advanceTimersByTime(300);
		leave(0);
		// on the way to the card
		enter(1);
		vi.advanceTimersByTime(40);
		leave(1);
		cards[0].panelEvents.pointerenter();
		vi.advanceTimersByTime(1000);
		expect(cards[0].open.value).toBe(true);
		expect(cards[1].open.value).toBe(false);

		cards[0].panelEvents.pointerleave();
		vi.advanceTimersByTime(300);
		expect(cards[0].open.value).toBe(false);
	});

	it("opens nothing while scrolling", () => {
		enter(0);
		vi.advanceTimersByTime(250);
		window.dispatchEvent(new Event("scroll"));
		vi.advanceTimersByTime(100);
		expect(cards[0].open.value).toBe(false);
		// opens once the scrolling stopped for 150 ms
		vi.advanceTimersByTime(100);
		expect(cards[0].open.value).toBe(true);
	});

	it("opens nothing with a mouse button down or for touch", () => {
		enter(0, pointer("mouse", 1));
		enter(1, pointer("touch"));
		vi.advanceTimersByTime(1000);
		expect(cards[0].open.value).toBe(false);
		expect(cards[1].open.value).toBe(false);
	});

	it("opens nothing on hover where a tap opens the sheet", () => {
		vi.stubGlobal("matchMedia", () => ({ matches: true }));
		enter(0);
		vi.advanceTimersByTime(1000);
		vi.unstubAllGlobals();
		expect(cards[0].open.value).toBe(false);
	});

	it("opens nothing while a drawer is open", async () => {
		await mountComponent(PDrawer, { show: true });
		await nextTick();
		enter(0);
		vi.advanceTimersByTime(1000);
		expect(cards[0].open.value).toBe(false);
	});

	it("opens inside the drawer that holds the trigger", async () => {
		await mountComponent(PDrawer, { show: true });
		await nextTick();
		document.querySelector("[role=dialog]")!.appendChild(triggers[0]);

		enter(0);
		vi.advanceTimersByTime(300);
		expect(cards[0].open.value).toBe(true);
		cards[0].hide();

		// the other trigger is under the drawer
		enter(1);
		vi.advanceTimersByTime(1000);
		expect(cards[1].open.value).toBe(false);
	});

	it("never swaps a pinned card away", () => {
		cards[0].pin();
		enter(1);
		vi.advanceTimersByTime(1000);
		cards[1].triggerEvents.focusin();
		expect(cards[0].open.value).toBe(true);
		expect(cards[1].open.value).toBe(false);
	});

	it("clicks on Enter and moves focus into a card the click pinned", async () => {
		const button = panels[0].appendChild(document.createElement("button"));
		triggers[0].addEventListener("click", () => cards[0].togglePin());
		const enterKey = new KeyboardEvent("keydown", {
			key: "Enter",
			cancelable: true,
		});
		Object.defineProperty(enterKey, "target", { value: triggers[0] });

		cards[0].triggerEvents.keydown(enterKey);
		await nextTick();
		expect(enterKey.defaultPrevented).toBe(true);
		expect(cards[0].pinned.value).toBe(true);
		expect(document.activeElement).toBe(button);

		// Esc hands the focus back to the trigger, which opens nothing
		triggers[0].tabIndex = 0;
		press("Escape");
		expect(document.activeElement).toBe(triggers[0]);
		cards[0].triggerEvents.focusin();
		expect(cards[0].open.value).toBe(false);
	});

	it("lifts the Esc block when focus leaves the trigger", async () => {
		cards[0].triggerEvents.focusin();
		await nextTick();
		press("Escape");
		cards[0].triggerEvents.focusin();
		expect(cards[0].open.value).toBe(false);

		cards[0].triggerEvents.focusout({
			relatedTarget: document.body,
		} as unknown as FocusEvent);
		cards[0].triggerEvents.focusin();
		expect(cards[0].open.value).toBe(true);
	});

	it("closes on Esc and stays closed until the pointer leaves", async () => {
		enter(0);
		vi.advanceTimersByTime(300);
		await nextTick();
		expect(press("Escape").defaultPrevented).toBe(true);
		expect(cards[0].open.value).toBe(false);

		enter(0);
		vi.advanceTimersByTime(1000);
		expect(cards[0].open.value).toBe(false);

		leave(0);
		enter(0);
		vi.advanceTimersByTime(300);
		expect(cards[0].open.value).toBe(true);
	});

	it("opens at once on keyboard focus, closes when focus leaves", () => {
		triggers[0].tabIndex = 0;
		triggers[0].focus();
		cards[0].triggerEvents.focusin();
		expect(cards[0].open.value).toBe(true);
		cards[0].triggerEvents.focusout({
			relatedTarget: panels[0],
		} as unknown as FocusEvent);
		expect(cards[0].open.value).toBe(true);
		cards[0].triggerEvents.focusout({
			relatedTarget: document.body,
		} as unknown as FocusEvent);
		expect(cards[0].open.value).toBe(false);
	});

	it("stays open while pinned, until unpinned or a click outside", async () => {
		cards[0].togglePin();
		expect(cards[0].pinned.value).toBe(true);
		leave(0);
		vi.advanceTimersByTime(1000);
		expect(cards[0].open.value).toBe(true);
		cards[0].togglePin();
		expect(cards[0].open.value).toBe(false);

		cards[0].pin();
		await nextTick();
		document.body.dispatchEvent(new Event("pointerdown"));
		expect(cards[0].open.value).toBe(false);
	});

	it("opens a sheet after a touch", () => {
		cards[0].triggerEvents.pointerdown(pointer("touch"));
		expect(cards[0].wantsSheet()).toBe(true);
		cards[0].openSheet();
		expect(cards[0].sheet.value).toBe(true);
		expect(cards[0].open.value).toBe(false);
		expect(opened).toBe(1);

		// the sheet returns focus to the trigger: no floating card on touch
		cards[0].sheet.value = false;
		cards[0].triggerEvents.focusout({
			relatedTarget: document.body,
		} as unknown as FocusEvent);
		cards[0].triggerEvents.focusin();
		expect(cards[0].open.value).toBe(false);
	});

	it("ignores other keys, presses inside and focus moving within", async () => {
		cards[0].triggerEvents.focusin();
		await nextTick();

		// only Enter or Space on the trigger itself clicks it
		const click = vi.fn();
		triggers[0].addEventListener("click", click);
		const key = (k: string, target: Element) => {
			const e = new KeyboardEvent("keydown", { key: k, cancelable: true });
			Object.defineProperty(e, "target", { value: target });
			cards[0].triggerEvents.keydown(e);
			return e;
		};
		expect(key("a", triggers[0]).defaultPrevented).toBe(false);
		expect(key("Enter", panels[0]).defaultPrevented).toBe(false);
		expect(key(" ", triggers[0]).defaultPrevented).toBe(true);
		expect(click).toHaveBeenCalledTimes(1);

		// other keys and presses on the card keep it open
		expect(press("a").defaultPrevented).toBe(false);
		panels[0].dispatchEvent(new Event("pointerdown", { bubbles: true }));
		cards[0].panelEvents.focusout({
			relatedTarget: triggers[0],
		} as unknown as FocusEvent);
		expect(cards[0].open.value).toBe(true);

		// focus leaving the card closes it
		cards[0].panelEvents.focusout({
			relatedTarget: document.body,
		} as unknown as FocusEvent);
		expect(cards[0].open.value).toBe(false);
		// Esc with nothing open does nothing
		expect(press("Escape").defaultPrevented).toBe(false);
	});
});
