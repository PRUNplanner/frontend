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
