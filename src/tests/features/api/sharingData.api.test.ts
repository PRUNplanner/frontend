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
import type { SharedCreateResponse } from "@/features/api/schemas/sharingData.schemas";

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

		mock.onDelete("/planning/shared/foo/").reply(200, true);

		await expect(callDeleteSharing("foo")).resolves.toBeUndefined();
		expect(spyApiServiceDelete).toHaveBeenCalled();
	});

	it("callCreateSharing", async () => {
		const spyApiServicePut = vi.spyOn(apiService, "post");

		const fakeSharing: SharedCreateResponse = {
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

	it("callCreateSharing sends the plan's summary", async () => {
		const summary = {
			v: 1 as const,
			profit: 850,
			revenue: 1000,
			cost: 150,
			payback_days: 52.9,
			plan_cost: 45000,
			area_used: 412,
			area_total: 500,
			outputs: [{ ticker: "FE", per_day: 10 }],
			price_basis: "CI1_30D",
			cogc: null,
		};
		mock.onPost("/planning/shared/").reply(200, {
			uuid: "da105ce1-25f2-479d-b1eb-944353f4784f",
			created_at: new Date(),
			view_count: 0,
		});

		await callCreateSharing(
			"da105ce1-25f2-479d-b1eb-944353f4784f",
			summary
		);

		expect(JSON.parse(mock.history.post.at(-1)!.data)).toStrictEqual({
			plan: "da105ce1-25f2-479d-b1eb-944353f4784f",
			plan_summary: summary,
		});
	});

	it("callCloneSharedPlan", async () => {
		const spyApiServicePost = vi.spyOn(apiService, "post");

		const fakeCloneResponse = {
			uuid: "f13ca1e0-179b-4380-92bf-b58855c28313",
			plan_name: "CH-771a (Shared Clone)",
		};

		mock.onPost(
			"/planning/shared/da105ce1-25f2-479d-b1eb-944353f4784f/clone/"
		).reply(200, fakeCloneResponse);

		expect(
			await callCloneSharedPlan("da105ce1-25f2-479d-b1eb-944353f4784f")
		).toStrictEqual(fakeCloneResponse);
		expect(spyApiServicePost).toHaveBeenCalled();
	});
});
