import { describe, it, expect } from "vitest";
import { nextTick } from "vue";

import config from "@/lib/config";
import { API_ENDPOINTS } from "@/features/api_keys/apiEndpoints";
import {
	API_KEY_PLACEHOLDER,
	buildSnippets,
	useAPIBuilder,
} from "@/features/api_keys/useAPIBuilder";

const BASE = config.API_BASE_URL;
const VALUES = {
	empire: "e-uuid",
	plan: "p-uuid",
	cx: "c-uuid",
	planet: "OT-580b",
	ticker: "RAT",
	exchange: "AI1",
	days: "7",
};
const byId = (id: string) => API_ENDPOINTS.find((e) => e.id === id)!;

describe("buildSnippets", () => {
	it("empire material I/O as CSV with the placeholder", () => {
		const s = buildSnippets(
			byId("empire_material_io"),
			"csv",
			VALUES,
			null
		)!;
		expect(s.url).toBe(
			`${BASE}/planning/empire/e-uuid/material_io/csv/?api_key=${API_KEY_PLACEHOLDER}`
		);
		expect(s.sheets).toBe(`=IMPORTDATA("${s.url}")`);
	});

	it("JSON has no Sheets formula", () => {
		const s = buildSnippets(
			byId("empire_material_io"),
			"json",
			VALUES,
			"real"
		)!;
		expect(s.url).toBe(
			`${BASE}/planning/empire/e-uuid/material_io/?api_key=real`
		);
		expect(s.sheets).toBeNull();
	});

	it("public endpoints carry no key anywhere", () => {
		const s = buildSnippets(byId("exchanges"), "csv", VALUES, "real")!;
		expect(s.url).toBe(`${BASE}/data/exchanges/csv/`);
		expect(s.curl).toBe(`curl "${BASE}/data/exchanges/csv/"`);
		expect(s.python).not.toContain("real");
		expect(s.python).not.toContain("headers");
	});

	it("market history of every material: days and exchange in the query", () => {
		const s = buildSnippets(byId("market_daily"), "csv", VALUES, "real")!;
		const url = `${BASE}/data/cxpc/daily/csv/?days=7&exchange=AI1`;
		expect(s.url).toBe(url);
		expect(s.sheets).toBe(`=IMPORTDATA("${url}")`);
		expect(s.curl).toBe(`curl "${url}"`);
		expect(s.python).toContain(`requests.get("${url}")`);
		expect(
			buildSnippets(byId("market_daily"), "json", VALUES, null)!.url
		).toBe(`${BASE}/data/cxpc/daily/?days=7&exchange=AI1`);
	});

	it("curl and Python send the key in the header, not the URL", () => {
		API_ENDPOINTS.filter((e) => e.needsKey).forEach((e) =>
			(["csv", "json"] as const).forEach((format) => {
				const s = buildSnippets(e, format, VALUES, "real")!;
				expect(s.url).toContain("?api_key=real");
				expect(s.curl).toContain('-H "Authorization: Api-Key real"');
				expect(s.curl).not.toContain("api_key=");
				expect(s.python).toContain(
					'headers={"Authorization": "Api-Key real"}'
				);
				expect(s.python).not.toContain("api_key=");
			})
		);
	});

	it("Python reads the CSV variant whenever there is one", () => {
		(["csv", "json"] as const).forEach((format) => {
			const s = buildSnippets(byId("fio_storage"), format, VALUES, null)!;
			expect(s.python).toContain(`"${BASE}/data/storage/csv/"`);
			expect(s.python).toContain("csv.DictReader");
			expect(s.python).not.toContain(".json()");
		});
		const json = buildSnippets(byId("plan"), "json", VALUES, null)!;
		expect(json.python).toContain(`"${BASE}/planning/plan/p-uuid/"`);
		expect(json.python).toContain("response.json()");
		expect(json.python).not.toContain("csv");
	});

	it("builds a snippet for every endpoint, format and key state", () => {
		API_ENDPOINTS.forEach((e) =>
			(e.csvPath
				? (["csv", "json"] as const)
				: (["json"] as const)
			).forEach((format) =>
				[null, "real"].forEach((key) => {
					const s = buildSnippets(e, format, VALUES, key);
					expect(s).not.toBeNull();
					expect(s!.url.startsWith(`${BASE}/`)).toBe(true);
					expect(s!.sheets === null).toBe(format === "json");
				})
			)
		);
	});

	it("builds nothing while a value is missing", () => {
		expect(
			buildSnippets(byId("empire_material_io"), "csv", {}, null)
		).toBeNull();
	});
});

describe("useAPIBuilder", () => {
	it("defaults to CSV and goes back to it on an endpoint change", async () => {
		let key: string | null = null;
		const { endpointId, format, formats, values, snippets } = useAPIBuilder(
			() => key
		);

		expect(endpointId.value).toBe("empire_material_io");
		expect(format.value).toBe("csv");
		expect(snippets.value).toBeNull();

		values.empire = "e-uuid";
		expect(snippets.value!.url).toContain(API_KEY_PLACEHOLDER);

		endpointId.value = "plans";
		await nextTick();
		expect(formats.value).toEqual(["json"]);
		expect(format.value).toBe("json");

		endpointId.value = "exchanges";
		await nextTick();
		expect(format.value).toBe("csv");

		key = "real";
		endpointId.value = "empire";
		await nextTick();
		expect(snippets.value!.url).toBe(
			`${BASE}/planning/empire/e-uuid/?api_key=real`
		);
	});
});
