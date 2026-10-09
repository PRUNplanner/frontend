import { describe, it, expect, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/clientErrors", () => ({ reportClientError: vi.fn() }));

// test data
import planet from "@/tests/test_data/api_data_planet_etherwind.json";

const mock = new AxiosMockAdapter(apiService.client);

describe("WrapperGameDataLoader", () => {
	it("retries a failed step and then loads", async () => {
		mock.onPost("/data/planets/multiple/")
			.replyOnce(500)
			.onPost("/data/planets/multiple/")
			.reply(200, [planet]);

		const { wrapper, component } = await mountComponent(
			WrapperGameDataLoader,
			{ loadPlanetMultiple: [planet.planet_natural_id] }
		);

		const retry = wrapper.find("button");
		expect(retry.text()).toBe("wrapper.retry");
		expect(component.emitted("complete")).toBeUndefined();

		await retry.trigger("click");
		await vi.waitFor(() =>
			expect(component.emitted("complete")).toHaveLength(1)
		);
		expect(component.emitted("data:planet:multiple")?.[0][0]).toHaveLength(
			1
		);
		expect(wrapper.text()).not.toContain("wrapper.retry");
	});
});
