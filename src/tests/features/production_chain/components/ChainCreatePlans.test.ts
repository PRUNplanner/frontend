import { describe, it, expect, beforeAll, vi } from "vitest";
import { DOMWrapper, flushPromises, RouterLinkStub } from "@vue/test-utils";

import ChainCreatePlans from "@/features/production_chain/components/ChainCreatePlans.vue";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	chainInput,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

import type { IChainCreated } from "@/features/production_chain/productionChain.types";
import type { IChainInput } from "@/features/production_chain/engine/chainSolver.types";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ execute }),
}));

const ctx = testContext();
const EMPIRES = [
	{ uuid: "e1", empire_name: "Main", empire_faction: "NONE", plans: [] },
];

async function mountDialog(
	planets: [string | null, string | null],
	outcome: IChainCreated = {
		plans: [
			{
				base: "A",
				uuid: "p1",
				name: "DW RAT OVE · Agriculture",
				planetId: "PG-899b",
			},
			{
				base: "B",
				uuid: "p2",
				name: "DW RAT OVE · Food Industries",
				planetId: "XH-668c",
			},
		],
		empire: { uuid: "e9", name: "Chain DW RAT OVE" },
		failed: null,
	}
) {
	execute.mockResolvedValue(EMPIRES);
	const create = vi.fn().mockResolvedValue(outcome);
	const result = solveChain(splitInput(planets), ctx);
	const { wrapper } = await mountComponent(ChainCreatePlans, {
		show: true,
		result,
		targets: ["DW", "RAT", "OVE"],
		create,
	});
	const body = new DOMWrapper(document.body);
	const submit = () => body.find("[data-testid='chain-create-submit']");
	return { wrapper, body, create, submit };
}

describe("ChainCreatePlans", () => {
	beforeAll(seedGameData);

	it("stays disabled until every base has a planet (AC 10)", async () => {
		const { body, submit } = await mountDialog(["PG-899b", null]);
		expect(submit().attributes("disabled")).toBeDefined();
		expect(body.find("[data-testid='chain-create-blocker']").text()).toBe(
			"production_chains.create.needs_planet"
		);
	});

	it("creates in a new empire with its faction, then links the plans (AC 11, 12)", async () => {
		const { wrapper, body, create, submit } = await mountDialog([
			"PG-899b",
			"XH-668c",
		]);
		const names = body
			.findAll("[data-testid^='chain-create-row-'] input")
			.map((i) => (i.element as HTMLInputElement).value);
		expect(names).toEqual([
			"DW RAT OVE · Agriculture",
			"DW RAT OVE · Food Industries",
		]);
		wrapper
			.findAllComponents(PSelect)
			.find(
				(s) => s.attributes("data-testid") === "chain-create-faction"
			)!
			.vm.$emit("update:value", "HORTUS");
		await flushPromises();
		await submit().trigger("click");
		await flushPromises();

		const [drafts, empire] = create.mock.calls[0];
		expect(drafts.map((d: { base: string }) => d.base)).toEqual(["A", "B"]);
		expect(drafts[0].data.plan_name).toBe("DW RAT OVE · Agriculture");
		expect(empire).toEqual({
			kind: "new",
			name: "production_chains.create.empire_default",
			faction: "HORTUS",
		});
		// the only links on it
		const links = wrapper.findAllComponents(RouterLinkStub);
		expect(links.map((l) => l.props("to"))).toEqual([
			{
				name: "plan",
				params: { planetNaturalId: "PG-899b", planUuid: "p1" },
			},
			{
				name: "plan",
				params: { planetNaturalId: "XH-668c", planUuid: "p2" },
			},
			{ name: "empire", params: { empireUuid: "e9" } },
		]);
	});

	it("adds to an existing empire or none", async () => {
		const { wrapper, create, submit } = await mountDialog([
			"PG-899b",
			"XH-668c",
		]);
		const kind = wrapper.findComponent({ name: "PSegmented" });
		kind.vm.$emit("update:value", "existing");
		await flushPromises();
		expect(submit().attributes("disabled")).toBeDefined();
		wrapper
			.findAllComponents(PSelect)
			.at(-1)!
			.vm.$emit("update:value", "e1");
		await flushPromises();
		await submit().trigger("click");
		await flushPromises();
		expect(create.mock.calls[0][1]).toEqual({
			kind: "existing",
			uuid: "e1",
			name: "Main",
		});
	});

	it("names the base that failed and lists what was created (AC 13)", async () => {
		const { body, submit } = await mountDialog(["PG-899b", "XH-668c"], {
			plans: [
				{ base: "A", uuid: "p1", name: "Farm", planetId: "PG-899b" },
			],
			empire: null,
			failed: "B",
		});
		await submit().trigger("click");
		await flushPromises();
		expect(body.find("[data-testid='chain-create-error']").text()).toBe(
			"production_chains.create.failed"
		);
		expect(
			body.find("[data-testid='chain-create-result']").text()
		).toContain("A · Farm");
	});
});

describe("ChainCreatePlans warnings", () => {
	beforeAll(seedGameData);

	it("warns when a plan would leave out farms, without blocking", async () => {
		// the farm base on a planet without fertility
		const { body, submit } = await mountDialog(["XH-668c", "XH-668c"]);
		expect(
			body.find("[data-testid='chain-create-no-farming-A']").text()
		).toBe("production_chains.create.no_farming");
		expect(
			body.find("[data-testid='chain-create-no-farming-B']").exists()
		).toBe(false);
		expect(submit().attributes("disabled")).toBeUndefined();
	});
});

describe("ChainCreatePlans blockers and outcomes", () => {
	beforeAll(seedGameData);

	async function mountFor(input: IChainInput, outcome?: IChainCreated) {
		execute.mockResolvedValue(EMPIRES);
		const create = vi.fn().mockResolvedValue(outcome);
		await mountComponent(ChainCreatePlans, {
			show: true,
			result: solveChain(input, ctx),
			targets: input.targets.map((t) => t.ticker),
			create,
		});
		const body = new DOMWrapper(document.body);
		return {
			body,
			create,
			blocker: () =>
				body.find("[data-testid='chain-create-blocker']").text(),
		};
	}
	const onFood = (targets: [string, number][]) =>
		chainInput(targets, {
			bases: [{ id: "A", name: "", planetId: "XH-668c", cogc: "auto" }],
		});

	it("needs steps", async () => {
		expect((await mountFor(chainInput([]))).blocker()).toBe(
			"production_chains.create.no_steps"
		);
	});

	it("needs an area that fits 1,000", async () => {
		expect((await mountFor(onFood([["GWS", 1]]))).blocker()).toBe(
			"production_chains.create.over_area"
		);
	});

	it("needs plan and empire names", async () => {
		const { body, blocker } = await mountFor(onFood([["DW", 10]]));
		const name = body.find("[data-testid='chain-create-row-A'] input");
		await name.setValue(" ");
		expect(blocker()).toBe("production_chains.create.needs_name");
		await name.setValue("Water");
		await body.findAll("input").at(-1)!.setValue("");
		expect(blocker()).toBe("production_chains.create.needs_empire_name");
	});

	it("warns about extraction off the planet, names failures", async () => {
		const { body, create } = await mountFor(onFood([["H2O", 50]]), {
			plans: [],
			empire: null,
			failed: "empire",
		});
		expect(
			body.find("[data-testid='chain-create-not-on-planet-A']").exists()
		).toBe(true);
		await body.find("[data-testid='chain-create-submit']").trigger("click");
		await flushPromises();
		expect(create).toHaveBeenCalledOnce();
		expect(body.find("[data-testid='chain-create-error']").text()).toBe(
			"production_chains.create.empire_failed"
		);
	});
});
