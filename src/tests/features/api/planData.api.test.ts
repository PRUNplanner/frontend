import { describe, it, expect, beforeAll, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";
import axiosSetup from "@/util/axiosSetup";

// Services
import { apiService } from "@/lib/apiService";

import {
	callGetPlan,
	callGetShared,
	callCreatePlan,
	callSavePlan,
	callGetPlanlist,
	callDeletePlan,
	callClonePlan,
} from "@/features/api/planData.api";

// test data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import shared from "@/tests/test_data/api_data_shared.json";
import { IPlanCreateData } from "@/features/planning_data/usePlan.types";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("PlanData API Calls", async () => {
	const etherwindUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";
	const sharedUuid: string = "0f7161c8-7bc9-4ab6-af4a-10105be4180a";
	const fakeUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";

	const fakeSaveCreateData: IPlanCreateData = {
		plan_name: "meow",
		planet_natural_id: "foo",
		plan_permits_used: 1,
		plan_cogc: "RESOURCE_EXTRACTION",
		plan_corphq: true,
		plan_data: {
			experts: [],
			workforce: [],
			infrastructure: [],
			buildings: [],
		},
		empire_uuid: fakeUuid,
	};

	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("callGetPlan", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet(`/planning/plan/${etherwindUuid}`).reply(
			200,
			plan_etherwind
		);

		expect((await callGetPlan(etherwindUuid)).uuid).toStrictEqual(
			plan_etherwind.uuid
		);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callGetPlanlist", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet(`/planning/plan/`).reply(200, [plan_etherwind]);

		expect((await callGetPlanlist())[0].uuid).toStrictEqual(
			plan_etherwind.uuid
		);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callGetShared", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet(`/planning/shared/${sharedUuid}`).reply(200, shared);

		expect(await callGetShared(sharedUuid)).toStrictEqual(shared);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callCreatePlan", async () => {
		const spyApiServicePut = vi.spyOn(apiService, "post");

		mock.onPost("/planning/plan/").reply(200, {
			plan_etherwind,
			uuid: fakeUuid,
		});

		expect(await callCreatePlan(fakeSaveCreateData)).toStrictEqual({
			uuid: fakeUuid,
		});
		expect(spyApiServicePut).toHaveBeenCalled();
	});

	it("callSavePlan", async () => {
		const spyApiServicePatch = vi.spyOn(apiService, "put");

		mock.onPut(`/planning/plan/${fakeUuid}/`).reply(200, {
			uuid: fakeUuid,
		});

		expect(
			await callSavePlan(fakeUuid, {
				uuid: fakeUuid,
				...fakeSaveCreateData,
			})
		).toStrictEqual({
			uuid: fakeUuid,
		});
		expect(spyApiServicePatch).toHaveBeenCalled();
	});

	it("callClonePlan", async () => {
		const spyApiServicePut = vi.spyOn(apiService, "post");

		mock.onPost("/planning/plan/foo/clone/").reply(200, plan_etherwind);

		expect((await callClonePlan("foo", "meow")).uuid).toStrictEqual(
			plan_etherwind.uuid
		);
		expect(spyApiServicePut).toHaveBeenCalled();
	});

	it("callDeletePlan", async () => {
		const spyApiServiceDelete = vi.spyOn(apiService, "delete");

		mock.onDelete("/planning/plan/foo").reply(200, true);

		expect(await callDeletePlan("foo")).toBeTruthy();
		expect(spyApiServiceDelete).toHaveBeenCalled();
	});
});
