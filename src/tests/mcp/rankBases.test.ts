// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// Engine
import { createPriceBook } from "@/features/cx/priceBook";
import { groupRecipesByBuilding } from "@/features/planning/engine/buildings";
import {
	calculateBase,
	recipeCandidates,
	toRowInput,
} from "@/features/base_roi/baseROIRows";
import {
	calculateMetrics,
	filterRows,
} from "@/features/base_roi/baseROIMetrics";
import { STANDARD_PLANET } from "@/features/base_roi/baseROI.constants";
import { BaseROISettingsSchema } from "@/features/base_roi/baseROI.schemas";

// MCP
import { createBackend } from "@/mcp/backend";
import { rankBases } from "@/mcp/tools/rankBases";
import {
	API_KEY,
	EMPIRE_UUID,
	fakeBackend,
	fixtures,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import {
	BuildingPayloadSchema,
	ExchangePayloadSchema,
	MaterialPayloadSchema,
	RecipePayloadSchema,
} from "@/features/api/schemas/gameData.schemas";

let backend: IFakeBackend;
let env: IToolEnv;

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

const run = (args: Record<string, unknown> = {}): Promise<any> =>
	rankBases.run(rankBases.inputSchema.parse(args), env).then((r) => r.data);

/** Base ROI's recipe rows the way useBaseROI calculates and filters them */
function appRows(
	settings: Record<string, unknown>,
	cx: CX | undefined
): IBaseROIRow[] {
	const exchanges = new Map(
		ExchangePayloadSchema.parse(fixtures.exchanges).map((e: Exchange) => [
			e.ticker_id,
			e,
		])
	);
	const getExchange = (id: string) => {
		const e = exchanges.get(id);
		if (!e) throw new Error(id);
		return e;
	};
	const recipes = RecipePayloadSchema.parse(fixtures.recipes);
	const gameData = {
		materials: new Map(
			MaterialPayloadSchema.parse(fixtures.materials).map((m) => [
				m.ticker,
				m,
			])
		),
		buildings: new Map(
			BuildingPayloadSchema.parse(fixtures.buildings).map((b) => [
				b.building_ticker,
				b,
			])
		),
		recipesByBuilding: groupRecipesByBuilding(recipes),
	};
	const s = BaseROISettingsSchema.parse(settings);
	const ctx: IPlanContext = {
		...gameData,
		planet: STANDARD_PLANET,
		prices: createPriceBook(
			cx ? () => cx.cx_data : undefined,
			STANDARD_PLANET.planet_natural_id,
			getExchange
		),
	};
	const rows: IBaseROIRow[] = [];
	for (const c of recipeCandidates(gameData)) {
		try {
			const input = toRowInput(
				c,
				calculateBase(c, ctx, s, cx?.uuid),
				ctx,
				getExchange
			);
			rows.push({ ...input, metrics: calculateMetrics(input, s, 0) });
		} catch {
			// no row, as in the app
		}
	}
	return filterRows(rows, [], s).rows;
}

const key = (r: { recipe_id: string; daily_profit: number }) =>
	`${r.recipe_id} ${r.daily_profit}`;

describe("rank_bases", () => {
	it("ranks like Base ROI's recipe rows with the default settings", async () => {
		const data = await run({ limit: 100 });
		const app = appRows({}, undefined).slice(0, 100);
		expect(data.rows.length).toBeGreaterThan(20);
		expect(data.total_shown).toBe(appRows({}, undefined).length);
		expect(data.rows.map(key)).toEqual(
			app.map((r) =>
				key({
					recipe_id: r.recipeId,
					daily_profit: Math.round(r.metrics.dailyProfit * 100) / 100,
				})
			)
		);
		expect(data.price_basis.basis).toBe("plan");
		expect(data.empire).toBeNull();
	});

	it("matches the app with an empire's CX and other settings", async () => {
		const cx = (fixtures.cxs as unknown as CX[]).find((c) =>
			c.empires.some((e) => e.uuid === EMPIRE_UUID)
		)!;
		const data = await run({
			empire_uuid: EMPIRE_UUID,
			cogc: "none",
			experts: 3,
			buffer_days: 0,
		});
		const app = appRows(
			{ cogc: "none", experts: 3, bufferDays: 0 },
			cx
		).slice(0, 20);
		expect(data.rows.map((r: any) => r.recipe_id)).toEqual(
			app.map((r) => r.recipeId)
		);
		expect(data.rows[0].break_even_days).toBeCloseTo(
			app[0].metrics.breakEven,
			1
		);
		expect(data.price_basis.cx_preference).toBe(cx.cx_name);
		expect(data.settings.buffer_days).toBe(0);
	});

	it("filters by building, expertise and output ticker", async () => {
		const all = await run({ limit: 100 });
		const { building, expertise } = all.rows[0];
		const ticker = all.rows[0].outputs[0].ticker;

		const byBuilding = await run({ building: building.toLowerCase() });
		expect(byBuilding.rows.length).toBeGreaterThan(0);
		expect(byBuilding.rows.every((r: any) => r.building === building)).toBe(
			true
		);

		const byExpertise = await run({ expertise });
		expect(
			byExpertise.rows.every((r: any) => r.expertise === expertise)
		).toBe(true);

		const byTicker = await run({ ticker });
		expect(byTicker.rows.length).toBeGreaterThan(0);
		expect(
			byTicker.rows.every((r: any) =>
				r.outputs.some((o: any) => o.ticker === ticker)
			)
		).toBe(true);

		expect((await run({ building: "NOPE" })).rows).toEqual([]);
	});

	it("limits the rows and sends only GET requests", async () => {
		const data = await run({ limit: 3, empire_uuid: EMPIRE_UUID });
		expect(data.rows).toHaveLength(3);
		expect(backend.requests.length).toBeGreaterThan(0);
		expect(backend.requests.every((r) => r.method === "GET")).toBe(true);
	});
});
