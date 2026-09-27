import { describe, it, expect } from "vitest";

import { getActiveEmpire } from "@/features/planning/usePlanContext";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

describe("getActiveEmpire", () => {
	const options = [{ uuid: "foo" }, { uuid: "bar" }] as PlanEmpireElement[];

	it("no empire uuid", () => {
		expect(getActiveEmpire(undefined, options)).toBeUndefined();
		expect(getActiveEmpire("", options)).toBeUndefined();
	});

	it("empire uuid present in options", () => {
		expect(getActiveEmpire("bar", options)).toStrictEqual({ uuid: "bar" });
	});

	it("empire uuid missing in options or no options", () => {
		expect(getActiveEmpire("moo", options)).toBeUndefined();
		expect(getActiveEmpire("foo", undefined)).toBeUndefined();
	});
});
