import { describe, it, expect, beforeAll, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";
import axiosSetup from "@/util/axiosSetup";

// Services
import { apiService } from "@/lib/apiService";
import {
	callCloneSharedPlan,
	callCreateSharing,
	callDeleteSharing,
	callGetSharedList,
} from "@/features/api/sharingData.api";

// test data
import shared_list from "@/tests/test_data/api_data_shared_list.json";
import { ISharedCreateResponse } from "@/features/api/sharingData.types";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("Empire Data API Calls", async () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("callGetSharedList", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/planning/shared/").reply(200, shared_list);

		expect((await callGetSharedList()).length).toStrictEqual(
			shared_list.length
		);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDeleteSharing", async () => {
		const spyApiServiceDelete = vi.spyOn(apiService, "delete");

		mock.onDelete("/planning/shared/foo").reply(200, true);

		expect(await callDeleteSharing("foo")).toBeTruthy();
		expect(spyApiServiceDelete).toHaveBeenCalled();
	});

	it("callCreateSharing", async () => {
		const spyApiServicePut = vi.spyOn(apiService, "post");

		const fakeSharing: ISharedCreateResponse = {
			uuid: "da105ce1-25f2-479d-b1eb-944353f4784f",
			created_at: new Date(),
			view_count: 0,
		};

		mock.onPost("/planning/shared/").reply(200, fakeSharing);

		expect(
			await callCreateSharing("da105ce1-25f2-479d-b1eb-944353f4784f")
		).toStrictEqual(fakeSharing);
		expect(spyApiServicePut).toHaveBeenCalled();
	});

	it("callCloneSharedPlan", async () => {
		const spyApiServicePut = vi.spyOn(apiService, "put");

		const fakeSharing = {
			message: "foo",
		};

		mock.onPut(
			"/planning/shared/da105ce1-25f2-479d-b1eb-944353f4784f/clone"
		).reply(200, fakeSharing);

		expect(
			await callCloneSharedPlan("da105ce1-25f2-479d-b1eb-944353f4784f")
		).toStrictEqual(fakeSharing);
		expect(spyApiServicePut).toHaveBeenCalled();
	});
});
