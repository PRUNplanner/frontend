import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PProgressBar from "@/ui/components/PProgressBar.vue";

describe("PProgressBar", () => {
	it("fills to the rounded share and shows the steps", () => {
		const wrapper = mount(PProgressBar, { props: { step: 1, total: 3 } });

		expect(wrapper.find(".bg-prunplanner").attributes("style")).toContain(
			"width: 33%"
		);
		expect(wrapper.text()).toBe("1 / 3");
	});
});
