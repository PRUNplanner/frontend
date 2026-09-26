import { describe, it, expect } from "vitest";

// Composables
import { useXITAction } from "@/features/xit/useXITAction";

// Types & Interfaces

describe("useXITAction", async () => {
	const { transferJSON } = useXITAction();

	it("transferJSON, no options", async () => {
		const result = transferJSON([
			{
				ticker: "ALO",
				value: 1,
			},
		]);

		expect(result.value).toBe(
			'{"actions":[{"type":"MTRA","name":"TransferAction","group":"A1","origin":"Configure on Execution","dest":"Configure on Execution"}],"global":{"name":"PRUNplanner"},"groups":[{"type":"Manual","name":"A1","materials":{"ALO":1}}]}'
		);
	});

	it("transferJSON, with options", async () => {
		const result = transferJSON(
			[
				{
					ticker: "ALO",
					value: 1,
				},
			],
			{
				name: "foo",
				origin: "moo origin",
				destination: "meow destination",
			}
		);

		expect(result.value).toContain("foo");
		expect(result.value).toContain("moo origin");
		expect(result.value).toContain("meow destination");
	});

	it("transferJSON, with options and buy", async () => {
		const result = transferJSON(
			[
				{
					ticker: "ALO",
					value: 1,
				},
			],
			{
				name: "foo",
				origin: "Antares Station Warehouse",
				destination: "Configure on Execution",
				buy: true,
			}
		);

		expect(result.value).toContain("foo");
		expect(result.value).toContain("Antares Station Warehouse");
		expect(result.value).toContain("Configure on Execution");
		expect(result.value).toContain("priceLimits");
		expect(result.value).toContain("buyPartial");
		expect(result.value).toContain("useCXInv");
		expect(result.value).toContain("BuyItems");
	});
});
