import { defineComponent, h } from "vue";
import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";

// Composables
import { useDelay } from "@/features/wrapper/useDelay";

describe("useDelay", () => {
	afterEach(() => vi.useRealTimers());

	function mountDelay(ms: number) {
		let elapsed = undefined as unknown as ReturnType<typeof useDelay>;
		const wrapper = mount(
			defineComponent({
				setup() {
					elapsed = useDelay(ms);
					return () => h("div");
				},
			})
		);
		return { wrapper, elapsed };
	}

	it("turns true after the delay", () => {
		vi.useFakeTimers();
		const { elapsed } = mountDelay(400);

		vi.advanceTimersByTime(399);
		expect(elapsed.value).toBe(false);
		vi.advanceTimersByTime(1);
		expect(elapsed.value).toBe(true);
	});

	it("clears the timer on unmount", () => {
		vi.useFakeTimers();
		const { wrapper, elapsed } = mountDelay(400);

		wrapper.unmount();
		vi.advanceTimersByTime(400);
		expect(elapsed.value).toBe(false);
	});
});
