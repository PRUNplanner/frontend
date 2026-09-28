import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { nextTick, ref } from "vue";
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

const EMPIRE: PlanEmpireElement = {
	uuid: EMPIRE_UUID,
	empire_name: "My Empire",
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
	plans: [],
};

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
			{ uuid: EMPIRE_UUID, ...JSON.parse(config.data) },
		]);
		const { localData, isLoading, save } = useEmpireForm(() => EMPIRE);
		localData.value.empire_name = "Test Empire";
		localData.value.empire_permits_total = 3;

		expect(await save()).toBe(true);

		expect(JSON.parse(mock.history.put[0].data)).toEqual({
			empire_name: "Test Empire",
			empire_faction: "NONE",
			empire_permits_used: 1,
			empire_permits_total: 3,
		});
		expect(isLoading.value).toBe(false);
		// the given empire is never mutated
		expect(EMPIRE.empire_name).toBe("My Empire");
	});

	it("reports a failed save", async () => {
		mock.onPut(PUT_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { isLoading, save } = useEmpireForm(() => EMPIRE);

		expect(await save()).toBe(false);

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
});
