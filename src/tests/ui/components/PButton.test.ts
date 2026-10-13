import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PButton from "@/ui/components/PButton.vue";

describe("PButton", () => {
	it("emits click with the MouseEvent", async () => {
		const wrapper = mount(PButton, { slots: { default: "Save" } });
		await wrapper.find("button").trigger("click", { ctrlKey: true });

		const [event] = wrapper.emitted("click")![0] as [MouseEvent];
		expect(event).toBeInstanceOf(MouseEvent);
		expect(event.ctrlKey).toBe(true);
	});
});

describe("PButton pressed", () => {
	it("is no toggle without pressed", () => {
		const wrapper = mount(PButton, { slots: { default: "Save" } });

		expect(wrapper.attributes("aria-pressed")).toBeUndefined();
		expect(wrapper.classes()).toContain("bg-primary");
	});

	it("shows primary when pressed and secondary when not", () => {
		const on = mount(PButton, {
			props: { pressed: true },
			slots: { default: "List" },
		});
		const off = mount(PButton, {
			props: { pressed: false },
			slots: { default: "Matrix" },
		});

		expect(on.attributes("aria-pressed")).toBe("true");
		expect(on.classes()).toContain("bg-primary");
		expect(off.attributes("aria-pressed")).toBe("false");
		expect(off.classes()).toContain("bg-gray-800");
	});

	it("keeps its type when not pressed", () => {
		const off = mount(PButton, {
			props: { pressed: false, type: "ghost" },
			slots: { default: "Matrix" },
		});

		expect(off.classes()).toContain("bg-transparent");
	});
});
