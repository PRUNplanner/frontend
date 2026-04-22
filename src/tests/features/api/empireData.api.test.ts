import { describe, it, expect, beforeAll, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";
import axiosSetup from "@/util/axiosSetup";

// Services
import { apiService } from "@/lib/apiService";

import {
	callCreateEmpire,
	callDeleteEmpire,
	callGetEmpireList,
	callGetEmpirePlans,
	callPatchEmpire,
	callPatchEmpirePlanJunctions,
	callPatchEmpireState,
} from "@/features/api/empireData.api";

// test data
import empire_list from "@/tests/test_data/api_data_empire_list.json";
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import { IEmpireMaterialIOState } from "@/features/empire/empire.types";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("Empire Data API Calls", async () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("callGetEmpireList", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/planning/empire/").reply(200, empire_list);

		expect((await callGetEmpireList()).length).toStrictEqual(
			empire_list.length
		);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callGetEmpirePlans", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		const fakeEmpireUuid: string = "foo";

		mock.onGet(`/planning/empire/${fakeEmpireUuid}/plans/`).reply(200, [
			plan_etherwind,
			plan_etherwind,
		]);

		expect((await callGetEmpirePlans(fakeEmpireUuid)).length).toStrictEqual(
			2
		);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callPatchEmpire", async () => {
		const spyApiServicePatch = vi.spyOn(apiService, "put");

		const fakeEmpireUuid: string = "f39c84a5-e7ba-4aeb-a04d-0618df58fd74";
		const fakePatchPayload = {
			empire_faction: "NONE",
			empire_permits_used: 1,
			empire_permits_total: 2,
			empire_name: "CAAP",
		};
		const fakePatchResponse = {
			empire_faction: "NONE",
			empire_permits_used: 1,
			empire_permits_total: 2,
			uuid: "f39c84a5-e7ba-4aeb-a04d-0618df58fd74",
			empire_name: "CAAP",
		};

		mock.onPut(`/planning/empire/${fakeEmpireUuid}/`).reply(
			200,
			fakePatchResponse
		);

		expect(
			// @ts-expect-error mock data
			await callPatchEmpire(fakeEmpireUuid, fakePatchPayload)
		).toStrictEqual(fakePatchResponse);

		expect(spyApiServicePatch).toHaveBeenCalled();
	});

	it("callCreateEmpire", async () => {
		const spyApiServicePut = vi.spyOn(apiService, "post");

		const fakeEmpireUuid: string = "f39c84a5-e7ba-4aeb-a04d-0618df58fd74";
		const fakePutPayload = {
			empire_faction: "NONE",
			empire_permits_used: 1,
			empire_permits_total: 2,
			empire_name: "CAAP",
		};
		const fakePutResponse = {
			empire_faction: "NONE",
			empire_permits_used: 1,
			empire_permits_total: 2,
			uuid: "f39c84a5-e7ba-4aeb-a04d-0618df58fd74",
			empire_name: "CAAP",
		};

		mock.onPost(`/planning/empire/`).reply(200, fakePutResponse);

		// @ts-expect-error mock data
		expect(await callCreateEmpire(fakePutPayload)).toStrictEqual(
			fakePutResponse
		);

		expect(spyApiServicePut).toHaveBeenCalled();
	});

	it("callDeleteEmpire", async () => {
		const spyApiServiceDelete = vi.spyOn(apiService, "delete");

		mock.onDelete("/planning/empire/foo/").reply(200, true);

		expect(await callDeleteEmpire("foo")).toBeTruthy();
		expect(spyApiServiceDelete).toHaveBeenCalled();
	});

	it("callPatchEmpirePlanJunctions", async () => {
		const spyApiServicePatch = vi.spyOn(apiService, "post");

		mock.onPost("/planning/empire/junctions/").reply(200, empire_list);

		expect((await callPatchEmpirePlanJunctions([])).length).toStrictEqual(
			7
		);
		expect(spyApiServicePatch).toHaveBeenCalled();
	});

	it("callPatchEmpireState", async () => {
		const spyApiServicePatch = vi.spyOn(apiService, "patch");

		const mockData: IEmpireMaterialIOState = {
			metadata: {
				faction: "MORIA",
				permits_used: 3,
				permits_total: 3,
				plan_count: 1,
				timestamp: "2026-04-22T03:43:09.504511Z",
			},
			empire_total: {
				C: {
					p: 0,
					c: 0,
					d: 0,
				},
			},
			plan_details: {
				foo: {
					metadata: {
						planet_natural_id: "foo",
						cogc: "---",
					},
					deltas: {
						C: {
							p: 0,
							c: 0,
							d: 0,
						},
					},
				},
			},
		};

		const fakeUuid = "foo";

		mock.onPatch(`/planning/empire/${fakeUuid}/state/`).reply(
			200,
			empire_list[0]
		);
		expect(await callPatchEmpireState(fakeUuid, mockData)).toBeDefined();
		expect(spyApiServicePatch).toHaveBeenCalled();
	});
});
