import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { useEmpireForm } from "@/features/empire/useEmpireForm";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const mock = new AxiosMockAdapter(apiService.client);

const EMPIRE_UUID = "00000001-0000-4000-8000-000000000000";
const PUT_URL = new RegExp(`planning/empire/${EMPIRE_UUID}/$`);
const LIST_URL = /planning\/empire\/$/;

const EMPIRE: PlanEmpireElement = {
	uuid: EMPIRE_UUID,
	empire_name: "My Empire",
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
	plans: [],
	modified_at: "v1",
};

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

describe("useEmpireForm", () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
	});

	it("saves the edited configuration only", async () => {
		mock.onPut(PUT_URL).reply((config) => [
			200,
			{
				uuid: EMPIRE_UUID,
				...JSON.parse(config.data),
				modified_at: "v2",
			},
		]);
		const { localData, isLoading, save } = useEmpireForm(() => EMPIRE);
		localData.value.empire_name = "Test Empire";
		localData.value.empire_permits_total = 3;

		expect(await save()).toBe(true);
		expect(trackEvent).toHaveBeenLastCalledWith("empire:update", {
			is_success: true,
		});

		expect(JSON.parse(mock.history.put[0].data)).toEqual({
			empire_name: "Test Empire",
			empire_faction: "NONE",
			empire_permits_used: 1,
			empire_permits_total: 3,
			base_modified_at: "v1",
		});
		expect(isLoading.value).toBe(false);

		// the next save starts from the saved version
		expect(await save()).toBe(true);
		expect(JSON.parse(mock.history.put[1].data).base_modified_at).toBe(
			"v2"
		);
		// the given empire is never mutated
		expect(EMPIRE.empire_name).toBe("My Empire");
	});

	it("reports a failed save", async () => {
		mock.onPut(PUT_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { isLoading, save } = useEmpireForm(() => EMPIRE);

		expect(await save()).toBe(false);
		expect(trackEvent).toHaveBeenLastCalledWith("empire:update", {
			is_success: false,
		});

		expect(isLoading.value).toBe(false);
		expect(error).toHaveBeenCalledWith(
			"Error patching empire",
			expect.any(Error)
		);
		error.mockRestore();
	});

	it("follows the empire and discards edits on reload", async () => {
		const empire = ref<PlanEmpireElement>({ ...EMPIRE });
		const { localData, reload } = useEmpireForm(() => empire.value);

		localData.value.empire_name = "Edited";
		reload();
		expect(localData.value.empire_name).toBe("My Empire");

		empire.value = { ...EMPIRE, empire_faction: "MORIA" };
		await nextTick();
		expect(localData.value.empire_faction).toBe("MORIA");
	});

	describe("saved or deleted in another tab", () => {
		const SAVED: PlanEmpireElement = {
			...EMPIRE,
			empire_faction: "MORIA",
			modified_at: "v3",
		};

		beforeEach(() => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			mock.onGet(LIST_URL).reply(200, [SAVED]);
		});

		it("conflict: overwrite saves without a base", async () => {
			mock.onPut(PUT_URL)
				.replyOnce(409, { code: "conflict", modified_at: "v3" })
				.onPut(PUT_URL)
				.replyOnce((config) => [
					200,
					{
						uuid: EMPIRE_UUID,
						...JSON.parse(config.data),
						modified_at: "v4",
					},
				]);
			const { localData, conflict, save } = useEmpireForm(() => EMPIRE);
			localData.value.empire_name = "Mine";

			const saved = save();
			await flushPromises();
			expect(conflict.show.value).toBe(true);
			expect(conflict.changes.value?.theirs).toStrictEqual([
				{
					area: "faction",
					key: "faction",
					params: { from: "NONE", to: "MORIA" },
				},
			]);
			expect(conflict.changes.value?.mine[0].area).toBe("name");

			conflict.choose("overwrite");
			expect(await saved).toBe(true);
			expect(trackEvent).toHaveBeenCalledWith("empire:save_conflict", {
				choice: "overwrite",
			});
			expect(JSON.parse(mock.history.put[1].data).base_modified_at).toBe(
				undefined
			);
			expect(JSON.parse(mock.history.put[1].data).empire_name).toBe(
				"Mine"
			);
		});

		it("conflict: reload loads the saved version", async () => {
			mock.onPut(PUT_URL).replyOnce(409, { code: "conflict" });
			const { localData, conflict, save } = useEmpireForm(() => EMPIRE);
			localData.value.empire_name = "Mine";

			const saved = save();
			await flushPromises();
			conflict.choose("reload");

			expect(await saved).toBe(true);
			expect(localData.value.empire_faction).toBe("MORIA");
			expect(localData.value.empire_name).toBe("My Empire");
		});

		it("conflict: closing keeps the edits unsaved", async () => {
			mock.onPut(PUT_URL).replyOnce(409, { code: "conflict" });
			const { localData, conflict, save } = useEmpireForm(() => EMPIRE);
			localData.value.empire_name = "Mine";

			const saved = save();
			await flushPromises();
			conflict.choose(null);

			expect(await saved).toBe(false);
			expect(localData.value.empire_name).toBe("Mine");
			expect(mock.history.put).toHaveLength(1);
		});

		it("deleted: notice, no dialog", async () => {
			mock.onPut(PUT_URL).replyOnce(404);
			const { conflict, remoteNotice, save } = useEmpireForm(
				() => EMPIRE
			);

			expect(await save()).toBe(false);
			expect(remoteNotice.value).toBe("deleted");
			expect(conflict.show.value).toBe(false);
		});

		it("a newer version replaces a clean form, not one with edits", async () => {
			const empire = ref<PlanEmpireElement>({ ...EMPIRE });
			const { localData, remoteNotice } = useEmpireForm(
				() => empire.value
			);

			empire.value = { ...SAVED };
			await nextTick();
			expect(localData.value.empire_faction).toBe("MORIA");

			localData.value.empire_name = "Mine";
			empire.value = {
				...SAVED,
				empire_permits_total: 5,
				modified_at: "v4",
			};
			await nextTick();
			expect(localData.value.empire_name).toBe("Mine");
			expect(localData.value.empire_permits_total).toBe(2);
			expect(remoteNotice.value).toBe("saved");
			expect(trackEvent).toHaveBeenLastCalledWith("app:remote_change", {
				object_type: "empire",
				has_unsaved_edits: true,
				is_deleted: false,
			});
		});
	});
});
