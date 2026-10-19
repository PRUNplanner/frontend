import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import SharingModal from "@/features/sharing/components/SharingModal.vue";
import { usePlanningStore } from "@/stores/planningStore";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import {
	callCreateSharing,
	callDeleteSharing,
	callGetSharedList,
} from "@/features/api/sharingData.api";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

vi.mock("@/features/api/sharingData.api", async () => ({
	...(await vi.importActual("@/features/api/sharingData.api")),
	callCreateSharing: vi.fn(),
	callDeleteSharing: vi.fn(),
	callGetSharedList: vi.fn(),
}));

const PLAN = "419df109-f545-48c0-a329-4f9eee1f455c";
const SHARE = "9b78a381-37df-4999-b7af-878380d6e635";
const CREATE = "sharing.buttons.create_link";
const COPY = "sharing.buttons.copy_url";
const STOP = "sharing.buttons.stop_sharing";
const messages = { sharing: { share_count: "{count} views" } };

const sharedEntry = {
	uuid: SHARE,
	plan: PLAN,
	view_count: 42,
	created_at: new Date("2026-02-09T12:07:21Z"),
};

const dialog = () => document.body.querySelector<HTMLElement>("[role=dialog]");
const button = (text: string) =>
	Array.from(document.body.querySelectorAll("button")).find(
		(b) => b.textContent?.trim() === text
	);

describe("SharingModal", () => {
	let pinia: Pinia;

	async function mountModal(props: Record<string, unknown> = {}) {
		return mountComponent(
			SharingModal,
			{ planUuid: PLAN, show: true, ...props },
			{ pinia, messages }
		);
	}

	function share() {
		usePlanningStore().shared[PLAN] = {
			uuid: SHARE,
			plan_uuid: PLAN,
			view_count: 42,
		} as never;
	}

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		vi.resetAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("offers to create a link while the plan is not shared", async () => {
		await mountModal();

		expect(dialog()?.textContent).toContain("sharing.title");
		expect(dialog()?.textContent).toContain("sharing.info");
		expect(button(COPY)).toBeUndefined();
		expect(button(STOP)).toBeUndefined();
		expect(button(CREATE)).toBeDefined();
	});

	it("creates the link, refreshes the list and tracks it", async () => {
		vi.mocked(callCreateSharing).mockResolvedValue({
			uuid: SHARE,
			created_at: new Date(),
			view_count: 0,
		});
		vi.mocked(callGetSharedList).mockResolvedValue([sharedEntry]);
		await mountModal();

		button(CREATE)!.click();
		await vi.waitFor(() => {
			expect(dialog()?.textContent).toContain(`/${SHARE}`);
		});

		expect(callCreateSharing).toHaveBeenCalledWith(PLAN);
		expect(trackEvent).toHaveBeenCalledWith("plan:share_create");
		expect(dialog()?.textContent).toContain("42 views");
		expect(button(CREATE)).toBeUndefined();
	});

	it("logs a failing create and lets the user retry", async () => {
		vi.mocked(callCreateSharing).mockRejectedValue(new Error("boom"));
		await mountModal();

		button(CREATE)!.click();
		await flushPromises();

		expect(console.error).toHaveBeenCalledWith(expect.any(Error));
		expect(trackEvent).not.toHaveBeenCalled();
		expect(button(CREATE)).toBeDefined();
	});

	it("shows views and url of a shared plan and copies the url", async () => {
		share();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		await mountModal({ buttonSize: "sm" });

		expect(dialog()?.textContent).toContain("42 views");
		expect(dialog()?.textContent).toContain(
			`https://prunplanner.org/shared/${SHARE}`
		);
		expect(button(CREATE)).toBeUndefined();

		button(COPY)!.click();
		expect(writeText).toHaveBeenCalledWith(
			`https://prunplanner.org/shared/${SHARE}`
		);
	});

	it("closes with the modal's own close button", async () => {
		const { component } = await mountModal();

		document.body
			.querySelector<HTMLElement>("[role=dialog] button")!
			.click();
		await flushPromises();

		expect(component.emitted("update:show")).toEqual([[false]]);
	});

	it("stops sharing, closes the modal and tracks it", async () => {
		share();
		vi.mocked(callDeleteSharing).mockResolvedValue(true);
		vi.mocked(callGetSharedList).mockResolvedValue([]);
		const { component } = await mountModal();

		button(STOP)!.click();
		await vi.waitFor(() => {
			expect(component.emitted("update:show")).toEqual([[false]]);
		});

		expect(callDeleteSharing).toHaveBeenCalledWith(SHARE);
		expect(trackEvent).toHaveBeenCalledWith("plan:share_delete");
		expect(usePlanningStore().shared[PLAN]).toBeUndefined();
	});

	it("stays open when stopping fails", async () => {
		share();
		vi.mocked(callDeleteSharing).mockRejectedValue(new Error("boom"));
		const { component } = await mountModal();

		button(STOP)!.click();
		await flushPromises();

		expect(console.error).toHaveBeenCalledWith(expect.any(Error));
		expect(component.emitted("update:show")).toBeUndefined();
		expect(trackEvent).not.toHaveBeenCalled();
		expect(button(STOP)).toBeDefined();
	});
});
