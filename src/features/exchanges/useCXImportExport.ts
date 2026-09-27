import type {
	CXDataExchangeOption,
	CXDataTickerOption,
} from "@/features/api/schemas/cxData.schemas";
import type { ICXPlanetMap } from "./manageCX.types";
import {
	CXDataExchangeOptionSchema,
	CXDataTickerOptionSchema,
} from "@/features/api/schemas/cxData.schemas";

import Papa from "papaparse";

interface IExchangeCSVRow {
	Location: string;
	Type: string;
	CX: string;
	Ticker: string;
	// papaparse leaves the key out of a row with too few fields
	Price?: string;
}

// columns written by generateSettingsCSV
const CSV_COLUMNS: (keyof IExchangeCSVRow)[] = [
	"Location",
	"Type",
	"CX",
	"Ticker",
	"Price",
];

// validated like the CX payload, so an invalid file is rejected as a whole
const exchangeOption = (row: IExchangeCSVRow): CXDataExchangeOption =>
	CXDataExchangeOptionSchema.parse({ type: row.Type, exchange: row.CX });

// an empty price is no price, Number("") would be 0
const tickerOption = (row: IExchangeCSVRow): CXDataTickerOption =>
	CXDataTickerOptionSchema.parse({
		type: row.Type,
		ticker: row.Ticker,
		value: row.Price?.trim() ? Number(row.Price) : NaN,
	});

export function useCXImportExport() {
	const parseSettingsCSV = (
		file: File
	): Promise<{
		empireCX: CXDataExchangeOption[];
		empireTickerOptions: CXDataTickerOption[];
		planetsCX: ICXPlanetMap[string][];
		plantesTickerOptions: ICXPlanetMap[string][];
	}> => {
		return new Promise((resolve, reject) => {
			Papa.parse<IExchangeCSVRow>(file, {
				header: true,
				complete: (results) => {
					// not an export, importing would wipe all preferences
					const missing = CSV_COLUMNS.filter(
						(c) => !results.meta.fields?.includes(c)
					);
					if (missing.length > 0) {
						reject(
							new Error(
								`Missing CSV columns: ${missing.join(", ")}`
							)
						);
						return;
					}

					const empireCX: CXDataExchangeOption[] = [];
					const empireTickerOptions: CXDataTickerOption[] = [];

					const planetsCXMap = new Map<
						string,
						ICXPlanetMap[string]
					>();
					const planetTickerOptionsMap = new Map<
						string,
						ICXPlanetMap[string]
					>();

					// a row that is no valid preference throws
					try {
						results.data.forEach((row) => {
							if (!row.Location) return;

							const isEmpire = row.Location === "EMPIRE";
							const isTicker =
								row.Ticker && row.Ticker.trim() !== "";
							if (isEmpire) {
								if (!isTicker) {
									empireCX.push(exchangeOption(row));
								} else {
									empireTickerOptions.push(tickerOption(row));
								}
							} else {
								const targetMap = isTicker
									? planetTickerOptionsMap
									: planetsCXMap;

								let planetData = targetMap.get(row.Location);

								if (!planetData) {
									planetData = {
										planet: row.Location,
										exchanges: [],
										ticker: [],
									};
									targetMap.set(row.Location, planetData);
								}

								if (!isTicker) {
									planetData.exchanges.push(
										exchangeOption(row)
									);
								} else {
									planetData.ticker.push(tickerOption(row));
								}
							}
						});
					} catch (err) {
						reject(
							err instanceof Error ? err : new Error(String(err))
						);
						return;
					}

					resolve({
						empireCX,
						empireTickerOptions,
						planetsCX: Array.from(planetsCXMap.values()),
						plantesTickerOptions: Array.from(
							planetTickerOptionsMap.values()
						),
					});
				},
				error: (error) => reject(error),
			});
		});
	};
	const generateSettingsCSV = (
		empireCX: CXDataExchangeOption[],
		empireTickerOptions: CXDataTickerOption[],
		planetsCX: ICXPlanetMap[string][],
		plantesTickerOptions: ICXPlanetMap[string][]
	): string => {
		let csvContent = "Location;Type;CX;Ticker;Price";

		if (empireCX) {
			for (const option of empireCX) {
				csvContent = `${csvContent}\nEMPIRE;${option.type};${option.exchange};;`;
			}
		}

		if (planetsCX) {
			for (const planet of planetsCX) {
				for (const option of planet.exchanges) {
					csvContent = `${csvContent}\n${planet.planet};${option.type};${option.exchange};;`;
				}
			}
		}

		if (empireTickerOptions) {
			for (const option of empireTickerOptions) {
				csvContent = `${csvContent}\nEMPIRE;${option.type};;${option.ticker};${option.value}`;
			}
		}

		if (plantesTickerOptions) {
			for (const planet of plantesTickerOptions) {
				for (const option of planet.ticker) {
					csvContent = `${csvContent}\n${planet.planet};${option.type};;${option.ticker};${option.value}`;
				}
			}
		}
		return csvContent;
	};

	return {
		parseSettingsCSV,
		generateSettingsCSV,
	};
}
