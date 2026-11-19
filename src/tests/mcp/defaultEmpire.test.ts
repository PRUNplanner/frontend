// @vitest-environment node
import { describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { loadEmpireCX } from "@/mcp/context";
import { calculateNewPlan } from "@/mcp/tools/calculateNewPlan";
import { getProductionCost } from "@/mcp/tools/getProductionCost";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import {
	API_KEY,
	EMPIRE_UUID,
	fakeBackend,
	fixtures,
} from "@/tests/mcp/fakeBackend";

const PREFERENCES = /^\/user\/preferences\/$/;
const EMPIRES = /^\/planning\/empire\/$/;
const CXS = /^\/planning\/cx\/$/;

const backend = (routes: [RegExp, unknown][]) =>
	createBackend({
		apiUrl: "http://backend",
		apiKey: API_KEY,
		userAgent: "test",
		fetch: fakeBackend(undefined, routes).fetch,
	});
const preferences = (defaultEmpireUuid: string | null) => ({
	...preferenceDefaults,
	defaultEmpireUuid,
});
const empires = fixtures.empires as { uuid: string; empire_name: string }[];
const cxs = fixtures.cxs as {
	cx_name: string;
	empires: { uuid: string }[];
}[];

describe("loadEmpireCX: the empire a tool without a saved plan prices in", () => {
	it("the requested empire, without a note", async () => {
		const r = await loadEmpireCX(backend([]), EMPIRE_UUID);
		expect(r.empire?.uuid).toBe(EMPIRE_UUID);
		expect(r.cx?.cx_name).toBe("PRUN CX REAL");
		expect(r.note).toBeUndefined();
		await expect(
			loadEmpireCX(backend([]), "00000000-0000-4000-8000-000000000000")
		).rejects.toThrow("Unknown empire");
	});

	it("the user's default empire with its CX preference", async () => {
		const r = await loadEmpireCX(
			backend([[PREFERENCES, preferences(EMPIRE_UUID)]]),
			undefined
		);
		expect(r.empire?.uuid).toBe(EMPIRE_UUID);
		expect(r.cx?.cx_name).toBe("PRUN CX REAL");
		expect(r.note).toMatch(
			/^Calculated in your default empire ".+" \(.+, CX preference "PRUN CX REAL"\)/
		);
		expect(r.choices).toBeUndefined();
	});

	it("the only empire, then the only CX preference", async () => {
		const only = await loadEmpireCX(
			backend([[EMPIRES, [empires[0]]]]),
			undefined
		);
		expect(only.empire?.uuid).toBe(empires[0].uuid);
		expect(only.note).toMatch(/^Calculated in your only empire/);

		const cx = cxs.find((c) => c.empires.length === 0)!;
		const onlyCX = await loadEmpireCX(backend([[CXS, [cx]]]), undefined);
		expect(onlyCX.empire).toBeUndefined();
		expect(onlyCX.cx?.cx_name).toBe(cx.cx_name);
		expect(onlyCX.note).toMatch(
			/only CX preference .+\(no faction bonus\)/
		);
	});

	it("otherwise Universe VWAP 30D, and the empires to ask the user about", async () => {
		// a default empire that was deleted counts as none
		const r = await loadEmpireCX(
			backend([[PREFERENCES, preferences("deleted-empire")]]),
			undefined
		);
		expect(r.empire).toBeUndefined();
		expect(r.cx).toBeUndefined();
		expect(r.note).toMatch(/Ask the user which empire/);
		expect(r.choices).toHaveLength(empires.length);
		expect(r.choices).toContainEqual({
			empire_uuid: EMPIRE_UUID,
			name: expect.any(String),
			cx_preference: "PRUN CX REAL",
		});
	});

	it("calculate_new_plan and get_production_cost say what priced them", async () => {
		const env = (routes: [RegExp, unknown][]) => ({
			appUrl: "https://app.test",
			backend: backend(routes),
		});
		const plan = {
			planet_natural_id: "KW-688c",
			buildings: [{ ticker: "RIG", amount: 2 }],
		};
		const picked = (await calculateNewPlan.run(
			calculateNewPlan.inputSchema.parse(plan),
			env([[PREFERENCES, preferences(EMPIRE_UUID)]])
		)) as { data: any };
		expect(picked.data.empire.uuid).toBe(EMPIRE_UUID);
		expect(picked.data.note).toMatch(/default empire/);
		expect(picked.data.empire_choices).toBeUndefined();

		const ask = (await calculateNewPlan.run(
			calculateNewPlan.inputSchema.parse(plan),
			env([])
		)) as { data: any };
		expect(ask.data.empire_choices).toHaveLength(empires.length);

		const cost = (await getProductionCost.run(
			getProductionCost.inputSchema.parse({ ticker: "RAT" }),
			env([[PREFERENCES, preferences(EMPIRE_UUID)]])
		)) as { data: any };
		expect(cost.data.pricing_note).toMatch(/default empire/);
		// the default empire prices, its plans aren't own production
		expect(cost.data.own_production).toBeNull();
	});
});
