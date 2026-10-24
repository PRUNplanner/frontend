import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper } from "@vue/test-utils";

import CheckPlanetList from "@/features/production_chain/components/check/CheckPlanetList.vue";
import { PCheckbox, PInput } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import {
	fixtureCheck,
	index,
	NOW,
	seedGameData,
} from "@/tests/features/production_chain/chain.fixtures";
import { planetDisplayName } from "@/util/planetName";
import messages from "@/locales/en_US/production_chains.json";

import type { ICheckLocationFinding } from "@/features/production_chain/engine/chainCheck.types";

const result = fixtureCheck();
const finding = result.findings.find(
	(f): f is ICheckLocationFinding => f.kind === "location" && f.base === "C"
)!;
const base = result.bases.find((b) => b.id === "C")!;

async function mountList() {
	const { wrapper, component } = await mountComponent(
		CheckPlanetList,
		{
			show: true,
			finding,
			base,
			nameOf: (id: string) => `Plan ${id}`,
			payback: 100,
			index,
			now: NOW,
			defaultCX: "AI1",
		},
		{ messages: { production_chains: messages } }
	);
	const body = new DOMWrapper(document.body);
	const rows = () => body.findAll("[data-testid='check-planets-row']");
	const checkbox = (testid: string) =>
		wrapper
			.findAllComponents(PCheckbox)
			.find((c) => c.attributes("data-testid") === testid)!;
	const count = () => body.find("[data-testid='check-planets-count']").text();
	return { wrapper, component, body, rows, checkbox, count };
}

describe("CheckPlanetList", () => {
	beforeAll(seedGameData);

	it("lists every option in rank with a count (AC 10)", async () => {
		const { rows, count } = await mountList();
		const n = Math.min(200, finding.options.length);
		expect(rows().length).toBe(n);
		expect(rows()[0].find("td").text()).toBe("1");
		expect(count()).toContain(
			`${finding.options.length} of ${finding.options.length} planets`
		);
	});

	it("filters by my bases, settling, payback and name (AC 10)", async () => {
		const { checkbox, rows, count, wrapper } = await mountList();
		checkbox("check-planets-mine").vm.$emit("update:checked", true);
		await wrapper.vm.$nextTick();
		const own = finding.options.filter((o) => o.own);
		expect(rows().length).toBe(own.length);
		expect(count()).toContain(`${own.length} of ${finding.options.length}`);
		checkbox("check-planets-mine").vm.$emit("update:checked", false);

		checkbox("check-planets-pay").vm.$emit("update:checked", true);
		checkbox("check-planets-settle").vm.$emit("update:checked", true);
		await wrapper.vm.$nextTick();
		const ok = finding.options.filter((o) => !o.slow && o.fits && !o.full);
		expect(rows().length).toBe(Math.min(200, ok.length));

		const target = ok[0].planet;
		wrapper
			.findAllComponents(PInput)
			.find((c) => c.attributes("data-testid") === "check-planets-search")!
			.vm.$emit("update:value", target.planet_natural_id);
		await wrapper.vm.$nextTick();
		expect(rows().length).toBe(1);
		expect(rows()[0].find("[data-testid='check-planets-name']").text()).toBe(
			planetDisplayName(target.planet_natural_id, target.planet_name)
		);
	});

	it("sorts by payback and name", async () => {
		const { body, rows, wrapper } = await mountList();
		await body.find("[data-testid='check-planets-sort-payback']").trigger("click");
		const first = rows()[0].findAll("td")[0].text();
		const best = [...finding.options].sort(
			(a, b) => (a.payback ?? Infinity) - (b.payback ?? Infinity)
		)[0];
		expect(Number(first)).toBe(finding.options.indexOf(best) + 1);
		await body.find("[data-testid='check-planets-sort-name']").trigger("click");
		await wrapper.vm.$nextTick();
		const names = rows().map((r) =>
			r.find("[data-testid='check-planets-name']").text()
		);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});

	it("uses a planet and closes (AC 10)", async () => {
		const { body, component } = await mountList();
		await body.findAll("[data-testid='check-planets-use']")[1].trigger("click");
		const id = component.emitted("use")![0][0];
		expect(finding.options.map((o) => o.planet.planet_natural_id)).toContain(id);
		expect(component.emitted("update:show")).toEqual([[false]]);
	});
});
