import { describe, it, expect } from "vitest";

import { usePathfinder } from "@/features/pathfinding/usePathfinder";

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
});
