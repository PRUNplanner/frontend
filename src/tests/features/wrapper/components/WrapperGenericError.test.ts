import { describe, expect, it } from "vitest";

import WrapperGenericError from "@/features/wrapper/components/WrapperGenericError.vue";
import { mountComponent } from "@/tests/mountComponent";

describe("WrapperGenericError", () => {
	it("titles itself Error by default", async () => {
		const { wrapper } = await mountComponent(WrapperGenericError);
		expect(wrapper.find("h1").text()).toBe("wrapper.error");
		expect(wrapper.find(".max-w-75").exists()).toBe(false);
	});

	it("shows the given title and text", async () => {
		const { wrapper } = await mountComponent(WrapperGenericError, {
			messageTitle: "Oops",
			messageText: "Something broke",
		});
		expect(wrapper.find("h1").text()).toBe("Oops");
		expect(wrapper.find(".max-w-75").text()).toBe("Something broke");
	});
});
