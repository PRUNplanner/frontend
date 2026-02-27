import { describe, it, expect, beforeAll, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useSharing } from "@/features/sharing/useSharing";

// test data
import shared_list from "@/tests/test_data/api_data_shared_list.json";

vi.mock("@/features/api/sharingData.api", async () => {
	return {
		...(await vi.importActual("@/features/api/sharingData.api")),
		callCreateSharing: vi.fn(),
		callDeleteSharing: vi.fn(),
		callGetSharedList: vi.fn(),
	};
});

import {
	callCreateSharing,
	callDeleteSharing,
	callGetSharedList,
} from "@/features/api/sharingData.api";

describe("useSharing", async () => {
	let planningStore: any;

	beforeAll(() => {
		setActivePinia(createPinia());
		planningStore = usePlanningStore();

		vi.resetAllMocks();
	});

	it("data on shared plan", async () => {
		planningStore.shared["foo"] = {
			uuid: "moo",
			plan_uuid: "foo",
			view_count: 10,
		};

		const { isShared, viewCount, url } = useSharing("foo");

		expect(isShared.value).toBeTruthy();
		expect(viewCount.value).toBe(10);
		expect(url.value).toBe("https://prunplanner.org/shared/moo");
	});

	it("data on not shared plan", async () => {
		const { isShared, viewCount, url } = useSharing("moo");

		expect(isShared.value).toBeFalsy();
		expect(viewCount.value).toBe(0);
		expect(url.value).toBeUndefined();
	});

	it("refresh Store", async () => {
		vi.mocked(callGetSharedList).mockResolvedValueOnce([]);

		const { refreshStore } = useSharing("moo");
		await refreshStore();

		expect(Object.keys(planningStore.shared).length).toBe(0);
	});

	it("create shared plan", async () => {
		vi.mocked(callCreateSharing).mockResolvedValueOnce({
			uuid: "7864a361-cca5-4384-8477-ceec21a8ee65",
			created_at: new Date(),
			view_count: 157,
		});
		// @ts-expect-error mock data date as string
		vi.mocked(callGetSharedList).mockResolvedValueOnce(shared_list);

		const { isShared, createSharing } = useSharing("foo");

		expect(isShared.value).toBeFalsy();
		const result = await createSharing();
		expect(result).toBeUndefined();
	});

	it("delete shared plan", async () => {
		vi.mocked(callDeleteSharing).mockResolvedValueOnce(true);
		// @ts-expect-error mock data date as string
		vi.mocked(callGetSharedList).mockResolvedValueOnce(shared_list);

		planningStore.shared["foo"] = {
			shared_uuid: "moo",
			plan_uuid: "foo",
			view_count: 10,
		};

		const { isShared, deleteSharing } = useSharing("foo");

		expect(isShared.value).toBeTruthy();
		const result = await deleteSharing();
		expect(result).toBeUndefined();
	});
});
