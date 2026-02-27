import { describe, it, expect, beforeAll, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";
import axiosSetup from "@/util/axiosSetup";

// Services
import { apiService } from "@/lib/apiService";

import {
	callCreateCX,
	callDeleteCX,
	callGetCXList,
	callPatchCX,
	callUpdateCXJunctions,
} from "@/features/api/cxData.api";
import { ICXData } from "@/stores/planningStore.types";

// test data
import cx_list from "@/tests/test_data/api_data_cx_list.json";
import cx_patch from "@/tests/test_data/api_data_exchange_patch.json";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("CX Data API Calls", async () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("callGetCXList", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/planning/cx/").reply(200, cx_list);

		expect(await callGetCXList()).toStrictEqual(cx_list);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callCreateCX", async () => {
		const spyApiServicePut = vi.spyOn(apiService, "post");

		mock.onPost("/planning/cx/").reply(200, cx_list[0]);

		expect(await callCreateCX("foo")).toStrictEqual(cx_list[0]);
		expect(spyApiServicePut).toHaveBeenCalled();
	});

	it("callDeleteCX", async () => {
		const spyApiServiceDelete = vi.spyOn(apiService, "delete");

		mock.onDelete("/planning/cx/foo/").reply(200, true);

		expect(await callDeleteCX("foo")).toBeTruthy();
		expect(spyApiServiceDelete).toHaveBeenCalled();
	});

	it("callUpdateCXJunctions", async () => {
		const spyApiServicePatch = vi.spyOn(apiService, "post");

		mock.onPost("/planning/cx/junctions/").reply(200, []);

		expect(await callUpdateCXJunctions([])).toBeTruthy();
		expect(spyApiServicePatch).toHaveBeenCalled();
	});

	it("callPatchCX", async () => {
		const spyApiServicePatch = vi.spyOn(apiService, "put");

		const fakeUuid = "foo";

		mock.onPut(`/planning/cx/${fakeUuid}`).reply(200, cx_patch);

		expect(
			await callPatchCX("fakecx", fakeUuid, cx_patch.cx_data as ICXData)
		).toBeTruthy();
		expect(spyApiServicePatch).toHaveBeenCalled();
	});
});
