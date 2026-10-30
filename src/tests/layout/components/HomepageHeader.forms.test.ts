import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import HomepageHeader from "@/layout/components/HomepageHeader.vue";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { reportError } from "@/lib/analytics/useAnalytics";
import { toasts } from "@/ui/useToast";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRoute: () => ({ name: "homepage" }),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
// the forms' chunk doesn't load
vi.mock("@/features/account/components/LoginComponent.vue", () => {
	throw new Error("chunk failed");
});

describe("HomepageHeader, when the forms don't load", () => {
	const panel = useAuthPanel();

	const settled = async () => {
		await vi.dynamicImportSettled();
		await flushPromises();
	};

	beforeEach(() => {
		panel.close();
		toasts.value = [];
		vi.mocked(reportError).mockClear();
	});

	it("reports a preload nobody asked for, and says nothing", async () => {
		await mountComponent(HomepageHeader);
		await settled();

		expect(reportError).toHaveBeenCalled();
		expect(toasts.value).toEqual([]);
	});

	it("says so and closes the panel that asked for them", async () => {
		await mountComponent(HomepageHeader);
		await settled();
		panel.open("login", "hero");
		await settled();

		expect(toasts.value.at(-1)).toMatchObject({
			text: "common.ui.load_failed",
			type: "error",
		});
		expect(panel.showLogin.value).toBe(false);
	});
});
