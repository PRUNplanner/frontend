import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

import VersionUpdateNotice from "@/layout/components/VersionUpdateNotice.vue";
import VersionUpdateChip from "@/layout/components/VersionUpdateChip.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useVersionCheck } from "@/lib/useVersionCheck";
import common from "@/locales/en_US/common.json";

const { trackEvent, unsaved } = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	unsaved: { value: false },
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
vi.mock("@/lib/useUnsavedGuard", () => ({
	hasUnsavedChanges: () => unsaved.value,
}));

const text = common.version_update;
const { updateAvailable, latestVersion, outdated, showNotice, showChip } =
	useVersionCheck();

async function mountNotice() {
	const { wrapper } = await mountComponent(
		VersionUpdateNotice,
		{},
		{ messages: { common } }
	);
	return wrapper;
}

describe("VersionUpdateNotice", () => {
	const reload = vi.fn();

	beforeEach(() => {
		reload.mockReset();
		trackEvent.mockReset();
		vi.stubGlobal("location", { reload });
		updateAvailable.value = true;
		latestVersion.value = "new-build";
		outdated.value = false;
		unsaved.value = false;
	});

	it("offers Reload and Later for a ready update", async () => {
		const wrapper = await mountNotice();

		const notice = wrapper.get("[role=status]");
		expect(notice.classes()).toContain("border-l-prunplanner");
		expect(notice.text()).toContain(text.ready_title);
		expect(notice.text()).toContain(text.ready_body);
		expect(wrapper.findAll("button").map((b) => b.text())).toEqual([
			text.reload,
			text.later,
		]);

		await wrapper.findAll("button")[0].trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("app:version_reload", {
			source: "notice",
		});
		expect(reload).toHaveBeenCalledOnce();
	});

	it("asks to save first while the tab has unsaved changes", async () => {
		unsaved.value = true;
		const wrapper = await mountNotice();

		expect(wrapper.text()).toContain(text.unsaved_body);
		expect(wrapper.text()).not.toContain(text.ready_body);
		// the browser's leave prompt still guards the reload
		expect(wrapper.get("button").attributes("disabled")).toBeUndefined();
	});

	it("Later hides the notice and shows the chip", async () => {
		const wrapper = await mountNotice();

		await wrapper.findAll("button")[1].trigger("click");

		expect(trackEvent).toHaveBeenCalledWith("app:version_later");
		expect(showNotice.value).toBe(false);
		expect(showChip.value).toBe(true);

		// a newer build brings it back
		latestVersion.value = "newer-build";
		expect(showNotice.value).toBe(true);
	});

	it("shows the urgent outdated state without Later, over a ready update", async () => {
		outdated.value = true;
		const wrapper = await mountNotice();
		await nextTick();

		const notice = wrapper.get("[role=alert]");
		expect(notice.classes()).toContain("border-l-warning");
		expect(notice.text()).toContain(text.outdated_title);
		expect(notice.text()).toContain(text.outdated_body);
		expect(notice.text()).not.toContain(text.ready_title);
		expect(wrapper.findAll("button").map((b) => b.text())).toEqual([
			text.reload,
		]);
	});

	it("the chip reloads", async () => {
		const { wrapper } = await mountComponent(
			VersionUpdateChip,
			{},
			{ messages: { common } }
		);

		expect(wrapper.text()).toBe(text.chip);
		await wrapper.get("button").trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("app:version_reload", {
			source: "chip",
		});
		expect(reload).toHaveBeenCalledOnce();
	});
});
