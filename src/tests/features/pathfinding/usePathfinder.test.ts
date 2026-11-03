import { afterEach, describe, expect, it, vi } from "vitest";

import { usePathfinder } from "@/features/pathfinding/usePathfinder";
import systems from "@/assets/static/fio_systemstars.json";

const antares = "8ecf9670ba070d78cfb5537e8d9f1b6c";
const montem = "49b6615d39ccba05752b3be77b2ebf36";

describe("usePathfinder", async () => {
	it("getPathBetween: ok reverse", async () => {
		const { getPathBetween } = usePathfinder();

		const path = getPathBetween(montem, antares);

		expect(path).toBeDefined();
		expect(path?.length).toBe(13);
	});

	it("getPathBetween: ok", async () => {
		const { getPathBetween, getPathBetweenLength } = usePathfinder();

		const path = getPathBetween(antares, montem);
		const length = getPathBetweenLength(antares, montem);

		expect(path).toBeDefined();
		expect(path?.length).toBe(13);
		expect(length).toBe(12);
	});

	it("getPathBetween: same origin and target", async () => {
		const { getPathBetween } = usePathfinder();

		const path = getPathBetween(antares, antares);

		expect(path).toBeDefined();
		expect(path?.length).toBe(1);
	});

	it("getSystemName: ok", async () => {
		const { getSystemName } = usePathfinder();

		const name = getSystemName(montem);

		expect(name).toBeDefined();
		expect(name).toBe("Moria");
	});

	it("getSystemName: not available", async () => {
		const { getSystemName } = usePathfinder();

		const name = getSystemName("foo");

		expect(name).toBeNull();
	});

	it("getJumpsFrom: matches path lengths, cached, unknown source", async () => {
		const { getJumpsFrom, getPathBetweenLength, systemidNC1, systemidAI1 } =
			usePathfinder();

		const jumps = getJumpsFrom(systemidNC1);
		expect(jumps.get(systemidNC1)).toBe(0);
		expect(jumps.get(systemidAI1)).toBe(
			getPathBetweenLength(systemidNC1, systemidAI1)
		);
		expect(getJumpsFrom(systemidNC1)).toBe(jumps);
		expect(getJumpsFrom("unknown").size).toBe(0);
	});
});

// recorded on the full FIO export before it was trimmed to ids, names and
// one entry per connection: the trimmed file must give the same distances
describe("usePathfinder: trimmed systems file", () => {
	const id = (naturalId: string) =>
		systems.find((s) => s.NaturalId === naturalId)!.SystemId;

	it.each([
		["OT-580", "ZV-307", 12],
		["ZV-307", "VH-331", 8],
		["OT-580", "TD-203", 20],
		["HM-049", "KW-602", 8],
		["ZV-759", "UV-351", 8],
		["AM-783", "FK-371", 23],
		["JS-299", "QJ-149", 11],
		["YK-649", "OF-375", 14],
	])("%s → %s: %i jumps", (from, to, jumps) => {
		const { getPathBetweenLength } = usePathfinder();
		expect(getPathBetweenLength(id(from), id(to))).toBe(jumps);
		expect(getPathBetweenLength(id(to), id(from))).toBe(jumps);
	});

	it.each([
		["49b6615d39ccba05752b3be77b2ebf36", 8882],
		["8ecf9670ba070d78cfb5537e8d9f1b6c", 11099],
		["92029ff27c1abe932bd2c61ee4c492c7", 10368],
		["f2f57766ebaca9d69efae41ccf4d8853", 9250],
	])("from market %s: 637 systems, %i jumps in total", (market, total) => {
		const jumps = usePathfinder().getJumpsFrom(market);
		expect(jumps.size).toBe(637);
		expect([...jumps.values()].reduce((a, b) => a + b, 0)).toBe(total);
	});
});

describe("usePathfinder: odd galaxy data", () => {
	const A = "49b6615d39ccba05752b3be77b2ebf36"; // Moria, a market
	const B = "b";
	const C = "8ecf9670ba070d78cfb5537e8d9f1b6c"; // Antares, a market
	const D = "d";

	// fresh module state per test: the graph is built once per module
	async function load() {
		vi.resetModules();
		vi.doMock("@/assets/static/fio_systemstars.json", () => ({
			default: [
				{
					SystemId: A,
					Name: "Alpha",
					// itself, a system that doesn't exist, and B
					Connections: [
						{ ConnectingId: A },
						{ ConnectingId: "ghost" },
						{ ConnectingId: B },
					],
				},
				// a system without any connection list
				{ SystemId: B, Name: "Bravo" },
				// a market nobody connects to
				{ SystemId: C, Name: "Charlie", Connections: [] },
				// only linked from D's side
				{
					SystemId: D,
					Name: "Delta",
					Connections: [{ ConnectingId: B }],
				},
			],
		}));
		const { usePathfinder } =
			await import("@/features/pathfinding/usePathfinder");
		return usePathfinder();
	}

	afterEach(() => {
		vi.doUnmock("@/assets/static/fio_systemstars.json");
		vi.resetModules();
	});

	it("links systems both ways and ignores unknown connections", async () => {
		const { getPathBetween, getJumpsFrom, ready } = await load();

		expect(ready.value).toBe(true);
		expect(getPathBetween(A, B)).toStrictEqual([A, B]);
		expect(getPathBetween(B, A)).toStrictEqual([B, A]);
		expect(getPathBetween(A, D)).toStrictEqual([A, B, D]);
		expect(getPathBetween(A, A)).toStrictEqual([A]);
		expect(Object.fromEntries(getJumpsFrom(A))).toStrictEqual({
			[A]: 0,
			[B]: 1,
			[D]: 2,
		});
	});

	it("has no path to an isolated or unknown system", async () => {
		const { getPathBetween, getPathBetweenLength } = await load();

		expect(getPathBetween(A, C)).toBeNull();
		expect(getPathBetweenLength(A, C)).toBe(-1);
		expect(getPathBetween(A, "ghost")).toBeNull();
		expect(getPathBetween("ghost", A)).toBeNull();
		expect(getPathBetweenLength(A, D)).toBe(2);
	});

	it("finds several targets from the same source", async () => {
		const { getPathBetween } = await load();

		const first = getPathBetween(B, D);
		const second = getPathBetween(B, A);

		expect(first).toStrictEqual([B, D]);
		expect(second).toStrictEqual([B, A]);
	});

	it("names systems from the data", async () => {
		const { getSystemName } = await load();

		expect(getSystemName(D)).toBe("Delta");
	});
});
