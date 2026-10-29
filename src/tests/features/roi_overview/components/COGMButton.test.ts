import { describe, expect, it } from "vitest";

import COGMButton from "@/features/roi_overview/components/COGMButton.vue";
import { mountComponent } from "@/tests/mountComponent";

describe("COGMButton", () => {
	it("is disabled without COGM data and labelled from i18n", async () => {
		const { wrapper } = await mountComponent(COGMButton);
		const button = wrapper.find("button");
		expect(button.attributes("disabled")).toBeDefined();
		expect(button.text()).toBe("terms.cogm");
	});
});
