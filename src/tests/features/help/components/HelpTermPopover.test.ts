import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import HelpTermPopover from "@/features/help/components/HelpTermPopover.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/features/help/helpGlossary", () => ({
	glossaryTerm: vi.fn(async (id: string) =>
		id === "cogm"
			? {
					id,
					title: "COGM",
					definition: "Cost of goods manufactured.",
				}
			: null
	),
}));

const popover = () =>
	document.querySelector<HTMLElement>("[data-testid=help-term-popover]");

function body(html: string): HTMLElement {
	const el = document.createElement("div");
	el.innerHTML = html;
	document.body.appendChild(el);
	return el;
}

const TERM =
	'<p>Your <a href="/help/glossary#cogm" class="help-term" data-term="cogm">COGM</a> and <a href="/x" id="other">x</a></p>';

describe("HelpTermPopover", () => {
	afterEach(() => {
		vi.useRealTimers();
		document.body.innerHTML = "";
	});

	it("shows a term's definition on keyboard focus and closes on blur", async () => {
		const root = body(TERM);
		await mountComponent(HelpTermPopover, { root });
		const term = root.querySelector<HTMLElement>(".help-term")!;

		term.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await flushPromises();
		expect(popover()?.textContent).toContain("COGM");
		expect(popover()?.textContent).toContain("Cost of goods manufactured.");
		expect(popover()?.getAttribute("role")).toBe("tooltip");
		expect(term.getAttribute("aria-describedby")).toBe(popover()?.id);

		term.dispatchEvent(
			new FocusEvent("focusout", {
				bubbles: true,
				relatedTarget: root.querySelector("#other"),
			})
		);
		await flushPromises();
		expect(popover()).toBeNull();
		expect(term.hasAttribute("aria-describedby")).toBe(false);
	});

	it("opens on hover after a short rest and closes after leaving", async () => {
		vi.useFakeTimers();
		const root = body(TERM);
		await mountComponent(HelpTermPopover, { root });
		const term = root.querySelector<HTMLElement>(".help-term")!;

		term.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
		await flushPromises();
		expect(popover()).toBeNull();
		await vi.advanceTimersByTimeAsync(300);
		await flushPromises();
		expect(popover()).not.toBeNull();

		term.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(250);
		await flushPromises();
		expect(popover()).toBeNull();
	});

	it("closes on Escape", async () => {
		const root = body(TERM);
		await mountComponent(HelpTermPopover, { root });
		root.querySelector(".help-term")!.dispatchEvent(
			new FocusEvent("focusin", { bubbles: true })
		);
		await flushPromises();
		expect(popover()).not.toBeNull();

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await flushPromises();
		expect(popover()).toBeNull();
	});

	it("ignores a term the glossary doesn't have", async () => {
		const root = body(
			'<a class="help-term" data-term="nope" href="/help/glossary#nope">x</a>'
		);
		await mountComponent(HelpTermPopover, { root });
		root.querySelector("a")!.dispatchEvent(
			new FocusEvent("focusin", { bubbles: true })
		);
		await flushPromises();
		expect(popover()).toBeNull();
	});

	it("opens on the first tap on touch instead of following the link", async () => {
		vi.stubGlobal("matchMedia", () => ({ matches: true }));
		const root = body(TERM);
		await mountComponent(HelpTermPopover, { root });
		const term = root.querySelector<HTMLElement>(".help-term")!;

		const tap = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		term.dispatchEvent(tap);
		await flushPromises();
		expect(tap.defaultPrevented).toBe(true);
		expect(popover()).not.toBeNull();

		// a second tap follows the link
		const again = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		term.dispatchEvent(again);
		expect(again.defaultPrevented).toBe(false);
		vi.unstubAllGlobals();
	});
});
