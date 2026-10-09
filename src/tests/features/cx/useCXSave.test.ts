import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { useCXSave } from "@/features/cx/useCXSave";
import { usePlanningStore } from "@/stores/planningStore";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";

vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);

const CX_UUID = "00000002-0000-4000-8000-000000000000";
const PUT_URL = new RegExp(`planning/cx/${CX_UUID}/$`);

const LOADED: CX = {
	uuid: CX_UUID,
	cx_name: "Prices",
	empires: [],
	modified_at: "v1",
	cx_data: {
		cx_empire: [],
		cx_planets: [],
		ticker_empire: [{ type: "BUY", ticker: "RAT", value: 100 }],
		ticker_planets: [],
	},
};
const MINE = {
	cx_name: "Prices",
	cx_data: {
		...LOADED.cx_data,
		ticker_empire: [{ type: "BUY" as const, ticker: "RAT", value: 90 }],
	},
};
const SAVED: CX = {
	...LOADED,
	modified_at: "v2",
	cx_data: {
		...LOADED.cx_data,
		ticker_empire: [{ type: "BUY", ticker: "RAT", value: 120 }],
	},
};

describe("useCXSave", () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		usePlanningStore().setCXs([LOADED]);
		mock.onGet(/planning\/cx\/$/).reply(200, [SAVED]);
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("sends the base and stores the saved CX", async () => {
		mock.onPut(PUT_URL).reply(200, {
			...LOADED,
			...MINE,
			modified_at: "v2",
		});
		const { save } = useCXSave("exchanges_view");

		expect(await save(LOADED, MINE)).toBe(true);
		expect(JSON.parse(mock.history.put[0].data).base_modified_at).toBe(
			"v1"
		);
		expect(usePlanningStore().cxs[CX_UUID].modified_at).toBe("v2");
	});

	it("conflict: lists both sides, overwrite saves without a base", async () => {
		mock.onPut(PUT_URL)
			.replyOnce(409, { code: "conflict" })
			.onPut(PUT_URL)
			.replyOnce(200, { ...LOADED, ...MINE, modified_at: "v3" });
		const { conflict, save } = useCXSave("exchanges_view");

		const saved = save(LOADED, MINE);
		await flushPromises();
		expect(conflict.changes.value?.theirs[0].params).toMatchObject({
			from: 100,
			to: 120,
		});
		expect(conflict.changes.value?.mine[0].params).toMatchObject({
			from: 100,
			to: 90,
		});
		expect(conflict.changes.value?.both).toStrictEqual(["ticker::RAT:BUY"]);

		conflict.choose("overwrite");
		expect(await saved).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("exchange:save_conflict", {
			location: "exchanges_view",
			choice: "overwrite",
		});
		expect(JSON.parse(mock.history.put[1].data).base_modified_at).toBe(
			undefined
		);
	});

	it("conflict: reload refetches into the store", async () => {
		mock.onPut(PUT_URL).replyOnce(409, { code: "conflict" });
		const { conflict, save } = useCXSave("exchanges_view");

		const saved = save(LOADED, MINE);
		await flushPromises();
		conflict.choose("reload");

		expect(await saved).toBe(true);
		expect(usePlanningStore().cxs[CX_UUID].modified_at).toBe("v2");
	});

	it("deleted: notice", async () => {
		mock.onPut(PUT_URL).replyOnce(404);
		const { conflict, remoteNotice, save } = useCXSave("exchanges_view");

		expect(await save(LOADED, MINE)).toBe(false);
		expect(remoteNotice.value).toBe("deleted");
		expect(conflict.show.value).toBe(false);
	});

	it.each([
		["saved, no edits: reloads", SAVED, LOADED, null, true],
		["saved, with edits: notice", SAVED, MINE, "saved", false],
		["deleted: notice", undefined, LOADED, "deleted", false],
	])("another tab %s", (_, saved, mine, notice, reload) => {
		const { onRemoteChange, remoteNotice } = useCXSave("cogm");

		expect(onRemoteChange(saved, LOADED, mine)).toBe(reload);
		expect(remoteNotice.value).toBe(notice);
		expect(trackEvent).toHaveBeenLastCalledWith("app:remote_change", {
			object_type: "cx",
			has_unsaved_edits: mine === MINE,
			is_deleted: saved === undefined,
		});
	});

	it("isEdited ignores the order of the preferences", () => {
		const { isEdited } = useCXSave("exchanges_view");
		expect(isEdited(LOADED, LOADED)).toBe(false);
		expect(isEdited(LOADED, MINE)).toBe(true);
	});
});
