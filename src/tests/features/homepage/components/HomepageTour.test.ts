import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import HomepageTour from "@/features/homepage/components/HomepageTour.vue";
import HomepageTourViewport from "@/features/homepage/components/HomepageTourViewport.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { mountComponent } from "@/tests/mountComponent";
import type { IHomepageTourStep } from "@/features/homepage/homepageTour.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const STEPS: IHomepageTourStep[] = [
	{ key: "one", box: [0, 0, 1, 1], zoom: 1 },
	{ key: "two", box: [0, 0, 0.5, 0.5], zoom: 2 },
	{ key: "three", box: [0.5, 0.5, 1, 1], zoom: 2 },
];

// the IntersectionObserver the tour creates, to report it on or off screen
let observer: { cb: IntersectionObserverCallback; disconnect: () => void };
function stubObserver() {
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			constructor(cb: IntersectionObserverCallback) {
				observer = { cb, disconnect: this.disconnect };
			}
			observe = vi.fn();
			disconnect = vi.fn();
		}
	);
}
const onScreen = async (isIntersecting: boolean) => {
	observer.cb(
		[{ isIntersecting } as IntersectionObserverEntry],
		{} as IntersectionObserver
	);
	await nextTick();
};

async function mountTour(props: Record<string, unknown> = {}) {
	const mounted = await mountComponent(HomepageTour, {
		name: "plan",
		image: "plan",
		alt: "the plan",
		steps: STEPS,
		layout: "strip",
		...props,
	});
	const { wrapper } = mounted;
	const steps = () => wrapper.findAll("[role=group] button");
	const active = () =>
		steps().findIndex((b) => b.attributes("aria-pressed") === "true");
	const toggle = () => wrapper.findAll("button").at(-1)!;
	return { ...mounted, steps, active, toggle };
}

describe("HomepageTour", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(trackEvent).mockClear();
		stubObserver();
		window.matchMedia = vi.fn().mockReturnValue({ matches: false });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("starts on the first step and waits until it is on screen", async () => {
		const { active, wrapper } = await mountTour();
		expect(active()).toBe(0);
		expect(wrapper.findComponent(HomepageTourViewport).props("step")).toBe(
			STEPS[0]
		);

		vi.advanceTimersByTime(10_000);
		await nextTick();
		expect(active()).toBe(0);
	});

	it("advances every interval and loops, with a progress bar on the active step", async () => {
		const { active, steps } = await mountTour({ interval: 1000 });
		await onScreen(true);
		expect(steps()[0].find(".animate-tour-progress").exists()).toBe(true);

		for (const expected of [1, 2, 0]) {
			vi.advanceTimersByTime(1000);
			await nextTick();
			expect(active()).toBe(expected);
		}
		// automatic advances send nothing
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("jumps to a clicked step and restarts its timer", async () => {
		const { active, steps } = await mountTour({ interval: 1000 });
		await onScreen(true);
		vi.advanceTimersByTime(600);

		await steps()[2].trigger("click");
		expect(active()).toBe(2);
		expect(trackEvent).toHaveBeenCalledWith("landing:tour_step", {
			tour: "plan",
			step: "three",
		});

		vi.advanceTimersByTime(600);
		await nextTick();
		expect(active()).toBe(2);
		vi.advanceTimersByTime(400);
		await nextTick();
		expect(active()).toBe(0);
	});

	it("stops on Pause and goes on with Play", async () => {
		const { active, toggle } = await mountTour({ interval: 1000 });
		await onScreen(true);
		expect(toggle().text()).toBe("homepage.tour.pause");

		await toggle().trigger("click");
		expect(toggle().text()).toBe("homepage.tour.play");
		vi.advanceTimersByTime(3000);
		await nextTick();
		expect(active()).toBe(0);

		await toggle().trigger("click");
		vi.advanceTimersByTime(1000);
		await nextTick();
		expect(active()).toBe(1);
		expect(vi.mocked(trackEvent).mock.calls).toEqual([
			["landing:tour_toggle", { tour: "plan", is_playing: false }],
			["landing:tour_toggle", { tour: "plan", is_playing: true }],
		]);
	});

	it("does not advance by itself with reduced motion, steps still work", async () => {
		vi.mocked(window.matchMedia).mockReturnValue({
			matches: true,
		} as MediaQueryList);
		const { active, steps, toggle } = await mountTour({ interval: 1000 });
		await onScreen(true);
		expect(toggle().text()).toBe("homepage.tour.play");

		vi.advanceTimersByTime(5000);
		await nextTick();
		expect(active()).toBe(0);

		await steps()[1].trigger("click");
		expect(active()).toBe(1);
	});

	it("pauses off screen and in a hidden tab", async () => {
		const { active } = await mountTour({ interval: 1000 });
		await onScreen(true);
		await onScreen(false);
		vi.advanceTimersByTime(3000);
		await nextTick();
		expect(active()).toBe(0);

		await onScreen(true);
		vi.spyOn(document, "hidden", "get").mockReturnValue(true);
		document.dispatchEvent(new Event("visibilitychange"));
		await nextTick();
		vi.advanceTimersByTime(3000);
		await nextTick();
		expect(active()).toBe(0);
	});

	it("plays without an IntersectionObserver", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const { active } = await mountTour({ interval: 1000 });
		vi.advanceTimersByTime(1000);
		await nextTick();
		expect(active()).toBe(1);
	});

	it("stops its timer and listeners when it leaves", async () => {
		const removed = vi.spyOn(document, "removeEventListener");
		const { wrapper } = await mountTour({ interval: 1000 });
		await onScreen(true);
		const { disconnect } = observer;

		wrapper.unmount();

		expect(disconnect).toHaveBeenCalled();
		expect(removed).toHaveBeenCalledWith(
			"visibilitychange",
			expect.any(Function)
		);
		expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
	});

	it("loads the hero image first, in two sizes; the others lazily", async () => {
		const hero = await mountTour({ eager: true });
		const img = hero.wrapper.find("img");
		expect(img.attributes("fetchpriority")).toBe("high");
		expect(img.attributes("loading")).toBe("eager");
		expect(img.attributes("srcset")).toBe(
			"/images/homepage/plan-1440.webp 1440w, /images/homepage/plan.webp 2880w"
		);

		const other = await mountTour({ image: "empire" });
		expect(other.wrapper.find("img").attributes("loading")).toBe("lazy");
		expect(other.wrapper.find("img").attributes("srcset")).toBeUndefined();
	});

	it("lists the steps beside the image, with the active step's text and the step count", async () => {
		const { wrapper, steps } = await mountTour({
			layout: "list",
			name: "empire",
			reverse: true,
		});

		expect(wrapper.find("article").exists()).toBe(true);
		expect(wrapper.find(".order-2").exists()).toBe(true);
		expect(steps()[0].text()).toContain("homepage.tour.empire.one.text");
		expect(steps()[1].text()).not.toContain("homepage.tour.empire.two.text");
		expect(wrapper.text()).toContain("homepage.tour.step_of");
	});
});
