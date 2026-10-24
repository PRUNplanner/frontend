import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper } from "@vue/test-utils";

import ChainPlanetPicker from "@/features/production_chain/components/ChainPlanetPicker.vue";
import { PCheckbox, PInput } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import {
	index,
	seedGameData,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";
import { environmentExtras } from "@/features/planet_search/environmentExtras.util";

const ctx = testContext();
const h2o = ctx.extraction!.get("H2O")!;

async function mountPicker(
	planetId: string | undefined = undefined,
	props: Record<string, unknown> = {}
) {
	const { wrapper, component } = await mountComponent(ChainPlanetPicker, {
		show: true,
		ticker: "H2O",
		index,
		options: h2o,
		planetId,
		loading: false,
		error: false,
		unitCost: (site: { dailyExtraction: number }) => 100 / site.dailyExtraction,
		defaultCX: "AI1",
		...props,
	});
	const body = new DOMWrapper(document.body);
	const rows = () => body.findAll("[data-testid='chain-planet-row']");
	const planetIds = () =>
		rows().map((r) => /\(([^)]+)\)/.exec(r.find("td").text())![1]);
	return { wrapper, component, body, rows, planetIds };
}

describe("ChainPlanetPicker", () => {
	beforeAll(seedGameData);

	it("lists every planet with the resource, best rate first (AC 7)", async () => {
		const { rows, planetIds, body } = await mountPicker();
		expect(rows().length).toBe(h2o.sites.length);
		expect(planetIds()).toEqual(h2o.sites.map((s) => s.planetId));
		expect(body.find("[data-testid='chain-planet-typical']").exists()).toBe(true);
	});

	it("narrows by extractor and the only-filters, counts match", async () => {
		const { wrapper, body, rows, planetIds } = await mountPicker();
		const rig = h2o.sites.filter((s) => s.buildingTicker === "RIG");
		const option = body
			.findAll("[role=group] button")
			.find((b) => b.text().startsWith("RIG"))!;
		expect(option.text()).toBe(`RIG ${rig.length}`);
		await option.trigger("click");
		expect(rows().length).toBe(rig.length);

		// no extra materials besides MCG/AEF
		const noExtras = new Set(
			index
				.filter(
					(p) =>
						!environmentExtras(p).some(
							(e) => !["MCG", "AEF"].includes(e.ticker)
						)
				)
				.map((p) => p.planet_natural_id)
		);
		wrapper.findAllComponents(PCheckbox)[0].vm.$emit("update:checked", true);
		await wrapper.vm.$nextTick();
		expect(planetIds().every((id) => noExtras.has(id))).toBe(true);
		expect(rows().length).toBe(rig.filter((s) => noExtras.has(s.planetId)).length);
	});

	it("filters by name and sorts by a column", async () => {
		const { wrapper, body, planetIds } = await mountPicker();
		const site = h2o.sites[3];
		wrapper.findComponent(PInput).vm.$emit("update:value", site.planetId.toLowerCase());
		await wrapper.vm.$nextTick();
		expect(planetIds()).toEqual([site.planetId]);

		wrapper.findComponent(PInput).vm.$emit("update:value", "");
		await wrapper.vm.$nextTick();
		// cost ascending: the reverse of the rate
		const cost = body
			.findAll("th button")
			.find((b) => b.text().startsWith("production_chains.planet_picker.col_cost"))!;
		await cost.trigger("click");
		expect(planetIds()[0]).toBe(h2o.sites[0].planetId);
		await cost.trigger("click");
		expect(planetIds()[0]).toBe(h2o.sites.at(-1)!.planetId);
	});

	it("uses a planet or the typical one", async () => {
		const picked = await mountPicker(h2o.sites[0].planetId);
		expect(
			picked.rows()[0].find("button[aria-current='true']").exists()
		).toBe(true);
		await picked.rows()[1].findAll("button").at(-1)!.trigger("click");
		expect(picked.component.emitted("use")![0]).toEqual([h2o.sites[1].planetId]);

		const typical = await mountPicker(h2o.sites[0].planetId);
		await typical.body
			.find("[data-testid='chain-planet-typical'] button")
			.trigger("click");
		expect(typical.component.emitted("use")![0]).toEqual([undefined]);
	});

	it("narrows by surface, jumps, COGC and local market", async () => {
		const { wrapper, body, rows, planetIds } = await mountPicker();
		const seg = (text: string) =>
			body.findAll("[role=group] button").find((b) => b.text() === text)!;
		const rocky = new Set(index.filter((p) => p.surface).map((p) => p.planet_natural_id));
		await seg("production_chains.planet_picker.gaseous").trigger("click");
		expect(planetIds().every((id) => !rocky.has(id))).toBe(true);
		await seg("production_chains.planet_picker.rocky").trigger("click");
		expect(planetIds().every((id) => rocky.has(id))).toBe(true);
		await seg("production_chains.planet_picker.any").trigger("click");

		const jumps = body.findAll("input").find((i) => i.attributes("aria-label") === "production_chains.planet_picker.jumps")!;
		await jumps.setValue("3");
		const near = rows().length;
		expect(near).toBeLessThan(h2o.sites.length);
		for (const r of rows()) expect(Number(r.findAll("td").at(-2)!.text())).toBeLessThanOrEqual(3);
		await jumps.setValue("");

		const [, cogc, lm] = wrapper.findAllComponents(PCheckbox);
		lm.vm.$emit("update:checked", true);
		await wrapper.vm.$nextTick();
		const withLM = new Set(index.filter((p) => p.has_localmarket).map((p) => p.planet_natural_id));
		expect(planetIds().every((id) => withLM.has(id))).toBe(true);
		lm.vm.$emit("update:checked", false);
		cogc.vm.$emit("update:checked", true);
		await wrapper.vm.$nextTick();
		expect(rows().length).toBeLessThan(h2o.sites.length);
	});

	it("sorts by every column, twice reverses", async () => {
		const { body, planetIds } = await mountPicker();
		for (const col of ["col_planet", "col_extractor", "col_extras", "col_cogc", "col_jumps", "col_rate"]) {
			const head = body
				.findAll("th button")
				.find((b) => b.text().startsWith(`production_chains.planet_picker.${col}`))!;
			await head.trigger("click");
			const first = planetIds();
			await head.trigger("click");
			// extras and COGC tie on most planets
			if (!["col_extras", "col_cogc"].includes(col))
				expect(planetIds()).not.toEqual(first);
		}
	});

	it("shows loading and error states", async () => {
		const loading = await mountPicker(undefined, { loading: true, index: null, options: undefined });
		expect(loading.body.text()).toContain("production_chains.planet_picker.loading");
		const failed = await mountPicker(undefined, { error: true });
		expect(failed.body.text()).toContain("production_chains.planet_picker.error");
	});
});
