import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import PlanetSearchChart from "@/features/planet_search/components/PlanetSearchChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type { VueWrapper } from "@vue/test-utils";
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";

const resolve = vi.fn((to: string) => ({ href: `/app${to}` }));
vi.mock("vue-router", () => ({ useRouter: () => ({ resolve }) }));
const session = vi.hoisted(() => ({ loggedIn: true }));
vi.mock("@/stores/userStore", () => ({
	useUserStore: () => ({
		get isLoggedIn() {
			return session.loggedIn;
		},
	}),
}));
const openAuth = vi.hoisted(() => vi.fn());
vi.mock("@/features/account/useAuthPanel", () => ({
	useAuthPanel: () => ({ open: openAuth }),
}));

function planet(
	id: string,
	h2o: number,
	feo: number,
	fertility: number,
	program: string | null = null
): PlanetSearchIndexEntry {
	return {
		planet_natural_id: id,
		planet_name: `Name ${id}`,
		system_id: `sys-${id}`,
		surface: true,
		gravity_type: "NORMAL",
		pressure_type: "NORMAL",
		temperature_type: "NORMAL",
		fertility,
		has_localmarket: true,
		has_chamberofcommerce: false,
		has_warehouse: true,
		has_administrationcenter: false,
		has_shipyard: false,
		cogc_program_status: null,
		cogc_programs: program
			? [{ program_type: program, start_epochms: 0, end_epochms: 10 }]
			: [],
		resources: [
			{
				material_ticker: "H2O",
				resource_type: "LIQUID",
				daily_extraction: h2o,
				max_daily_extraction: h2o,
			},
			{
				material_ticker: "FEO",
				resource_type: "MINERAL",
				daily_extraction: feo,
				max_daily_extraction: feo,
			},
		],
	} as PlanetSearchIndexEntry;
}

const PLANETS = [
	planet("A", 45, 1, 0.4, "ADVERTISING_AGRICULTURE"),
	planet("B", 30, 9, 0.1),
	planet("C", 25, 5, 0),
];
const JUMPS: Record<string, number> = { "sys-A": 7, "sys-B": 4, "sys-C": 8 };
const ctx: IPlanetSearchContext = {
	now: 5,
	refJumps: (ref) =>
		ref.kind === "cx" && ref.code === "CI1"
			? new Map(Object.entries(JUMPS))
			: undefined,
};

async function mountChart(props: Record<string, unknown> = {}) {
	const onPin = vi.fn();
	const { component } = await mountComponent(
		PlanetSearchChart,
		{
			planets: PLANETS,
			filter: {
				...defaultFilter(),
				materialGroups: [{ op: "all", materials: ["H2O", "FEO"] }],
				references: [{ kind: "cx", code: "CI1" }],
			},
			ctx,
			pins: ["A"],
			showPins: true,
			refName: (r: { code?: string }) => r.code ?? "plan",
			onPin,
			...props,
		},
		{ attach: true }
	);
	return { chart: component as VueWrapper, onPin };
}

const rows = (chart: VueWrapper) =>
	chart.findAll("ol li").map((li) => li.attributes("data-key"));

describe("PlanetSearchChart", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			700
		);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
			480
		);
	});
	afterEach(() => vi.restoreAllMocks());

	it("plots the first material against jumps, frontier green and ranked", async () => {
		const { chart } = await mountChart();

		expect(chart.findAll(".scatter-dot")).toHaveLength(3);
		expect(chart.findAll(".scatter-ring")).toHaveLength(1);
		expect(chart.find(".scatter-frontier").exists()).toBe(true);
		expect(rows(chart)).toEqual(["A", "B", "C"]);
		// A and B are the trade-off, C is beaten by both
		const bars = chart.findAll("ol li .h-full");
		expect(bars.map((b) => b.classes().includes("bg-positive"))).toEqual([
			true,
			true,
			false,
		]);
		expect(chart.text()).toContain("planet_search.chart.per_day");
		expect(chart.text()).toContain("planet_search.chart.x_refs");
	});

	it("redraws for another Y material", async () => {
		const { chart } = await mountChart();
		chart
			.findComponent({ name: "PSelect" })
			.vm.$emit("update:value", "FEO");
		await chart.vm.$nextTick();
		expect(rows(chart)).toEqual(["B", "C", "A"]);
	});

	it("falls back to fertility without a material filter, at constant size", async () => {
		const { chart } = await mountChart({
			filter: {
				...defaultFilter(),
				references: [{ kind: "cx", code: "CI1" }],
			},
		});
		expect(chart.findComponent({ name: "PSelect" }).exists()).toBe(false);
		expect(chart.text()).toContain("planet_search.chart.fertility");
		const radii = chart
			.findAll(".scatter-dot")
			.map((g) => g.findAll("circle")[1].attributes("r"));
		expect(new Set(radii)).toEqual(new Set(["6"]));
	});

	it("pins from the list and the chart, and opens a plan on a double-click", async () => {
		vi.useFakeTimers();
		const open = vi.spyOn(window, "open").mockReturnValue(null);
		const { chart, onPin } = await mountChart();

		chart
			.find(".scatter-dot")
			.element.dispatchEvent(
				new MouseEvent("click", { detail: 1, bubbles: true })
			);
		vi.advanceTimersByTime(300);
		expect(onPin).toHaveBeenCalledTimes(1);

		await chart.findAll("ol li button")[0].trigger("click");
		expect(onPin).toHaveBeenLastCalledWith("A");

		await chart.find('[aria-label="Name B"]').trigger("dblclick");
		expect(open).toHaveBeenCalledWith("/app/plan/B", "_blank", "noopener");
		vi.useRealTimers();
	});

	it("asks a visitor to log in before the plan a double-click opens", async () => {
		session.loggedIn = false;
		const open = vi.spyOn(window, "open").mockReturnValue(null);
		open.mockClear();
		openAuth.mockClear();
		const { chart } = await mountChart();

		await chart.find('[aria-label="Name B"]').trigger("dblclick");
		expect(open).not.toHaveBeenCalled();
		expect(openAuth).toHaveBeenCalledWith("login", "planet_search_plan", {
			next: "/plan/B",
			context: { planet: expect.any(String), id: "B" },
		});
		session.loggedIn = true;
	});

	it("doesn't pin from the chart without the compare tray", async () => {
		const { chart, onPin } = await mountChart({ showPins: false });
		await chart
			.find('[aria-label="Name B"]')
			.trigger("keydown", { key: "Enter" });
		expect(onPin).not.toHaveBeenCalled();
	});

	it("links hover between the list and the chart", async () => {
		const { chart } = await mountChart();
		await chart.findAll("ol li")[1].trigger("mouseenter");
		expect(chart.findAll("ol li")[1].classes()).toContain("bg-white/10");

		await chart.findAll("ol li")[1].trigger("mouseleave");
		await chart.find('[aria-label="Name C"]').trigger("mouseenter");
		expect(chart.findAll("ol li")[2].classes()).toContain("bg-white/10");
		expect(
			document.body.querySelector("[role=tooltip]")?.textContent
		).toContain("LM · WAR");
	});

	it("colours by COGC program with a legend", async () => {
		const { chart } = await mountChart();
		const cogc = chart
			.findAll("button")
			.find((b) => b.text() === "planet_search.chart.colour_cogc")!;
		await cogc.trigger("click");
		expect(chart.find("ul").text()).toContain(
			"game.cogc_program.ADVERTISING_AGRICULTURE"
		);
		expect(chart.find("ul").text()).toContain(
			"planet_search.chart.no_program"
		);
	});
});

describe("PlanetSearchChart edge cases", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			700
		);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
			480
		);
	});
	afterEach(() => vi.restoreAllMocks());

	// by planet name, the chart draws the largest dots last
	const dotRadii = (chart: VueWrapper, ...names: string[]) =>
		names.map((n) =>
			chart
				.find(`[aria-label="${n}"]`)
				.findAll("circle")[1]
				.attributes("r")
		);

	it("sizes the dots by fertility between the lowest and the highest", async () => {
		const { chart } = await mountChart();
		// A 112 %, B 103 %, C 100 %: 5 + 6 * share
		const [a, b, c] = dotRadii(chart, "Name A", "Name B", "Name C").map(
			Number
		);
		expect(a).toBeCloseTo(11, 5);
		expect(b).toBeCloseTo(5 + 6 * (3.0303 / 12.1212), 3);
		expect(c).toBeCloseTo(5, 5);
	});

	it("draws middle-sized dots when every planet is equally fertile", async () => {
		const { chart } = await mountChart({
			planets: [planet("A", 45, 1, 0.2), planet("B", 30, 9, 0.2)],
		});
		expect(dotRadii(chart, "Name A", "Name B")).toEqual(["8", "8"]);
	});

	it("counts infertile planets as the lowest fertility in the sizes", async () => {
		const { chart } = await mountChart({
			planets: [planet("A", 45, 1, 0.3), planet("B", 30, 9, -1)],
		});
		// infertile counts 0 %, below the 100 % of fertility 0
		const [a, b] = dotRadii(chart, "Name A", "Name B").map(Number);
		expect(a).toBeCloseTo(5 + 6 * (110 / 110), 5);
		expect(b).toBe(5);
	});

	it("picks the nearest exchange as X without references", async () => {
		const jumps = (offset: number) =>
			new Map(
				Object.entries({
					"sys-A": 3 + offset,
					"sys-B": 5 + offset,
					"sys-C": 4 + offset,
				})
			);
		const { chart } = await mountChart({
			filter: {
				...defaultFilter(),
				materialGroups: [{ op: "all", materials: ["H2O"] }],
			},
			ctx: {
				now: 5,
				refJumps: (ref: { kind: string; code?: string }) =>
					ref.kind === "cx" && ref.code === "NC1"
						? jumps(0)
						: ref.kind === "cx"
							? jumps(2)
							: undefined,
			},
		});
		expect(chart.text()).toContain("planet_search.chart.x_nearest");
		expect(chart.text()).not.toContain("planet_search.chart.x_refs");
		// the X column of the ranked list: NC1's jumps
		const xs = chart
			.findAll("ol li")
			.map((li) => li.findAll("span.font-mono")[1].text());
		// ranked by H2O: A (45), B (30), C (25)
		expect(xs).toEqual(["3", "5", "4"]);
	});

	it("notes planets without a route, without the material and the cap", async () => {
		const noH2O = planet("D", 0, 5, 0.1);
		noH2O.resources = noH2O.resources.filter(
			(r) => r.material_ticker !== "H2O"
		);
		const lost = planet("E", 10, 5, 0.1);
		lost.system_id = "sys-unknown";
		const many = Array.from({ length: 300 }, (_, i) =>
			planet(`X${i}`, 1, 1, 0)
		);
		const { chart } = await mountChart({
			planets: [PLANETS[0], noH2O, lost, ...many],
			// every system but E's is one jump away
			ctx: {
				now: 5,
				refJumps: () =>
					new Map(
						[PLANETS[0], noH2O, ...many].map((p) => [
							p.system_id,
							1,
						])
					),
			},
		});
		const notes = chart.findAll("p").map((p) => p.text());
		expect(notes).toContain("planet_search.chart.capped");
		expect(notes).toContain("planet_search.chart.no_route");
		expect(notes).toContain("planet_search.chart.no_material");
		expect(notes).not.toContain("planet_search.chart.not_fertile");
		// capped at the first 300: A, D (no H2O), E (no route), 297 others
		expect(chart.findAll("ol li")).toHaveLength(298);
	});

	it("notes infertile planets when Y is fertility", async () => {
		const { chart } = await mountChart({
			planets: [PLANETS[0], planet("D", 5, 5, -1)],
			filter: {
				...defaultFilter(),
				references: [{ kind: "cx", code: "CI1" }],
			},
			ctx: {
				now: 5,
				refJumps: () =>
					new Map([
						["sys-A", 1],
						["sys-D", 2],
					]),
			},
		});
		expect(chart.findAll("p").map((p) => p.text())).toContain(
			"planet_search.chart.not_fertile"
		);
		expect(rows(chart)).toEqual(["A"]);
		// fertility axis: 112 %
		expect(chart.find("ol li").text()).toContain("112 %");
	});

	it("hides the size note and the bars when nothing is plotted", async () => {
		const { chart } = await mountChart({ planets: [] });
		expect(chart.findAll("ol li")).toHaveLength(0);
		expect(chart.text()).not.toContain("planet_search.chart.size");
		expect(chart.text()).toContain("planet_search.chart.actions");
	});

	it("draws empty bars when no planet yields anything", async () => {
		const { chart } = await mountChart({
			planets: [planet("A", 0, 1, 0.1), planet("B", 0, 1, 0.1)],
		});
		const widths = chart
			.findAll("ol li .h-full")
			.map((b) => b.attributes("style"));
		expect(widths).toEqual(["width: 0%;", "width: 0%;"]);
	});

	it("scales the bars to the best planet", async () => {
		const { chart } = await mountChart();
		const widths = chart
			.findAll("ol li .h-full")
			.map((b) => b.attributes("style"));
		expect(widths[0]).toBe("width: 100%;");
		expect(parseFloat(widths[1]!.slice(7))).toBeCloseTo((30 / 45) * 100, 3);
		expect(parseFloat(widths[2]!.slice(7))).toBeCloseTo((25 / 45) * 100, 3);
	});

	it("shows touch instructions without the compare tray", async () => {
		const { chart } = await mountChart({ showPins: false });
		expect(chart.text()).toContain("planet_search.chart.actions_touch");
		expect(chart.text()).toContain("planet_search.chart.size");
	});

	it("links list focus to the chart", async () => {
		const { chart } = await mountChart();
		const item = chart.findAll("ol li")[2];
		await item.trigger("focusin");
		expect(item.classes()).toContain("bg-white/10");
		await item.trigger("focusout");
		expect(item.classes()).not.toContain("bg-white/10");
	});

	it("falls back to the plain name and id of an unnamed planet", async () => {
		const unnamed = planet("A", 45, 1, 0.4);
		unnamed.planet_name = "";
		const { chart } = await mountChart({ planets: [unnamed] });
		expect(chart.find("ol li .font-bold").text()).toBe("A");
		expect(chart.find('[aria-label="A"]').exists()).toBe(true);
	});

	it("shows pinned, fertility, infrastructure and program in the tooltip", async () => {
		const { chart } = await mountChart();
		await chart.find('[aria-label="Name A"]').trigger("mouseenter");
		const tip = document.body.querySelector("[role=tooltip]")!.textContent!;
		expect(tip).toContain("planet_search.chart.legend_pinned");
		expect(tip).toContain("112 %");
		expect(tip).toContain("LM · WAR");
		expect(tip).toContain("game.cogc_program.ADVERTISING_AGRICULTURE");
	});

	it("leaves pinned and program out of the tooltip when there are none", async () => {
		const bare = planet("B", 30, 9, -1);
		bare.has_localmarket = false;
		bare.has_warehouse = false;
		const { chart } = await mountChart({ planets: [bare], pins: [] });
		await chart.find('[aria-label="Name B"]').trigger("mouseenter");
		const tip = document.body.querySelector("[role=tooltip]")!.textContent!;
		expect(tip).not.toContain("planet_search.chart.legend_pinned");
		expect(tip).not.toContain("game.cogc_program");
		expect(tip).toContain("—");
		expect(tip).toContain("planet_search.results.no_infrastructure");
	});

	it("shares one colour among the rarer programs, most common first", async () => {
		const programs = [
			"ADVERTISING_AGRICULTURE",
			"ADVERTISING_CHEMISTRY",
			"ADVERTISING_CONSTRUCTION",
			"ADVERTISING_ELECTRONICS",
			"ADVERTISING_FOOD_INDUSTRIES",
			"ADVERTISING_FUEL_REFINING",
			"ADVERTISING_MANUFACTURING",
		];
		// the last program is the most common, the others tie by name
		const planets = [
			...programs.map((pr, i) => planet(`P${i}`, 10, 1, 0.1, pr)),
			planet("Q", 10, 1, 0.1, "ADVERTISING_MANUFACTURING"),
		];
		const { chart } = await mountChart({
			planets,
			ctx: {
				now: 5,
				refJumps: () =>
					new Map([...planets].map((p) => [p.system_id, 1])),
			},
		});
		const cogc = chart
			.findAll("button")
			.find((b) => b.text() === "planet_search.chart.colour_cogc")!;
		await cogc.trigger("click");

		const legend = chart
			.find("ul")
			.findAll("li")
			.map((li) => li.text());
		expect(legend).toEqual([
			"game.cogc_program.ADVERTISING_MANUFACTURING",
			"game.cogc_program.ADVERTISING_AGRICULTURE",
			"game.cogc_program.ADVERTISING_CHEMISTRY",
			"game.cogc_program.ADVERTISING_CONSTRUCTION",
			"game.cogc_program.ADVERTISING_ELECTRONICS",
			"game.cogc_program.ADVERTISING_FOOD_INDUSTRIES",
			"planet_search.chart.other_programs",
			"planet_search.chart.legend_pinned",
		]);
	});
});
