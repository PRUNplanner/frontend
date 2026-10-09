import { describe, expect, it } from "vitest";

import { diffEmpire } from "@/features/empire/empireDiff";

const EMPIRE = {
	empire_name: "Main",
	empire_faction: "BENTEN",
	empire_permits_used: 2,
	empire_permits_total: 3,
};

describe("diffEmpire", () => {
	it("no changes", () => {
		expect(diffEmpire(EMPIRE, { ...EMPIRE })).toStrictEqual([]);
	});

	it("every changed field", () => {
		expect(
			diffEmpire(EMPIRE, {
				empire_name: "Side",
				empire_faction: "MORIA",
				empire_permits_used: 3,
				empire_permits_total: 4,
			})
		).toStrictEqual([
			{ area: "name", key: "name", params: { from: "Main", to: "Side" } },
			{
				area: "faction",
				key: "faction",
				params: { from: "BENTEN", to: "MORIA" },
			},
			{
				area: "permits_used",
				key: "permits_used",
				params: { from: 2, to: 3 },
			},
			{
				area: "permits_total",
				key: "permits_total",
				params: { from: 3, to: 4 },
			},
		]);
	});
});
