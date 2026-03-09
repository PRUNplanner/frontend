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
					CX: "AI1_BUY",
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
					CX: "IC1_SELL",
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
					config.complete({ data: mockRows });
				}
			);

			const file = new File([""], "test.csv");
			const result = await parseSettingsCSV(file);

			expect(result.empireCX).toEqual([
				{ type: "BUY", exchange: "AI1_BUY" },
			]);

			expect(result.empireTickerOptions).toEqual([
				{ type: "SELL", ticker: "MAT", value: 100 },
			]);

			expect(result.planetsCX).toHaveLength(1);
			expect(result.planetsCX[0].planet).toBe("Montem");
			expect(result.planetsCX[0].exchanges).toContainEqual({
				type: "SELL",
				exchange: "IC1_SELL",
			});

			expect(result.plantesTickerOptions).toHaveLength(1);
			expect(result.plantesTickerOptions[0].planet).toBe("Montem");
			expect(result.plantesTickerOptions[0].ticker).toContainEqual({
				type: "BUY",
				ticker: "H2O",
				value: 50,
			});
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
