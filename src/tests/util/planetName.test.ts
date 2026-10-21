import { describe, expect, it } from "vitest";

import systems from "@/assets/static/fio_systemstars.json";
import systemNames from "@/assets/static/system_names.json";
import {
	planetDisplayName,
	planetLabel,
	systemName,
} from "@/util/planetName";

describe("systemName", () => {
	it("names a planet's named system, whatever the planet's name", () => {
		expect(systemName("ZV-759b")).toBe("Antares II");
		expect(systemName("ZV-759e")).toBe("Antares II");
	});

	it("is undefined for an unnamed system or a malformed id", () => {
		expect(systemName("KW-602a")).toBeUndefined();
		expect(systemName("ZV-759")).toBeUndefined();
		expect(systemName("zv-759e")).toBeUndefined();
	});
});

describe("planetDisplayName", () => {
	it("names an unnamed planet after its named system", () => {
		expect(planetDisplayName("ZV-759e", "ZV-759e")).toBe("Antares II e");
		expect(planetDisplayName("ZV-759e", "")).toBe("Antares II e");
	});

	it("keeps a real planet name", () => {
		expect(planetDisplayName("ZV-759b", "Vulcan")).toBe("Vulcan");
	});

	it("keeps the id in an unnamed system", () => {
		expect(planetDisplayName("KW-602a", "KW-602a")).toBe("KW-602a");
	});

	it("never derives without the record", () => {
		expect(planetDisplayName("ZV-759b", undefined)).toBe("ZV-759b");
		expect(planetDisplayName("ZV-759b", null)).toBe("ZV-759b");
	});

	it("handles multi-letter suffixes", () => {
		expect(planetDisplayName("ZV-759aa", "ZV-759aa")).toBe(
			"Antares II aa"
		);
	});

	it("keeps a malformed id", () => {
		expect(planetDisplayName("ZV-759", "ZV-759")).toBe("ZV-759");
		expect(planetDisplayName("zv-759e", "")).toBe("zv-759e");
	});
});

describe("planetLabel", () => {
	it("adds the id to a name", () => {
		expect(planetLabel("ZV-759e", "ZV-759e")).toBe("Antares II e (ZV-759e)");
		expect(planetLabel("ZV-759b", "Vulcan")).toBe("Vulcan (ZV-759b)");
	});

	it("is the bare id without a name", () => {
		expect(planetLabel("KW-602a", "KW-602a")).toBe("KW-602a");
		expect(planetLabel("ZV-759b", undefined)).toBe("ZV-759b");
	});
});

describe("system_names.json", () => {
	it("equals the map derived from fio_systemstars.json", () => {
		const derived = Object.fromEntries(
			systems
				.filter((s) => s.Name && s.Name !== s.NaturalId)
				.map((s) => [s.NaturalId, s.Name])
		);
		expect(systemNames).toEqual(derived);
	});
});
