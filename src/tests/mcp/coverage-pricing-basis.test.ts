// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import {
	getHistory,
	getSparks,
	historySummary,
	loadGameData,
	resolvePlanetId,
} from "@/mcp/gameData";
import { basisBook, basisText } from "@/mcp/priceBasis";
import { API_KEY, fakeBackend, fixtures } from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IMcpGameData } from "@/mcp/gameData";
import type { CX, Exchange } from "@prunplanner/engine/schemas";

/** game data with only the exchange rows the price books read */
function stubGameData(rows: Record<string, Partial<Exchange>>): IMcpGameData {
	const exchanges = new Map(
		Object.entries(rows).map(([id, e]) => [id, e as Exchange])
	);
	return {
		exchanges,
		getExchange(id: string) {
			const e = exchanges.get(id);
			if (!e) throw new Error(id);
			return e;
		},
	} as unknown as IMcpGameData;
}

const GAME = stubGameData({
	// X: lowest ask on CI1, highest bid on CI1; IC1 has no offers
	"X.AI1": { ask: 10, bid: 8, vwap_30d: 9 },
	"X.CI1": { ask: 9, bid: 9.5, vwap_30d: 9 },
	"X.IC1": { ask: 0, bid: 0, vwap_30d: 0 },
	"X.UNIVERSE": { vwap_30d: 9.2 },
	// Y: no quote on any exchange, only the Universe
	"Y.UNIVERSE": { vwap_30d: 50 },
	// Z: no row at all
});

const cx = (fixtures.cxs as unknown as CX[])[0];

describe("price bases", () => {
	it("BEST_ASKBID buys at the lowest ask and sells at the highest bid", () => {
		const book = basisBook("BEST_ASKBID", undefined, "KW-688c", GAME);
		expect(book.getPrice("X", "BUY")).toBe(9);
		expect(book.getPrice("X", "SELL")).toBe(9.5);
		expect(book.getPriceSource("X", "BUY")).toEqual({
			level: "empire_exchange",
			exchange: "CI1",
			key: "ask",
			zero: false,
			volume: "CI1",
		});
		expect(book.getPriceSource("X", "SELL")).toMatchObject({
			exchange: "CI1",
			key: "bid",
		});
	});

	it("BEST_ASKBID without any quote falls back to the plan's book", () => {
		const plain = basisBook("BEST_ASKBID", undefined, "KW-688c", GAME);
		// no CX preference: the plan's book is the Universe VWAP 30D
		expect(plain.getPrice("Y", "BUY")).toBe(50);
		expect(plain.getPriceSource("Y", "SELL").exchange).toBe("UNIVERSE");
		// with a CX preference the fallback is that preference's book
		const withCX = basisBook("BEST_ASKBID", cx, "KW-688c", GAME);
		const planBook = basisBook("plan", cx, "KW-688c", GAME);
		expect(withCX.getPrice("Y", "BUY")).toBe(planBook.getPrice("Y", "BUY"));
		expect(withCX.getPriceSource("Y", "BUY")).toEqual(
			planBook.getPriceSource("Y", "BUY")
		);
	});

	it("a VWAP basis without a Universe row prices zero, flagged", () => {
		const book = basisBook("AI1_7D", undefined, "KW-688c", GAME);
		expect(book.getPrice("Z", "BUY")).toBe(0);
		expect(book.getPriceSource("Z", "BUY")).toMatchObject({
			level: "fallback",
			exchange: "UNIVERSE",
			zero: true,
		});
		// an ask/bid basis without offers falls back to the Universe VWAP 30D
		const ask = basisBook("IC1_ASKBID", undefined, "KW-688c", GAME);
		expect(ask.getPrice("X", "BUY")).toBe(9.2);
		expect(ask.getPriceSource("X", "BUY")).toMatchObject({
			level: "fallback",
			zero: false,
		});
	});

	it("says in words how each basis prices", () => {
		expect(basisText("BEST_ASKBID", cx).note).toBe(
			"Priced with bought at the lowest ask and sold at the highest bid across AI1, CI1, IC1, NC1 instead of the plan's CX preference; a material without that price falls back to the Universe VWAP 30D (or the plan's price)."
		);
		expect(basisText("AI1_7D", cx)).toMatchObject({
			cx_preference: null,
			note: expect.stringContaining("AI1 VWAP 7D for every material"),
		});
		expect(basisText("AI1_7D", cx).note).not.toContain("plan's price");
		expect(basisText("NC1_ASKBID", undefined).note).toContain(
			"bought at NC1 ask and sold at NC1 bid"
		);
		expect(basisText("plan", undefined)).toMatchObject({
			cx_preference: null,
			note: "No CX preference: every price is the Universe VWAP 30D.",
		});
	});
});

describe("game data helpers", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("historySummary: median of an even count, no trend under 14 days", () => {
		expect(historySummary([null, 4, 1, null, 3, 2])).toEqual({
			days_traded: 4,
			min: 1,
			median: 2.5,
			max: 4,
			last: 2,
			last_days_ago: 0,
			trend_pct: null,
		});
		expect(historySummary([5, null, null])?.last_days_ago).toBe(2);
		expect(historySummary([null, null])).toBeNull();
		expect(historySummary(undefined)).toBeNull();
	});

	it("getExchange throws for a ticker without exchange data", async () => {
		const backend = fakeBackend();
		const b = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		const gameData = await loadGameData(b);
		expect(gameData.getExchange("RAT.NC1").ticker).toBe("RAT");
		expect(() => gameData.getExchange("NOPE.NC1")).toThrow(
			"Exchange data for ticker 'NOPE.NC1' not found."
		);
		// loaded once: the same derived maps on the next call
		expect(await loadGameData(b)).toBe(gameData);
	});

	it("resolvePlanetId: exact names first, several matches listed", async () => {
		const index = fixtures.searchIndex;
		const twins = Array.from({ length: 12 }, (_, i) => ({
			...index[i + 1],
			planet_name: `Twin ${i + 1}`,
		}));
		const pairs = [13, 14].map((i, n) => ({
			...index[i],
			planet_name: `Pair ${n}`,
		}));
		const backend = fakeBackend(undefined, [
			[
				/^\/data\/planets\/search-index\/$/,
				[
					index.find((p) => p.planet_natural_id === "KW-688c"),
					...twins,
					...pairs,
				],
			],
		]);
		const b = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		expect(await resolvePlanetId(b, " Etherwind ")).toBe("KW-688c");
		expect(await resolvePlanetId(b, "therw")).toBe("KW-688c");
		expect(await resolvePlanetId(b, "kw-688C")).toBe("KW-688c");
		await expect(resolvePlanetId(b, "Pair")).rejects.toThrow(
			/"Pair" matches 2 planets: Pair 0 \([^)]+\), Pair 1 \([^)]+\)\. Pass the id\./
		);
		const many = resolvePlanetId(b, "twin");
		await expect(many).rejects.toThrow("matches 12 planets");
		await expect(many).rejects.toThrow(", …. Pass the id.");
		await expect(resolvePlanetId(b, "nowhere")).rejects.toThrow(
			'No planet named "nowhere"'
		);
	});

	it("a failed load doesn't evict the newer one that replaced it", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		const pending: ((r: Response) => void)[] = [];
		const paths: string[] = [];
		const b = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: ((input: RequestInfo | URL) => {
				paths.push(new URL(String(input)).pathname);
				return new Promise<Response>((resolve) =>
					pending.push(resolve)
				);
			}) as typeof fetch,
		});
		const ok = (body: unknown) =>
			new Response(JSON.stringify(body), { status: 200 });
		// requests start once the backend's concurrency limit lets them
		const answer = async (i: number, r: Response) => {
			await vi.waitFor(() => expect(pending[i]).toBeDefined());
			pending[i](r);
		};

		// sparks: the first request fails after a newer one replaced it
		const stale = getSparks(b, "CI1");
		vi.setSystemTime(Date.now() + 2 * 3_600_000);
		const fresh = getSparks(b, "CI1");
		await answer(0, new Response("{}", { status: 404 }));
		await expect(stale).rejects.toMatchObject({ code: "tool_error" });
		const sparks = { exchange: "CI1", days: 30, series: { RAT: [1, 2] } };
		await answer(1, ok(sparks));
		expect(await fresh).toMatchObject({ series: { RAT: [1, 2] } });
		// still cached: no third request
		expect(await getSparks(b, "CI1")).toMatchObject(sparks);
		expect(paths).toHaveLength(2);

		// history: the same for a material's history
		const oldHistory = getHistory(b, "FE", "NC1");
		vi.setSystemTime(Date.now() + 2 * 3_600_000);
		const newHistory = getHistory(b, "FE", "NC1");
		await answer(2, new Response("{}", { status: 404 }));
		await expect(oldHistory).rejects.toMatchObject({ code: "tool_error" });
		await answer(3, ok([]));
		expect(await newHistory).toEqual([]);
		expect(await getHistory(b, "FE", "NC1")).toEqual([]);
		expect(paths.filter((p) => p === "/data/cxpc/FE/")).toHaveLength(2);
	});
});
