import { apiService } from "@/lib/apiService";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import {
	callGetAPIKeys,
	callPostCreateAPIKey,
	callDeleteAPIKey,
} from "@/features/api/apiKeysData.api";
import axiosSetup from "@/util/axiosSetup";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("API Keys Data API Calls", async () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("callGetAPIKeys", async () => {
		const spyApiService = vi.spyOn(apiService, "get");
		const mockData = [
			{
				id: "foo",
				name: "foo",
				prefix: "foo",
				created: new Date(),
				last_used: new Date(),
			},
			{
				id: "moo",
				name: "moo",
				prefix: "moo",
				created: new Date(),
				last_used: null,
			},
		];

		mock.onGet("/user/api/keys/").reply(200, mockData);

		expect(await callGetAPIKeys()).toStrictEqual(mockData);
		expect(spyApiService).toHaveBeenCalledOnce();
	});

	it("callPostCreateAPIKey", async () => {
		const spyApiService = vi.spyOn(apiService, "post");
		const mockData = {
			id: "foo",
			name: "foo",
			api_key: "foo",
			prefix: "foo",
		};

		mock.onPost(`/user/api/keys/`).reply(200, mockData);

		expect(await callPostCreateAPIKey("foo")).toStrictEqual(mockData);
		expect(spyApiService).toHaveBeenCalledOnce();
	});

	it("callDeleteAPIKey", async () => {
		const spyApiService = vi.spyOn(apiService, "delete");
		const deleteId = "moo";

		mock.onDelete(`/user/api/keys/${deleteId}/`).reply(204);

		expect(await callDeleteAPIKey(deleteId)).toBeTruthy();
		expect(spyApiService).toHaveBeenCalledOnce();
	});
});
