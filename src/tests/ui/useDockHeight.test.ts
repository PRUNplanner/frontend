import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { mountComponent } from "@/tests/mountComponent";
import { useDockHeight } from "@/ui/useDockHeight";

describe("useDockHeight", () => {
	const initial = { width: window.innerWidth, height: window.innerHeight };

	afterEach(() => {
		window.innerWidth = initial.width;
		window.innerHeight = initial.height;
	});

	async function setup(width: number, height: number) {
		window.innerWidth = width;
		window.innerHeight = height;
		let dock!: ReturnType<typeof useDockHeight>;
		const { wrapper } = await mountComponent(
			defineComponent({
				setup() {
					dock = useDockHeight();
					return () => h("div");
				},
			})
		);
		return { dock, wrapper };
	}

	function pointer(clientY: number): PointerEvent {
		const currentTarget = document.createElement("div");
		currentTarget.setPointerCapture = () => {};
		return {
			clientY,
			pointerId: 1,
			currentTarget,
		} as unknown as PointerEvent;
	}

	it("starts at 40 % of the viewport, 60 % on a phone", async () => {
		expect((await setup(1280, 1000)).dock.height.value).toBe(400);
		expect((await setup(500, 1000)).dock.height.value).toBe(600);
	});

	it("keeps the minimum on a short viewport", async () => {
		const { dock } = await setup(1280, 400);

		expect(dock.height.value).toBe(240);
	});

	it("steps with the keys between 25 % and 80 % of the viewport", async () => {
		const { dock } = await setup(1280, 1000);

		dock.resizeKey(100);
		expect(dock.height.value).toBe(500);

		dock.resizeKey(10_000);
		expect(dock.height.value).toBe(800);

		dock.resizeKey(-10_000);
		expect(dock.height.value).toBe(250);
	});

	it("grows when the grip is dragged up and stops after the drop", async () => {
		const { dock } = await setup(1280, 1000);

		dock.dragStart(pointer(600));
		dock.dragMove(pointer(500));
		expect(dock.height.value).toBe(500);

		dock.dragEnd();
		dock.dragMove(pointer(100));
		expect(dock.height.value).toBe(500);
	});

	it("captures the pointer when it can, and copes when it cannot", async () => {
		const { dock } = await setup(1280, 1000);
		const event = pointer(600);
		const capture = vi.fn();
		(event.currentTarget as HTMLElement).setPointerCapture = capture;
		dock.dragStart(event);
		expect(capture).toHaveBeenCalledWith(1);

		// jsdom elements have no pointer capture
		const bare = { clientY: 600, pointerId: 1 } as PointerEvent;
		Object.defineProperty(bare, "currentTarget", {
			value: document.createElement("div"),
		});
		expect(() => dock.dragStart(bare)).not.toThrow();
		dock.dragMove(pointer(500));
		expect(dock.height.value).toBe(500);
	});

	it("ends a drag when unmounted", async () => {
		const { dock, wrapper } = await setup(1280, 1000);
		dock.dragStart(pointer(600));

		wrapper.unmount();
		dock.dragMove(pointer(500));

		expect(dock.height.value).toBe(400);
	});
});
