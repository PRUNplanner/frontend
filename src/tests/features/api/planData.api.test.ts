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
	callActivatePlanVersion,
	callClonePlanVersion,
	callDeletePlanVersion,
	callDeletePlanDraft,
	callGetPlanDraft,
	callGetPlanVersion,
	callGetPlanVersions,
	callRenamePlanVersion,
	callSavePlanDraft,
	sendPlanDraftKeepalive,
} from "@/features/api/planData.api";

// test data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import shared from "@/tests/test_data/api_data_shared.json";
import type { PlanCreateData } from "@/features/api/schemas/planningData.schemas";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("PlanData API Calls", async () => {
	const etherwindUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";
	const sharedUuid: string = "0f7161c8-7bc9-4ab6-af4a-10105be4180a";
	const fakeUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";

	const fakeSaveCreateData: PlanCreateData = {
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

		mock.onGet(`/planning/plan/${etherwindUuid}/`).reply(
			200,
			plan_etherwind
		);

		expect((await callGetPlan(etherwindUuid)).uuid).toStrictEqual(
			plan_etherwind.uuid
		);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callGetPlan keeps a building at 0", async () => {
		const plan = structuredClone(plan_etherwind);
		plan.plan_data.buildings[0].amount = 0;
		mock.onGet(`/planning/plan/${etherwindUuid}/`).reply(200, plan);

		// the schema allows 0: a building set to 0 survives save and load
		const loaded = await callGetPlan(etherwindUuid);
		expect(loaded.plan_data.buildings[0].amount).toBe(0);
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

		mock.onGet(`/planning/shared/${sharedUuid}/`).reply(200, shared);

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

		// the answer is the full plan, as GET /planning/plan/<uuid>/
		mock.onPut(`/planning/plan/${fakeUuid}/`).reply(200, plan_etherwind);

		const saved = await callSavePlan(fakeUuid, {
			uuid: fakeUuid,
			...fakeSaveCreateData,
		});
		expect(saved.plan_name).toBe(plan_etherwind.plan_name);
		expect(saved.plan_data).toBeDefined();
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

		mock.onDelete("/planning/plan/foo/").reply(200, true);

		await expect(callDeletePlan("foo")).resolves.toBeUndefined();
		expect(spyApiServiceDelete).toHaveBeenCalled();
	});
});

describe("Plan versions and draft API calls", () => {
	const plan = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";
	const version = "5f0c3b8e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
	// as the backend sends them: microseconds, Z
	const created = "2026-10-12T18:20:00.123456Z";
	const updated = "2026-10-30T12:00:01.654321Z";
	const item = {
		uuid: version,
		kind: "restore",
		name: "",
		created_at: created,
		source_version: null,
		is_active: true,
		data_bytes: 812,
	};
	const snapshot = {
		plan_name: plan_etherwind.plan_name,
		planet_natural_id: plan_etherwind.planet_natural_id,
		plan_permits_used: plan_etherwind.plan_permits_used,
		plan_cogc: plan_etherwind.plan_cogc,
		plan_corphq: plan_etherwind.plan_corphq,
		plan_data: plan_etherwind.plan_data,
	};

	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("lists, gets, renames and clones versions", async () => {
		mock.onGet(`/planning/plan/${plan}/versions/`).reply(200, [item]);
		expect(await callGetPlanVersions(plan)).toEqual([item]);

		mock.onGet(`/planning/plan/${plan}/versions/${version}/`).reply(200, {
			...item,
			...snapshot,
		});
		const detail = await callGetPlanVersion(plan, version);
		expect(detail.created_at).toBe(created);
		expect(detail.plan_data).toEqual(plan_etherwind.plan_data);

		mock.onPatch(`/planning/plan/${plan}/versions/${version}/`).reply(
			(config) => [200, { ...item, name: JSON.parse(config.data).name }]
		);
		expect((await callRenamePlanVersion(plan, version, "Late")).name).toBe(
			"Late"
		);

		mock.onPost(`/planning/plan/${plan}/versions/${version}/clone/`).reply(
			201,
			plan_etherwind
		);
		expect((await callClonePlanVersion(plan, version)).uuid).toBe(
			plan_etherwind.uuid
		);
	});

	it("activates a version with the seen draft and deletes a version", async () => {
		const seen = "2026-10-31T10:00:00.123456Z";
		mock.onPost(
			`/planning/plan/${plan}/versions/${version}/activate/`
		).reply((config) => [
			JSON.parse(config.data).draft_updated_at === seen ? 200 : 400,
			plan_etherwind,
		]);
		expect((await callActivatePlanVersion(plan, version, seen)).uuid).toBe(
			plan_etherwind.uuid
		);

		mock.onDelete(`/planning/plan/${plan}/versions/${version}/`).reply(204);
		await expect(
			callDeletePlanVersion(plan, version)
		).resolves.toBeUndefined();
	});

	it("gets no draft or the draft, keeping updated_at raw", async () => {
		mock.onGet(`/planning/plan/${plan}/draft/`).replyOnce(200, {
			draft: null,
		});
		expect(await callGetPlanDraft(plan)).toBeNull();

		mock.onGet(`/planning/plan/${plan}/draft/`).replyOnce(200, {
			draft: {
				...snapshot,
				base_modified_at: created,
				updated_at: updated,
			},
		});
		expect((await callGetPlanDraft(plan))?.updated_at).toBe(updated);
	});

	it("saves the draft and deletes it with the encoded updated_at", async () => {
		mock.onPut(`/planning/plan/${plan}/draft/`).reply((config) => {
			expect(JSON.parse(config.data)).toMatchObject({
				base_modified_at: created,
				draft_updated_at: null,
			});
			return [200, { updated_at: updated }];
		});
		expect(
			await callSavePlanDraft(plan, {
				...snapshot,
				base_modified_at: created,
				draft_updated_at: null,
			} as Parameters<typeof callSavePlanDraft>[1])
		).toBe(updated);

		mock.onDelete(
			`/planning/plan/${plan}/draft/?draft_updated_at=${encodeURIComponent(updated)}`
		).reply(204);
		await expect(
			callDeletePlanDraft(plan, updated)
		).resolves.toBeUndefined();
	});

	it("flushes the draft with an authenticated keepalive fetch under the cap", async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify({ updated_at: updated }), {
					status: 200,
				})
			)
		);
		vi.stubGlobal("fetch", fetch);
		const data = {
			...snapshot,
			base_modified_at: created,
			draft_updated_at: updated,
		} as Parameters<typeof sendPlanDraftKeepalive>[1];

		// its answer: the stored draft's updated_at, raw
		await expect(sendPlanDraftKeepalive(plan, data, "tok")).resolves.toBe(
			updated
		);
		const [url, init] = fetch.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];
		expect(url).toMatch(new RegExp(`/planning/plan/${plan}/draft/$`));
		expect(init).toMatchObject({ method: "PUT", keepalive: true });
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"Bearer tok"
		);

		// not stored (an expired token): null, the caller writes again
		fetch.mockResolvedValueOnce(new Response("", { status: 401 }));
		await expect(
			sendPlanDraftKeepalive(plan, data, "tok")
		).resolves.toBeNull();

		// over 64 KiB: not sent
		const big = {
			...data,
			plan_name: "x".repeat(70 * 1024),
		};
		expect(sendPlanDraftKeepalive(plan, big, "tok")).toBe(false);
		expect(fetch).toHaveBeenCalledTimes(2);
		vi.unstubAllGlobals();
	});
});
