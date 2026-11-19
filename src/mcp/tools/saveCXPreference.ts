import { z } from "zod";

// Util
import { assignCX, getCXs, getEmpires } from "@/mcp/context";
import { loadGameData, resolvePlanetId } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { defineTool, plural, uuidArg } from "@/mcp/tools/shared";

// Schemas
import {
	CXDataExchangeOptionSchema,
	CXDataTickerOptionSchema,
	CXPutSchema,
	CXSchema,
} from "@/features/api/schemas/cxData.schemas";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { CX } from "@/features/api/schemas/cxData.schemas";

const PlanetRowSchema = <T extends z.ZodType>(option: T) =>
	z.object({
		planet: z.string().describe("Planet id (OT-580b) or name"),
		preferences: z
			.array(option)
			.describe("Replaces the planet's list; [] removes the planet"),
	});

type CXData = CX["cx_data"];

/** a section's planet rows with the given planets replaced (or removed) */
async function mergePlanets<T>(
	b: IBackend,
	rows: { planet: string; preferences: T[] }[],
	given: { planet: string; preferences: T[] }[]
): Promise<{ planet: string; preferences: T[] }[]> {
	const merged = new Map(rows.map((r) => [r.planet, r.preferences]));
	for (const g of given) {
		const id = await resolvePlanetId(b, g.planet);
		if (g.preferences.length) merged.set(id, g.preferences);
		else merged.delete(id);
	}
	return [...merged].map(([planet, preferences]) => ({
		planet,
		preferences,
	}));
}

const summary = (d: CXData): string =>
	[
		d.cx_empire.length
			? d.cx_empire.map((o) => `${o.type} ${o.exchange}`).join(", ")
			: "no exchange set (Universe VWAP 30D)",
		d.cx_planets.length &&
			`${plural(d.cx_planets.length, "planet")} with own exchanges`,
		d.ticker_empire.length &&
			`${plural(d.ticker_empire.length, "fixed price")}`,
		d.ticker_planets.length &&
			`${plural(d.ticker_planets.length, "planet")} with own prices`,
	]
		.filter(Boolean)
		.join("; ");

export const saveCXPreference = defineTool({
	name: "save_cx_preference",
	title: "Create or change a CX preference",
	write: "save",
	overwrites: true,
	description:
		'Creates a CX preference (no cx_uuid; name required) or changes one: how its empires\' plans are priced. exchanges sets the empire-wide price source per side, e.g. [{type:"BUY",exchange:"AI1_ASK"},{type:"SELL",exchange:"AI1_BID"}] or [{type:"BOTH",exchange:"NC1_30D"}]; ticker_prices fixes prices per material. planet_exchanges and planet_ticker_prices do the same for one planet (replacing that planet\'s list; [] removes it). Each given section replaces that section; sections not given stay. empires sets exactly which empires use the preference (an empire can use one preference; others keep theirs). Returns the preference.',
	inputSchema: z.object({
		cx_uuid: uuidArg()
			.optional()
			.describe("The CX preference to change; omit to create one"),
		name: z.string().trim().min(1).max(100).optional(),
		exchanges: z.array(CXDataExchangeOptionSchema).optional(),
		ticker_prices: z.array(CXDataTickerOptionSchema).optional(),
		planet_exchanges: z
			.array(PlanetRowSchema(CXDataExchangeOptionSchema))
			.optional(),
		planet_ticker_prices: z
			.array(PlanetRowSchema(CXDataTickerOptionSchema))
			.optional(),
		empires: z
			.array(uuidArg())
			.optional()
			.describe("Exactly the empires that use this preference"),
	}),
	async run(args, { backend }) {
		const [cxs, empires] = await Promise.all([
			getCXs(backend),
			args.empires ? getEmpires(backend) : Promise.resolve([]),
		]);
		const current = args.cx_uuid
			? cxs.find((c) => c.uuid === args.cx_uuid)
			: undefined;
		if (args.cx_uuid && !current)
			throw new ToolError(`Unknown CX preference ${args.cx_uuid}.`);
		if (!current && !args.name)
			throw new ToolError("A new CX preference needs a name.");
		const unknownEmpires = (args.empires ?? []).filter(
			(u) => !empires.some((e) => e.uuid === u)
		);
		if (unknownEmpires.length)
			throw new ToolError(
				`Unknown empires: ${unknownEmpires.join(", ")}.`
			);

		const tickers = [
			...(args.ticker_prices ?? []),
			...(args.planet_ticker_prices ?? []).flatMap((p) => p.preferences),
		].map((t) => ({ ...t, ticker: t.ticker.toUpperCase() }));
		if (tickers.length) {
			const { materials } = await loadGameData(backend);
			const unknown = tickers.filter((t) => !materials.has(t.ticker));
			if (unknown.length)
				throw new ToolError(
					`Unknown materials: ${unknown.map((t) => t.ticker).join(", ")}.`
				);
		}
		const upper = <T extends { ticker: string }>(list: T[]) =>
			list.map((t) => ({ ...t, ticker: t.ticker.toUpperCase() }));

		const before: CXData = current?.cx_data ?? {
			cx_empire: [],
			cx_planets: [],
			ticker_empire: [],
			ticker_planets: [],
		};
		const data: CXData = {
			cx_empire: args.exchanges ?? before.cx_empire,
			ticker_empire: args.ticker_prices
				? upper(args.ticker_prices)
				: before.ticker_empire,
			cx_planets: args.planet_exchanges
				? await mergePlanets(
						backend,
						before.cx_planets,
						args.planet_exchanges
					)
				: before.cx_planets,
			ticker_planets: args.planet_ticker_prices
				? await mergePlanets(
						backend,
						before.ticker_planets,
						args.planet_ticker_prices.map((p) => ({
							...p,
							preferences: upper(p.preferences),
						}))
					)
				: before.ticker_planets,
		};
		const name = args.name ?? current!.cx_name;

		let saved: CX;
		if (current)
			saved = await backend.send(
				"PUT",
				`/planning/cx/${encodeURIComponent(current.uuid)}/`,
				// a newer save in the app is a conflict, not overwritten
				{
					cx_name: name,
					cx_data: data,
					base_modified_at: current.modified_at,
				},
				CXPutSchema,
				CXSchema
			);
		else
			saved = await backend.send(
				"POST",
				"/planning/cx/",
				{ cx_name: name, cx_data: data },
				CXPutSchema,
				CXSchema
			);

		let users = saved.empires.map((e) => e.empire_name);
		if (args.empires) {
			const wanted = new Set(args.empires);
			const changes = new Map<string, string | undefined>();
			// asked for: this one; using it before but not asked for: none
			for (const u of wanted) changes.set(u, saved.uuid);
			for (const e of saved.empires)
				if (!wanted.has(e.uuid)) changes.set(e.uuid, undefined);
			const after = await assignCX(
				backend,
				current ? cxs : [...cxs, saved],
				changes
			);
			users =
				after
					.find((c) => c.uuid === saved.uuid)
					?.empires.map((e) => e.empire_name) ?? [];
		}

		return {
			text: `${current ? "Saved" : "Created"} the CX preference "${saved.cx_name}": ${summary(saved.cx_data)}. Used by ${users.length ? users.join(", ") : "no empire"}.`,
			data: {
				cx_preference: {
					uuid: saved.uuid,
					name: saved.cx_name,
					...saved.cx_data,
					empires: users,
				},
				reload_hint:
					"If PRUNplanner is open, reload the page to see the change.",
			},
		};
	},
});
