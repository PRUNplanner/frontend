import { describe, it, expect, beforeAll, vi } from "vitest";
import { flushPromises, RouterLinkStub, type VueWrapper } from "@vue/test-utils";

import { materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import EmpireMaterialIO from "@/features/empire/components/EmpireMaterialIO.vue";
import EmpireMaterialIODetail from "@/features/empire/components/EmpireMaterialIODetail.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IEmpireMaterialIO,
	IEmpireMaterialIOPlanet,
} from "@/features/empire/empire.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";

const plan = (
	planetId: string,
	planUuid: string,
	output: number,
	input: number
): IEmpireMaterialIOPlanet => ({
	planetId,
	planUuid,
	planName: `${planUuid} name`,
	planCOGC: "---",
	delta: output - input,
	input,
	output,
	price: 0,
});

function io(ticker: string, plans: IEmpireMaterialIOPlanet[]) {
	const output = plans.reduce((s, p) => s + p.output, 0);
	const input = plans.reduce((s, p) => s + p.input, 0);
	return {
		ticker,
		output,
		input,
		delta: output - input,
		deltaPrice: 0,
		outputPlanets: plans.filter((p) => p.output > 0),
		inputPlanets: plans.filter((p) => p.input > 0),
	} satisfies IEmpireMaterialIO;
}

const MATERIAL_IO = [
	io("DW", [
		plan("KW-688c", "kw", 30, 5),
		plan("ZV-307c", "zv", 10, 0),
		plan("OT-580b", "ot1", 0, 20),
		plan("OT-580b", "ot2", 0, 40),
	]),
	io("BSE", [plan("KW-688c", "kw", 8, 0)]),
];

const rowOf = (wrapper: VueWrapper, ticker: string) =>
	wrapper
		.findAll("tbody tr.n-data-table-tr")
		.find((tr) => {
			const cell = tr.find(`td[data-col-key="ticker"]`);
			return cell.exists() && cell.text() === ticker;
		})!;

const toggle = (wrapper: VueWrapper, ticker: string) =>
	rowOf(wrapper, ticker).find("button[aria-expanded]");

async function click(el: { trigger: (e: string) => Promise<void> }) {
	await el.trigger("click");
	await flushPromises();
}

const details = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(EmpireMaterialIODetail);

const linkTargets = (el: VueWrapper) =>
	el.findAllComponents(RouterLinkStub).map((l) => l.props("to"));

describe("EmpireMaterialIO", () => {
	beforeAll(async () => {
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("shows one summary line per side", async () => {
		const { wrapper } = await mountComponent(EmpireMaterialIO, {
			empireMaterialIO: MATERIAL_IO,
		});

		const rows = tableRows(wrapper);
		expect(rows.map((r) => r.ticker)).toEqual(["DW", "BSE"]);
		// largest plan first, "+N" for the other plans
		expect(rows[0].outputPlanets).toMatch(/KW-688c\s*30\.00\s+\+1/);
		expect(rows[0].inputPlanets).toMatch(/OT-580b\s*40\.00\s+\+2/);
		expect(rows[1].outputPlanets).toMatch(/KW-688c\s*8\.00$/);
		expect(rows[1].inputPlanets).toBe("—");
		expect(details(wrapper)).toHaveLength(0);
	});

	it("expands a row with a real toggle button", async () => {
		const { wrapper } = await mountComponent(EmpireMaterialIO, {
			empireMaterialIO: MATERIAL_IO,
		});

		const button = toggle(wrapper, "DW");
		expect(button.attributes("aria-expanded")).toBe("false");
		expect(button.attributes("aria-label")).toBe(
			"empire.material_io.expand_row"
		);

		await click(button);
		expect(toggle(wrapper, "DW").attributes("aria-expanded")).toBe("true");
		expect(details(wrapper)).toHaveLength(1);

		// every plan of both sides, sorted by amount, planets with two
		// plans on one side are labelled with the plan
		const detail = details(wrapper)[0];
		expect(linkTargets(detail)).toEqual([
			"/plan/KW-688c/kw",
			"/plan/ZV-307c/zv",
			"/plan/OT-580b/ot2",
			"/plan/OT-580b/ot1",
			"/plan/KW-688c/kw",
		]);
		expect(detail.text()).toContain("OT-580b · ot2 name");
		expect(
			detail.findComponent(RouterLinkStub).attributes("title")
		).toBe("KW-688c · kw name");

		await click(toggle(wrapper, "DW"));
		expect(details(wrapper)).toHaveLength(0);
	});

	it("switches every open row to net per planet", async () => {
		const { wrapper } = await mountComponent(EmpireMaterialIO, {
			empireMaterialIO: MATERIAL_IO,
		});
		await click(toggle(wrapper, "DW"));
		await click(toggle(wrapper, "BSE"));

		const viewButton = details(wrapper)[0]
			.findAll("button")
			.find((b) => b.text() === "empire.material_io.view_net")!;
		expect(viewButton.attributes("aria-pressed")).toBe("false");
		await click(viewButton);

		for (const d of details(wrapper)) {
			expect(d.text()).toContain("empire.material_io.surplus");
			expect(d.text()).not.toContain("empire.material_io.produced_by");
		}

		// DW: KW +25 (makes and uses), ZV +10, OT -60 over two plans
		const dw = details(wrapper)[0];
		expect(linkTargets(dw)).toEqual([
			"/plan/KW-688c/kw",
			"/plan/ZV-307c/zv",
			// the plan with the largest volume on the planet
			"/plan/OT-580b/ot2",
		]);
		expect(dw.findAllComponents(RouterLinkStub)[2].attributes("title")).toBe(
			"OT-580b · ot2 name, ot1 name"
		);
		// only KW makes and uses DW
		expect(dw.text().match(/empire\.material_io\.makes_uses/g)).toHaveLength(
			1
		);
	});

	it("opens every row with Expand all and switches back when one closes", async () => {
		const onUpdate = vi.fn();
		const { wrapper, setProps } = await mountComponent(EmpireMaterialIO, {
			empireMaterialIO: MATERIAL_IO,
			expandAll: false,
			"onUpdate:expandAll": onUpdate,
		});

		await setProps({ expandAll: true });
		expect(details(wrapper)).toHaveLength(2);

		// closing one row leaves Expand all, the other row stays open
		await click(toggle(wrapper, "DW"));
		expect(onUpdate).toHaveBeenCalledWith(false);
		await setProps({ expandAll: false });
		expect(details(wrapper)).toHaveLength(1);
		expect(toggle(wrapper, "BSE").attributes("aria-expanded")).toBe("true");
	});
});
