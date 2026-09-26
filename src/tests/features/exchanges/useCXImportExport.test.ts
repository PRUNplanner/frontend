import { describe, it, expect, vi, beforeEach } from "vitest";
import Papa from "papaparse";
import {
	ICXDataExchangeOption,
	ICXDataTickerOption,
} from "@/stores/planningStore.types";
import { useCXImportExport } from "@/features/exchanges/useCXImportExport";
import { ICXPlanetMap } from "@/features/exchanges/manageCX.types";

vi.mock("papaparse", () => ({
	default: {
		parse: vi.fn(),
	},
}));

const COLUMNS = ["Location", "Type", "CX", "Ticker", "Price"];

describe("useCXImportExport", () => {
	const { parseSettingsCSV, generateSettingsCSV } = useCXImportExport();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("parseSettingsCSV", () => {
		it("should correctly segregate empire and planet options", async () => {
			const mockRows = [
				{
					Location: "EMPIRE",
					Type: "BUY",
					CX: "AI1_30D",
					Ticker: "",
					Price: "",
				},
				{
					Location: "EMPIRE",
					Type: "SELL",
					CX: "",
					Ticker: "MAT",
					Price: "100",
				},
				{
					Location: "Montem",
					Type: "SELL",
					CX: "IC1_7D",
					Ticker: "",
					Price: "",
				},
				{
					Location: "Montem",
					Type: "BUY",
					CX: "",
					Ticker: "H2O",
					Price: "50",
				},
				{ Location: "", Type: "BUY", CX: "", Ticker: "", Price: "" },
			];

			(Papa.parse as any).mockImplementation(
				(_file: File, config: any) => {
					config.complete({ data: mockRows, meta: { fields: COLUMNS } });
				}
			);

			const file = new File([""], "test.csv");
			const result = await parseSettingsCSV(file);

			expect(result.empireCX).toEqual([
				{ type: "BUY", exchange: "AI1_30D" },
			]);

			expect(result.empireTickerOptions).toEqual([
				{ type: "SELL", ticker: "MAT", value: 100 },
			]);

			expect(result.planetsCX).toHaveLength(1);
			expect(result.planetsCX[0].planet).toBe("Montem");
			expect(result.planetsCX[0].exchanges).toContainEqual({
				type: "SELL",
				exchange: "IC1_7D",
			});

			expect(result.plantesTickerOptions).toHaveLength(1);
			expect(result.plantesTickerOptions[0].planet).toBe("Montem");
			expect(result.plantesTickerOptions[0].ticker).toContainEqual({
				type: "BUY",
				ticker: "H2O",
				value: 50,
			});
		});

		const row = (Type: string, CX: string, Ticker: string, Price: string) => ({
			Location: "EMPIRE",
			Type,
			CX,
			Ticker,
			Price,
		});

		function parseRows(rows: unknown[], fields: string[] = COLUMNS) {
			(Papa.parse as any).mockImplementation(
				(_file: File, config: any) =>
					config.complete({ data: rows, meta: { fields } })
			);
			return parseSettingsCSV(new File([""], "test.csv"));
		}

		it("rejects a file without the export columns", async () => {
			// a JSON file becomes one header without rows
			await expect(parseRows([], ['{"cx_empire": []}'])).rejects.toThrow(
				"Missing CSV columns: Location, Type, CX, Ticker, Price"
			);
			await expect(
				parseRows([], ["Location", "Type", "CX", "Ticker"])
			).rejects.toThrow("Missing CSV columns: Price");
		});

		it.each([
			["an unknown type", row("MAYBE", "AI1_30D", "", "")],
			["an unknown exchange", row("BUY", "AI1_BUY", "", "")],
			["a row without exchange and ticker", row("BUY", "", "", "")],
			["a price that is not a number", row("BUY", "", "RAT", "cheap")],
			["a ticker without price", row("SELL", "", "RAT", "")],
			["a blank price", row("SELL", "", "RAT", "  ")],
		])("rejects the whole file for %s", async (_name, invalid) => {
			const valid = row("BUY", "", "DW", "80");

			await expect(parseRows([valid, invalid])).rejects.toThrow();
		});

		it("accepts a price of 0", async () => {
			const result = await parseRows([row("BUY", "", "RAT", "0")]);

			expect(result.empireTickerOptions).toEqual([
				{ type: "BUY", ticker: "RAT", value: 0 },
			]);
		});

		it("should reject promise on parse error", async () => {
			const mockError = new Error("Test Parse Error");
			(Papa.parse as any).mockImplementation(
				(_file: File, config: any) => {
					if (config.error) config.error(mockError);
				}
			);

			const file = new File([""], "error.csv");
			await expect(parseSettingsCSV(file)).rejects.toThrow(
				"Test Parse Error"
			);
		});
	});

	describe("generateSettingsCSV", () => {
		it("should generate a valid CSV string", () => {
			const empireCX: ICXDataExchangeOption[] = [
				{ type: "BUY", exchange: "AI1_30D" },
			];
			const empireTickerOptions: ICXDataTickerOption[] = [
				{ type: "SELL", ticker: "MAT", value: 100 },
			];

			const planetsCX: ICXPlanetMap[string][] = [
				{
					planet: "Montem",
					exchanges: [{ type: "SELL", exchange: "AI1_30D" }],
					ticker: [],
				},
			];
			const plantesTickerOptions: ICXPlanetMap[string][] = [
				{
					planet: "Montem",
					exchanges: [],
					ticker: [{ type: "BUY", ticker: "H2O", value: 50 }],
				},
			];

			const csv = generateSettingsCSV(
				empireCX,
				empireTickerOptions,
				planetsCX,
				plantesTickerOptions
			);

			expect(csv).toContain("Location;Type;CX;Ticker;Price");
			expect(csv).toContain("EMPIRE;BUY;AI1_30D;;");
			expect(csv).toContain("EMPIRE;SELL;;MAT;100");
			expect(csv).toContain("Montem;SELL;AI1_30D;;");
			expect(csv).toContain("Montem;BUY;;H2O;50");
		});
	});
});
