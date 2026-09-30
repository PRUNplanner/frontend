import { describe, it, expect } from "vitest";

import { issuePathTemplate, pathTemplate } from "@/util/pathTemplate";

describe("pathTemplate", () => {
	it.each([
		[
			"/planning/plan/0b1e2c3d-1111-4222-8333-444455556666/",
			"/planning/plan/:uuid/",
		],
		[
			"/planning/shared/0B1E2C3D-1111-4222-8333-444455556666/clone/",
			"/planning/shared/:uuid/clone/",
		],
		["/user/api/keys/42/", "/user/api/keys/:id/"],
		["/data/planet/OT-580b/popr/", "/data/planet/:planet/popr/"],
		["/data/planets/Montem/", "/data/planets/:search/"],
		["/data/planets/multiple/", "/data/planets/multiple/"],
		["/data/planets/search/", "/data/planets/search/"],
		["/data/planets/search-index/", "/data/planets/search-index/"],
		["/data/cxpc/RAT/AI1/", "/data/cxpc/RAT/AI1/"],
		["/data/storage/?page=2&uuid=abc", "/data/storage/"],
		["/planning/plan/", "/planning/plan/"],
	])("%s -> %s", (path, template) => {
		expect(pathTemplate(path)).toBe(template);
	});

	it("groups two plans under one template", () => {
		expect(
			pathTemplate("/planning/plan/0b1e2c3d-1111-4222-8333-444455556666/")
		).toBe(
			pathTemplate("/planning/plan/ffffffff-1111-4222-8333-444455556666/")
		);
	});
});

describe("issuePathTemplate", () => {
	it.each([
		[["id"], "id"],
		[["items", 3, "planet_id"], "items.[].planet_id"],
		[
			[
				"plan_details",
				"0b1e2c3d-1111-4222-8333-444455556666",
				"deltas",
				"RAT",
				"input",
			],
			"plan_details.:key.deltas.:key.input",
		],
		[
			["storage_data", "planets", "OT-580b", "StorageItems", 0],
			"storage_data.planets.:key.StorageItems.[]",
		],
		[["preferences", "burnDaysRed"], "preferences.burnDaysRed"],
		[[], ""],
	])("%j -> %s", (path, template) => {
		expect(issuePathTemplate(path)).toBe(template);
	});
});
