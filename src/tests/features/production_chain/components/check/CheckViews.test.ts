import { describe, it, expect, beforeAll } from "vitest";

import CheckBar from "@/features/production_chain/components/check/CheckBar.vue";
import CheckBases from "@/features/production_chain/components/check/CheckBases.vue";
import CheckFindings from "@/features/production_chain/components/check/CheckFindings.vue";
import CheckChains from "@/features/production_chain/components/check/CheckChains.vue";
import CheckAside from "@/features/production_chain/components/check/CheckAside.vue";
import CheckResults from "@/features/production_chain/components/check/CheckResults.vue";
import CheckFinding from "@/features/production_chain/components/check/CheckFinding.vue";
import { PButton, PInputNumber, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import {
	fixtureCheck,
	seedGameData,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";
import messages from "@/locales/en_US/production_chains.json";

import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const result = fixtureCheck();
const nameOf = (id: string) => `Plan ${id}`;
const withText = { messages: { production_chains: messages } };

describe("CheckBar", () => {
	beforeAll(seedGameData);

	const empires = [
		{ uuid: "e1", empire_name: "Main", plans: [{}, {}] },
		{ uuid: "e2", empire_name: "Side", plans: [] },
	] as unknown as PlanEmpireElement[];

	async function mountBar(targets: string[]) {
		return mountComponent(CheckBar, {
			empires,
			empire: "e1",
			targets,
			sold: result.sold,
			net: result.net,
			cxUuid: undefined,
			setup: true,
			min: 200,
			payback: 100,
		});
	}

	it("adds a chain, all chains, removes one and clears", async () => {
		const { wrapper, component } = await mountBar(["DW"]);
		const add = wrapper
			.findAllComponents(PSelect)
			.find((c) => c.attributes("data-testid") === "check-add")!;
		const options = add.props("options") as { value: string }[];
		expect(options.map((o) => o.value)).not.toContain("DW");
		expect(options.length).toBe(result.sold.length - 1);
		add.vm.$emit("update:value", "C");
		await wrapper.find("[data-testid='check-add-all']").trigger("click");
		await wrapper.find("[data-testid='check-clear']").trigger("click");
		await wrapper
			.find("[aria-label='production_chains.check.remove']")
			.trigger("click");
		expect(component.emitted("targets")).toEqual([[["DW", "C"]], [[]], [[]]]);
		expect(component.emitted("add-all")).toHaveLength(1);
		expect(wrapper.find("[data-testid='check-target-DW']").exists()).toBe(true);
	});

	it("picks an empire and edits the settings", async () => {
		const { wrapper, component } = await mountBar([]);
		const empire = wrapper
			.findAllComponents(PSelect)
			.find((c) => c.attributes("data-testid") === "check-empire")!;
		expect((empire.props("options") as unknown[]).length).toBe(2);
		empire.vm.$emit("update:value", "e2");
		expect(component.emitted("empire")).toEqual([["e2"]]);
		expect(wrapper.find("[data-testid='check-clear']").exists()).toBe(false);
	});
});

describe("CheckBases", () => {
	beforeAll(seedGameData);

	it("sorts plan fixes first and opens a base's details (AC 6, 19)", async () => {
		const { wrapper, component } = await mountComponent(
			CheckBases,
			{ result, nameOf, payback: 100 },
			withText
		);
		const rows = wrapper.findAll("[data-testid^='check-base-toggle-']");
		const ids = rows.map((r) => r.attributes("data-testid")!.slice(-1));
		const verdict = (id: string) => result.bases.find((b) => b.id === id)!.verdict;
		const order = ["fix", "imp", "ok", "out"];
		for (let i = 1; i < ids.length; i++)
			expect(order.indexOf(verdict(ids[i - 1]))).toBeLessThanOrEqual(
				order.indexOf(verdict(ids[i]))
			);
		expect(wrapper.find("[data-testid='check-base-E']").text()).toContain(
			"Not in these chains"
		);

		const toggle = wrapper.find("[data-testid='check-base-toggle-B']");
		expect(toggle.element.tagName).toBe("BUTTON");
		await toggle.trigger("click");
		expect(toggle.attributes("aria-expanded")).toBe("true");
		const details = wrapper.find("[data-testid='check-base-details-B']");
		expect(details.text()).toContain("Production as planned");
		expect(details.text()).toContain("Essentials only");
		expect(
			details.findAll("[data-testid^='check-finding-']").length
		).toBeGreaterThan(0);
		expect(component.emitted("open")).toEqual([["B"]]);
		await toggle.trigger("click");
		expect(wrapper.find("[data-testid='check-base-details-B']").exists()).toBe(false);
	});
});

describe("CheckFindings", () => {
	beforeAll(seedGameData);

	it("filters by kind and passes the actions on (AC 16)", async () => {
		const { wrapper, component } = await mountComponent(
			CheckFindings,
			{ result, nameOf, payback: 100 },
			withText
		);
		const groups = () =>
			wrapper.findAll("[data-testid^='check-findings-group-']").map((g) =>
				g.attributes("data-testid")!.replace("check-findings-group-", "")
			);
		expect(groups()).toContain("fix");
		expect(groups()).toContain("location");
		await wrapper.find("[data-testid='check-findings-kind-location']").trigger("click");
		expect(groups()).toEqual(["location"]);

		await wrapper.find("[data-testid='check-finding-try']").trigger("click");
		await wrapper.find("[data-testid='check-finding-all-planets']").trigger("click");
		expect(component.emitted("try")![0][0]).toMatchObject({ kind: "location" });
		expect(component.emitted("planets")![0][0]).toMatchObject({ kind: "location" });
		expect(wrapper.text()).toContain("Open in Planet Search");
		expect(wrapper.text()).toContain("Open Plan");

		await wrapper.find("[data-testid='check-findings-kind-all']").trigger("click");
		expect(groups().length).toBeGreaterThan(1);
	});

	it("shows the user's pick and Back to suggested (AC 10)", async () => {
		const f = result.findings.find((x) => x.kind === "location" && x.base === "C")!;
		if (f.kind !== "location") throw new Error("kind");
		const last = f.options[f.options.length - 1];
		const picked = fixtureCheck({
			picks: { [f.step.key]: last.planet.planet_natural_id },
		});
		const { wrapper, component } = await mountComponent(
			CheckFindings,
			{ result: picked, nameOf, payback: 100 },
			withText
		);
		const card = wrapper.find(`[data-testid='check-finding-${f.id}']`);
		expect(card.text()).toContain("your pick");
		expect(card.text()).toContain("Your pick.");
		await card.find("[data-testid='check-finding-reset']").trigger("click");
		expect(component.emitted("reset")![0][0]).toMatchObject({ id: f.id });
	});
});

describe("CheckChains", () => {
	beforeAll(seedGameData);

	it("shows each chain's materials with the chain planner's default", async () => {
		const { wrapper } = await mountComponent(CheckChains, { result }, withText);
		expect(wrapper.find("[data-testid='check-chain-DW']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='check-chain-RAT']").exists()).toBe(true);
		const pg = wrapper.find("[data-testid='check-chain-row-DW-PG']");
		expect(pg.text()).toContain("bought");
		const h2o = wrapper.find("[data-testid='check-chain-row-DW-H2O']");
		expect(h2o.text()).toMatch(/extracting beats buying|buying is cheaper/);
	});
});

describe("CheckAside and CheckResults", () => {
	beforeAll(seedGameData);

	it("covers every base and adds the outputs of unchecked ones (AC 6)", async () => {
		const { wrapper, component } = await mountComponent(
			CheckAside,
			{ result },
			withText
		);
		expect(wrapper.text()).toContain("4 of 5 bases");
		await wrapper.find("[data-testid='check-coverage-add']").trigger("click");
		expect(component.emitted("add")).toEqual([[["C"]]]);
		expect(wrapper.findComponent(PButton).text()).toBe("Add C");
	});

	it("sums the strip, setup hidden on request (AC 13)", async () => {
		const { wrapper, setProps } = await mountComponent(
			CheckResults,
			{ result, setup: true },
			withText
		);
		expect(wrapper.findAll("[data-testid^='check-result-']").length).toBe(8);
		expect(wrapper.find("[data-testid='check-result-checked']").text()).toContain(
			"4 of 5"
		);
		await setProps({ setup: false });
		expect(wrapper.find("[data-testid='check-result-setup']").text()).toContain(
			"hidden"
		);
	});
});

describe("check views, edge states", () => {
	beforeAll(seedGameData);

	it("shows an empty chain list and every chain-default wording", async () => {
		const empty = await mountComponent(
			CheckChains,
			{ result: fixtureCheck({ targets: [] }) },
			withText
		);
		expect(empty.wrapper.text()).toContain("Add a chain above.");
		const ctx = testContext();
		const free = fixtureCheck({}, { ...ctx, prices: { ...ctx.prices, getPrice: () => 0 } });
		const { wrapper } = await mountComponent(CheckChains, { result: free }, withText);
		expect(wrapper.text()).toContain("bought, cheaper than making");
		expect(wrapper.text()).toContain("buying is cheaper");
	});

	it("says so when nothing is to improve or a base is outside the chains", async () => {
		const quiet = fixtureCheck({ min: 1e12, setup: false });
		const { wrapper } = await mountComponent(
			CheckBases,
			{ result: quiet, nameOf, payback: 100 },
			withText
		);
		await wrapper.find("[data-testid='check-base-toggle-A']").trigger("click");
		await wrapper.find("[data-testid='check-base-toggle-E']").trigger("click");
		expect(wrapper.find("[data-testid='check-base-details-A']").text()).toContain(
			"No findings above the threshold."
		);
		expect(wrapper.find("[data-testid='check-base-details-E']").text()).toContain(
			"Not in these chains"
		);

		const strip = await mountComponent(
			CheckResults,
			{
				result: {
					...quiet,
					totals: {
						...quiet.totals,
						profit: 0,
						counts: { fix: 0, recipe: 0, buy: 0, location: 0, setup: 0 },
					},
				},
				setup: true,
			},
			withText
		);
		expect(strip.wrapper.find("[data-testid='check-result-gain']").text()).toContain("—");
		expect(
			strip.wrapper.find("[data-testid='check-result-improvements']").text()
		).toContain("none");
	});

	it("ignores empty or negative settings", async () => {
		const { wrapper, component } = await mountComponent(CheckBar, {
			empires: [],
			empire: undefined,
			targets: [],
			sold: null,
			net: {},
			cxUuid: undefined,
			setup: true,
			min: 200,
			payback: 100,
		});
		const input = (id: string) =>
			wrapper
				.findAllComponents(PInputNumber)
				.find((c) => c.attributes("data-testid") === id)!;
		for (const id of ["check-min", "check-pay"]) {
			input(id).vm.$emit("update:value", null);
			input(id).vm.$emit("update:value", -1);
		}
		expect(component.emitted("update:min")).toBeUndefined();
		expect(component.emitted("update:payback")).toBeUndefined();
		input("check-min").vm.$emit("update:value", 0);
		input("check-pay").vm.$emit("update:value", 7);
		expect(component.emitted("update:min")).toEqual([[0]]);
		expect(component.emitted("update:payback")).toEqual([[7]]);
	});
});

describe("CheckFinding without payback", () => {
	beforeAll(seedGameData);

	it("shows construction without a payback", async () => {
		const move = result.findings.find((f) => f.kind === "location" && f.base === "C")!;
		if (move.kind !== "location") throw new Error("kind");
		const option = { ...move.option, payback: null };
		const { wrapper } = await mountComponent(
			CheckFinding,
			{
				finding: { ...move, payback: null, option },
				base: result.bases.find((b) => b.id === "C")!,
				nameOf,
				payback: 100,
			},
			withText
		);
		expect(wrapper.text()).toContain("no payback");
		expect(wrapper.text()).not.toContain("payback NaN");
	});
});
