// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Engine
import { calculatePlan, createPriceBook } from "@prunplanner/engine";
import {
	groupRecipesByOutput,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import { empireSurplus } from "@/features/production_chain/engine/chainHave";
import { emptyInput } from "@/features/production_chain/engine/chainUrl";
import { RESOURCE_MATERIAL_OPTIONS } from "@/features/resource_roi_overview/resourceROIOverview.constants";

// MCP
import { createBackend } from "@/mcp/backend";
import { loadGameData } from "@/mcp/gameData";
import { getProductionCost } from "@/mcp/tools/getProductionCost";
import {
	API_KEY,
	EMPIRE_UUID,
	PLAN_UUID,
	fakeBackend,
	fixtures,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";
import type {
	CX,
	Planet,
	Plan,
	PlanEmpireElement,
} from "@prunplanner/engine/schemas";
import type { ICheckPlan } from "@/features/production_chain/engine/chainCheck.types";
import type {
	IChainContext,
	IChainInput,
} from "@/features/production_chain/engine/chainSolver.types";

// the tool runs in Node without the app
const { forbidden } = vi.hoisted(() => ({
	forbidden: (name: string) => () => {
		throw new Error(`${name} imported by get_production_cost`);
	},
}));
vi.mock("vue", forbidden("vue"));
vi.mock("vue-i18n", forbidden("vue-i18n"));
vi.mock("pinia", forbidden("pinia"));
vi.mock("@/lib/i18n", forbidden("@/lib/i18n"));
vi.mock("@/database/stores", forbidden("@/database/stores"));

let backend: IFakeBackend;
let env: IToolEnv;

const run = (args: Record<string, unknown>): Promise<any> =>
	getProductionCost
		.run(getProductionCost.inputSchema.parse(args), env)
		.then((r) => r.data);

beforeEach(() => {
	backend = fakeBackend();
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
});

const cx = (fixtures.cxs as unknown as CX[]).find((c) =>
	c.empires.some((e) => e.uuid === EMPIRE_UUID)
)!;

/** the chain solved here, wired as useProductionChain wires it */
async function appChain(ticker: string, perDay: number, withEmpire: boolean) {
	const gameData = await loadGameData(env.backend);
	const ctx: IChainContext = {
		recipesByOutput: groupRecipesByOutput(
			Object.values(gameData.recipesByBuilding).flat()
		),
		buildings: gameData.buildings,
		materials: gameData.materials,
		prices: createPriceBook(
			withEmpire ? () => cx.cx_data : undefined,
			undefined,
			gameData.getExchange
		),
		getExchange: gameData.getExchange,
		resources: new Set(RESOURCE_MATERIAL_OPTIONS.map((o) => o.value)),
		now: Date.now(),
	};
	let have: IChainInput["have"] = {};
	if (withEmpire) {
		const plan = fixtures.plan as unknown as Plan;
		const empire = (
			fixtures.empires as unknown as PlanEmpireElement[]
		).find((e) => e.uuid === EMPIRE_UUID);
		const calc = calculatePlan(
			{ plan, empire, cxUuid: cx.uuid, recipeOptions: false },
			{
				buildings: gameData.buildings,
				recipesByBuilding: gameData.recipesByBuilding,
				materials: gameData.materials,
				planet: fixtures.planet as unknown as Planet,
				prices: createPriceBook(
					() => cx.cx_data,
					plan.planet_natural_id,
					gameData.getExchange
				),
			}
		);
		have = Object.fromEntries(
			empireSurplus([{ result: calc.result } as ICheckPlan])
		);
	}
	const input: IChainInput = {
		...emptyInput(),
		targets: [{ ticker, perDay }],
		have,
	};
	return solveChain(input, ctx);
}

describe("get_production_cost", () => {
	it("gives the solver's unit cost, parts and chain", async () => {
		const data = await run({ ticker: "rat", per_day: 10 });
		const app = await appChain("RAT", 10, false);
		const row = app.rows.RAT;

		expect(data.ticker).toBe("RAT");
		expect(data.source).toBe("made");
		expect(data.unit_cost).toBeCloseTo(row.unitCost, 2);
		expect(data.unit_cost_parts.inputs).toBeCloseTo(
			row.costParts!.inputs,
			2
		);
		expect(data.market_price).toBeCloseTo(row.price, 2);
		expect(data.difference).toBeCloseTo(row.unitCost - row.price, 1);
		expect(data.chain.map((r: any) => r.ticker)).toEqual(app.order);
		expect(data.totals.construction_cost).toBeCloseTo(
			app.totals.construction,
			2
		);
		expect(data.price_basis.cx_preference).toBeNull();
		expect(data.url).toMatch(
			/^https:\/\/app\.test\/production-chain\?t=RAT%3A10/
		);
	});

	it("counts the empire's surplus as own production", async () => {
		const without = await run({ ticker: "CST" });
		const withEmpire = await run({
			ticker: "CST",
			empire_uuid: EMPIRE_UUID,
		});
		const app = await appChain("CST", 1, true);

		const own = (d: any) =>
			d.chain.filter((r: any) => r.own_production_per_day > 0);
		expect(own(without)).toEqual([]);
		expect(own(withEmpire).length).toBeGreaterThan(0);
		expect(withEmpire.chain.map((r: any) => r.source)).toContain(
			"own production"
		);
		expect(withEmpire.unit_cost).toBeCloseTo(app.rows.CST.unitCost, 2);
		expect(withEmpire.price_basis.cx_preference).toBe(cx.cx_name);
		expect(withEmpire.own_production.empire.uuid).toBe(EMPIRE_UUID);

		// one plan's surplus: the same plan here, the same result
		const plan = await run({ ticker: "CST", plan_uuid: PLAN_UUID });
		expect(plan.unit_cost).toBeCloseTo(withEmpire.unit_cost, 2);
		expect(plan.own_production.plan.uuid).toBe(PLAN_UUID);
	});

	it("extracts a raw target on a typical planet", async () => {
		const data = await run({ ticker: "ALO" });
		expect(data.source).toBe("extracted");
		expect(data.chain).toHaveLength(1);
		expect(data.unit_cost_parts.inputs).toBe(0);
		expect(data.unit_cost).toBeGreaterThan(0);
		expect(data.note).toMatch(/no recipe/);
		expect(
			backend.requests.some((r) => r.path.includes("search-index"))
		).toBe(true);
	});

	it("prices a material that can't be made or extracted", async () => {
		const data = await run({ ticker: "CMK" });
		const app = await appChain("CMK", 1, false);
		expect(data.source).toBe("bought");
		expect(data.unit_cost_parts).toBeNull();
		expect(data.unit_cost).toBeCloseTo(app.rows.CMK.price, 2);
		expect(data.difference).toBe(0);
		expect(data.note).toMatch(/neither/);
	});

	it("rejects an unknown material", async () => {
		await expect(run({ ticker: "NOPE" })).rejects.toThrow(
			"Unknown material NOPE."
		);
	});

	it("only sends GET requests", async () => {
		await run({ ticker: "RAT", empire_uuid: EMPIRE_UUID });
		await run({ ticker: "SIO", plan_uuid: PLAN_UUID });
		expect(new Set(backend.requests.map((r) => r.method))).toEqual(
			new Set(["GET"])
		);
	});
	it("extracting: a resource that also has a recipe is extracted when cheaper (O for STL)", async () => {
		const extract = await run({
			ticker: "STL",
			raw_source: "extract",
		});
		const step = (d: any, t: string) =>
			d.chain.find((c: { ticker: string }) => c.ticker === t);
		expect(step(extract, "O").source).toBe("extracted");
		expect(step(extract, "O").extraction_planet).toMatch(/^typical: /);
		expect(
			extract.chain.some(
				(c: { building: string }) => c.building === "TNP"
			)
		).toBe(false);
		expect(
			extract.byproducts.map((b: { ticker: string }) => b.ticker)
		).not.toContain("TC");

		// buying raw materials (the default) keeps the app's chain
		const buy = await run({ ticker: "STL" });
		const app = await appChain("STL", 1, false);
		expect(step(buy, "O").source).toBe("made");
		expect(buy.unit_cost).toBeCloseTo(app.rows.STL.unitCost, 2);
	});

	it("extracting on a planet: its own sites, the rest made or bought", async () => {
		const index = fixtures.searchIndex as unknown as {
			planet_natural_id: string;
			resources: { material_ticker: string; daily_extraction: number }[];
		}[];
		const daily = (p: (typeof index)[number], t: string) =>
			p.resources.find((r) => r.material_ticker === t)
				?.daily_extraction ?? 0;
		// O there, no FEO (no recipe: bought), best and worst O yield
		const withO = index
			.filter((p) => daily(p, "O") > 0 && !daily(p, "FEO"))
			.toSorted((a, b) => daily(b, "O") - daily(a, "O"));
		const on = async (p: (typeof index)[number]) => {
			const data = await run({
				ticker: "STL",
				raw_source: "extract",
				planet: p.planet_natural_id,
			});
			return (t: string) =>
				data.chain.find((c: { ticker: string }) => c.ticker === t);
		};

		const rich = await on(withO[0]);
		expect(rich("O").source).toBe("extracted");
		expect(rich("O").extraction_planet).not.toMatch(/^typical/);
		expect(rich("FEO").source).toBe("bought");
		expect(rich("FEO").extraction_planet).toBeNull();

		// a poor yield: making it costs less there
		const poor = await on(withO.at(-1)!);
		expect(poor("O").source).toBe("made");
		expect(poor("FEO").source).toBe("bought");

		await expect(
			run({ ticker: "STL", raw_source: "extract", planet: "nowhere-xyz" })
		).rejects.toThrow("No planet named");
	});
});
