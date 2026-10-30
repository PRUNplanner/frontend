import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, toRef, type Component } from "vue";

import { mountComponent } from "@/tests/mountComponent";
import { useOverlayLayer } from "@/ui/useOverlayLayer";
import { Z_LAYER } from "@/ui/zIndex";

const close = vi.fn();
// the composable's result of each layer set up, in order
let apis: ReturnType<typeof useOverlayLayer>[] = [];

/** A layer around the composable: a panel with the given children */
function layer(
	children: () => ReturnType<typeof h>[] = () => [],
	options: { modal?: boolean; autoFocus?: boolean } = {}
) {
	return defineComponent({
		props: { show: Boolean },
		setup(props) {
			const panel = ref<HTMLElement | null>(null);
			const api = useOverlayLayer(toRef(props, "show"), panel, {
				autoFocus: () => options.autoFocus ?? true,
				close,
				modal: options.modal,
			});
			apis.push(api);
			return () =>
				props.show
					? h(
							"div",
							{ ref: panel, id: "panel", tabindex: -1 },
							children()
						)
					: null;
		},
	});
}

const button = (id: string, attrs: Record<string, unknown> = {}) =>
	h("button", { id, ...attrs });

function press(key: string, shiftKey = false): KeyboardEvent {
	const event = new KeyboardEvent("keydown", {
		key,
		shiftKey,
		bubbles: true,
		cancelable: true,
	});
	document.dispatchEvent(event);
	return event;
}

const mountLayer = (
	component: Component,
	props: Record<string, unknown> = { show: true }
) => mountComponent(component, props, { attach: true });

const activeId = () => document.activeElement?.id;

describe("useOverlayLayer", () => {
	let app: HTMLElement;
	let opener: HTMLButtonElement;

	beforeEach(() => {
		close.mockClear();
		apis = [];
		app = document.createElement("div");
		app.id = "app";
		opener = document.createElement("button");
		opener.id = "opener";
		app.append(opener);
		document.body.append(app);
		opener.focus();
	});

	afterEach(() => {
		app.remove();
		document.documentElement.removeAttribute("style");
	});

	describe("modal", () => {
		it("locks the page and moves focus into the content", async () => {
			const { setProps } = await mountLayer(
				layer(() => [
					h("div", { "data-layer-header": "" }, [button("header")]),
					button("content"),
				]),
				{ show: false }
			);
			expect(app.hasAttribute("inert")).toBe(false);

			await setProps({ show: true });

			expect(document.documentElement.style.overflow).toBe("hidden");
			expect(app.hasAttribute("inert")).toBe(true);
			expect(activeId()).toBe("content");
		});

		it("opens when mounted shown, restores the page and focus on close", async () => {
			const { setProps } = await mountLayer(layer(() => [button("a")]));
			expect(app.hasAttribute("inert")).toBe(true);

			await setProps({ show: false });

			expect(document.documentElement.style.overflow).toBe("");
			expect(app.hasAttribute("inert")).toBe(false);
			expect(activeId()).toBe("opener");
		});

		it("keeps the scrollbar's width as page margin while open", async () => {
			const width = window.innerWidth;
			window.innerWidth = 1000;
			const html = document.documentElement;
			html.style.marginRight = "2px";

			const { setProps } = await mountLayer(layer(), { show: false });
			await setProps({ show: true });
			// jsdom has no layout: the whole window counts as scrollbar
			expect(html.style.marginRight).toBe(`${1000 - html.offsetWidth}px`);

			await setProps({ show: false });
			expect(html.style.marginRight).toBe("2px");
			window.innerWidth = width;
		});

		it("leaves the margin alone without a scrollbar", async () => {
			const width = window.innerWidth;
			window.innerWidth = 0;
			const html = document.documentElement;

			await mountLayer(layer());

			expect(html.style.marginRight).toBe("");
			expect(html.style.overflow).toBe("hidden");
			window.innerWidth = width;
		});

		it("falls back to the header button, then to the panel", async () => {
			await mountLayer(
				layer(() => [
					h("div", { "data-layer-header": "" }, [button("header")]),
				])
			);
			expect(activeId()).toBe("header");

			await mountLayer(layer());
			expect(activeId()).toBe("panel");
		});

		it("focuses the panel itself without auto focus", async () => {
			await mountLayer(layer(() => [button("a")], { autoFocus: false }));

			expect(activeId()).toBe("panel");
		});

		it("returns no focus to an opener that left the page", async () => {
			const { setProps } = await mountLayer(layer(() => [button("a")]));
			opener.remove();

			await setProps({ show: false });

			expect(activeId()).not.toBe("opener");
		});

		it("takes no opener when no HTML element is focused", async () => {
			const svg = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"svg"
			);
			svg.setAttribute("tabindex", "0");
			app.append(svg);
			svg.focus();

			const { setProps } = await mountLayer(layer(() => [button("a")]));
			await setProps({ show: false });

			expect(document.activeElement).not.toBe(opener);
		});

		it("stacks layers above each other and unlocks with the last", async () => {
			const first = await mountLayer(layer(() => [button("a")]));
			const second = await mountLayer(layer(() => [button("b")]));
			expect(apis[0].zIndex.value).toBe(Z_LAYER + 1);
			expect(apis[1].zIndex.value).toBe(Z_LAYER + 2);

			await second.setProps({ show: false });
			expect(document.documentElement.style.overflow).toBe("hidden");

			await first.setProps({ show: false });
			expect(document.documentElement.style.overflow).toBe("");
		});

		it("releases an unmounted layer and ignores one never opened", async () => {
			const open = await mountLayer(layer(() => [button("a")]));
			open.wrapper.unmount();
			expect(app.hasAttribute("inert")).toBe(false);

			const closed = await mountLayer(layer(), { show: false });
			closed.wrapper.unmount();
			expect(app.hasAttribute("inert")).toBe(false);
		});
	});

	describe("keyboard", () => {
		it("closes on Escape once", async () => {
			await mountLayer(layer(() => [button("a")]));

			const event = press("Escape");

			expect(close).toHaveBeenCalledTimes(1);
			expect(event.defaultPrevented).toBe(true);
		});

		it("ignores keys other than Escape and Tab", async () => {
			await mountLayer(layer(() => [button("a")]));

			expect(press("Enter").defaultPrevented).toBe(false);
			expect(close).not.toHaveBeenCalled();
		});

		it("lets only the topmost layer handle a key", async () => {
			const lower = close;
			const upper = vi.fn();
			const upperLayer = defineComponent({
				props: { show: Boolean },
				setup(props) {
					const panel = ref<HTMLElement | null>(null);
					useOverlayLayer(toRef(props, "show"), panel, {
						autoFocus: () => true,
						close: upper,
					});
					return () =>
						h("div", { ref: panel, tabindex: -1 }, [button("up")]);
				},
			});
			await mountLayer(layer(() => [button("low")]));
			await mountLayer(upperLayer);

			press("Escape");

			expect(upper).toHaveBeenCalledTimes(1);
			expect(lower).not.toHaveBeenCalled();
		});

		it("skips a key another handler already took", async () => {
			await mountLayer(layer(() => [button("a")]));
			const taken = (e: Event) => e.preventDefault();
			document.addEventListener("keydown", taken, { capture: true });

			press("Escape");
			document.removeEventListener("keydown", taken, { capture: true });

			expect(close).not.toHaveBeenCalled();
		});

		it("does nothing while the panel is not rendered", async () => {
			const { setProps } = await mountLayer(layer(() => [button("a")]));
			// the layer stays on the stack until the post flush releases it
			await setProps({ show: false });

			press("Escape");

			expect(close).not.toHaveBeenCalled();
		});

		describe("Tab trap", () => {
			const content = () => [button("first"), button("last")];

			it("wraps from the last to the first and back", async () => {
				await mountLayer(layer(content));

				document.getElementById("last")!.focus();
				const forward = press("Tab");
				expect(activeId()).toBe("first");
				expect(forward.defaultPrevented).toBe(true);

				const backward = press("Tab", true);
				expect(activeId()).toBe("last");
				expect(backward.defaultPrevented).toBe(true);
			});

			it("wraps back from the panel itself", async () => {
				await mountLayer(layer(content));

				document.getElementById("panel")!.focus();
				press("Tab", true);

				expect(activeId()).toBe("last");
			});

			it("leaves Tab inside the panel to the browser", async () => {
				await mountLayer(layer(content));

				document.getElementById("first")!.focus();
				const event = press("Tab");

				expect(event.defaultPrevented).toBe(false);
				expect(activeId()).toBe("first");
			});

			it("pulls focus from outside in", async () => {
				await mountLayer(layer(content));

				opener.focus();
				press("Tab");
				expect(activeId()).toBe("first");

				opener.focus();
				press("Tab", true);
				expect(activeId()).toBe("last");
			});

			it("leaves Tab in a hover card opened from the layer alone", async () => {
				await mountLayer(layer(content));
				const card = document.body.appendChild(
					document.createElement("div")
				);
				card.setAttribute("data-hover-card", "");
				const inCard = card.appendChild(
					document.createElement("button")
				);

				inCard.focus();
				const event = press("Tab");

				expect(event.defaultPrevented).toBe(false);
				expect(document.activeElement).toBe(inCard);
				card.remove();
			});

			it("keeps focus on a panel without focusable content", async () => {
				await mountLayer(layer());
				const panel = document.getElementById("panel")!;

				panel.focus();
				const forward = press("Tab");
				expect(forward.defaultPrevented).toBe(true);
				expect(document.activeElement).toBe(panel);

				opener.focus();
				press("Tab", true);
				expect(document.activeElement).toBe(panel);
			});
		});
	});

	describe("mask", () => {
		const maskEvent = (target: EventTarget, current: EventTarget) =>
			({ target, currentTarget: current }) as unknown as MouseEvent;

		it("closes on a press and release on the mask itself", async () => {
			await mountLayer(layer());
			const mask = document.createElement("div");
			const { maskDown, maskClick } = apis[0];

			maskDown(maskEvent(mask, mask));
			maskClick(maskEvent(mask, mask));

			expect(close).toHaveBeenCalledTimes(1);

			// the press is used up
			maskClick(maskEvent(mask, mask));
			expect(close).toHaveBeenCalledTimes(1);
		});

		it("ignores a drag that started on the panel", async () => {
			await mountLayer(layer());
			const mask = document.createElement("div");
			const inner = document.createElement("span");
			const { maskDown, maskClick } = apis[0];

			maskDown(maskEvent(inner, mask));
			maskClick(maskEvent(mask, mask));
			expect(close).not.toHaveBeenCalled();

			// a click that ends on a child of the mask
			maskDown(maskEvent(mask, mask));
			maskClick(maskEvent(inner, mask));
			expect(close).not.toHaveBeenCalled();
		});
	});

	describe("inLayerAbove", () => {
		it("sees elements of layers stacked above only", async () => {
			const lower = await mountLayer(layer(() => [button("low")]));
			const upper = await mountLayer(
				defineComponent({
					setup() {
						const panel = ref<HTMLElement | null>(null);
						useOverlayLayer(ref(true), panel, {
							autoFocus: () => true,
							close,
						});
						return () =>
							h(
								"div",
								{ ref: panel, id: "upper", tabindex: -1 },
								[button("up")]
							);
					},
				}),
				{}
			);
			const up = document.getElementById("up")!;
			const low = document.getElementById("low")!;

			expect(apis[0].inLayerAbove(up)).toBe(true);
			expect(apis[0].inLayerAbove(low)).toBe(false);

			await lower.setProps({ show: false });
			// a layer that closed is above nothing
			expect(apis[0].inLayerAbove(up)).toBe(false);
			upper.wrapper.unmount();
		});
	});

	describe("non-modal", () => {
		const popover = (children?: () => ReturnType<typeof h>[]) =>
			layer(children, { modal: false });

		it("stacks without locking the page or moving focus", async () => {
			await mountLayer(popover(() => [button("a")]));

			expect(document.documentElement.style.overflow).toBe("");
			expect(app.hasAttribute("inert")).toBe(false);
			expect(activeId()).toBe("opener");
			expect(apis[0].zIndex.value).toBe(Z_LAYER + 1);
		});

		it("closes on Escape but does not trap Tab", async () => {
			await mountLayer(popover(() => [button("a")]));

			const tab = press("Tab");
			expect(tab.defaultPrevented).toBe(false);

			press("Escape");
			expect(close).toHaveBeenCalledTimes(1);
		});

		it("returns focus to the opener when it was inside", async () => {
			const { setProps } = await mountLayer(
				popover(() => [button("a")]),
				{ show: false }
			);
			await setProps({ show: true });
			document.getElementById("a")!.focus();

			await setProps({ show: false });

			expect(activeId()).toBe("opener");
		});

		it("keeps focus where the user moved it", async () => {
			const { setProps } = await mountLayer(
				popover(() => [button("a")]),
				{ show: false }
			);
			const other = document.createElement("button");
			other.id = "other";
			app.append(other);
			await setProps({ show: true });
			other.focus();

			await setProps({ show: false });

			expect(activeId()).toBe("other");
		});

		it("keeps a modal locked page when a popover above it closes", async () => {
			await mountLayer(layer(() => [button("m")]));
			const { setProps } = await mountLayer(popover(), { show: false });

			await setProps({ show: true });
			await setProps({ show: false });

			expect(document.documentElement.style.overflow).toBe("hidden");
			expect(app.hasAttribute("inert")).toBe(true);
		});
	});
});
