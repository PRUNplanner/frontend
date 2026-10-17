import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import VersionUpdateNotification from "@/layout/components/VersionUpdateNotification.vue";
import { mountComponent } from "@/tests/mountComponent";
import common from "@/locales/en_US/common.json";

const { markUpdated, trackEvent } = vi.hoisted(() => ({
	markUpdated: vi.fn(async () => {}),
	trackEvent: vi.fn(),
}));
vi.mock("@/lib/useVersionCheck", () => ({
	useVersionCheck: () => ({ markUpdated }),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));

describe("VersionUpdateNotification", () => {
	it("is a button named by its text that reloads the page", async () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { reload });
		const { wrapper } = await mountComponent(
			VersionUpdateNotification,
			{},
			{ messages: { common } }
		);

		// a native button: Enter and Space click it
		const button = wrapper.get("button");
		expect(button.attributes("type")).toBe("button");
		expect(button.text().replace(/\s+/g, " ")).toBe(
			"PRUNplanner has been updated! Click to load the newest version."
		);
		expect(button.find("strong").text()).toBe("PRUNplanner");

		await button.trigger("click");
		await flushPromises();
		expect(markUpdated).toHaveBeenCalledOnce();
		expect(trackEvent).toHaveBeenCalledWith("app:version_reload");
		expect(reload).toHaveBeenCalledOnce();
	});
});
