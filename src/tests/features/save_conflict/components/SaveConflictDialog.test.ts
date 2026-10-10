import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { NModal } from "naive-ui";

import { planetsStore } from "@/database/stores";
import { usePlanetData } from "@/database/services/usePlanetData";
import SaveConflictDialog from "@/features/save_conflict/components/SaveConflictDialog.vue";
import { useSaveConflict } from "@/features/save_conflict/useSaveConflict";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";
import save_conflict from "@/locales/en_US/save_conflict.json";
import game from "@/locales/en_US/game.json";
import planets from "@/tests/test_data/api_data_planets.json";

// Types & Interfaces
import type {
	IChangeLine,
	IChanges,
	ISaveConflictRequest,
} from "@/features/save_conflict/saveConflict.types";

const body = () => new DOMWrapper(document.body);
const modal = () => body().find(".n-modal");
const button = (label: string) =>
	modal()
		.findAll("button")
		.find((b) => b.text() === label);

/** each side as its title and its lines' text */
function sides() {
	return modal()
		.findAll("h3")
		.map((h3) => ({
			title: h3.text(),
			lines: new DOMWrapper(h3.element.nextElementSibling!)
				.findAll("li")
				.map((li) => li.text().replace(/\s+/g, " ")),
		}));
}

/** opens the dialog through `ask`, as the save flow does */
async function openDialog(
	request: Partial<ISaveConflictRequest> & { changes?: IChanges } = {}
) {
	const conflict = useSaveConflict();
	const { changes, ...rest } = request;
	const answer = conflict.ask({
		deleted: false,
		options: ["save_as_new", "overwrite", "reload"],
		...(changes ? { loadChanges: async () => changes } : {}),
		...rest,
	});
	const mounted = await mountComponent(
		SaveConflictDialog,
		{ conflict },
		{ messages: { save_conflict, game } }
	);
	await flushPromises();
	return { ...mounted, conflict, answer };
}

const line = (
	key: string,
	params: IChangeLine["params"] = {},
	area: string = key
): IChangeLine => ({ area, key, params });

/** one line on their side, its text, unmounted again for the next one */
async function theirText(l: IChangeLine): Promise<string> {
	const { wrapper } = await openDialog({
		changes: { theirs: [l], mine: [], both: [] },
	});
	const text = sides()[0].lines[0];
	wrapper.unmount();
	return text;
}

describe("SaveConflictDialog", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeAll(async () => {
		// @ts-expect-error mock data
		await planetsStore.setMany(planets);
		await usePlanetData().reload();
	});

	describe("change lines", () => {
		it("names COGC programs by their short name", async () => {
			expect(
				await theirText(line("cogc", { from: "---", to: "CHEMISTRY" }))
			).toBe("COGC None → CHEM");
		});

		it("names factions by their label, unknown ones by value", async () => {
			expect(
				await theirText(
					line("faction", { from: "NONE", to: "ANTARES" })
				)
			).toBe("Faction No Faction → Antares");
			expect(
				await theirText(line("faction", { from: "MORIA", to: "XYZ" }))
			).toBe("Faction Moria → XYZ");
		});

		it("names expertise from the plan's type", async () => {
			expect(
				await theirText(
					line("experts", {
						label: "Food_Industries",
						from: 0,
						to: 2,
					})
				)
			).toBe("Food Industries experts 0 → 2");
		});

		it("names workforces in luxury lines", async () => {
			expect(
				await theirText(line("lux_off", { label: "pioneer", n: 1 }))
			).toBe("Pioneer luxury 1 off");
			expect(
				await theirText(line("lux_on", { label: "scientist", n: 2 }))
			).toBe("Scientist luxury 2 on");
		});

		it("names exchanges as the selects do, types in words", async () => {
			expect(
				await theirText(
					line("exchange", {
						type: "BUY",
						from: "UNIVERSE_30D",
						to: "AI1_7D",
					})
				)
			).toBe("buy exchange UNIVERSE VWAP 30D → AI1 VWAP 7D");
			expect(
				await theirText(
					line("exchange", { type: "BOTH", from: "—", to: "IC1_BID" })
				)
			).toBe("buy and sell exchange — → IC1 BID");
		});

		it("names planets once loaded, unknown ones by id", async () => {
			await openDialog({
				changes: {
					theirs: [
						line("exchange_planet", {
							type: "SELL",
							planet: "KW-020c",
							from: "NC1_ASK",
							to: "CI1_30D",
						}),
						line("ticker_planet", {
							ticker: "RAT",
							type: "BUY",
							planet: "ZZ-999z",
							from: 100,
							to: "—",
						}),
					],
					mine: [],
					both: [],
				},
			});

			await vi.waitFor(() =>
				expect(sides()[0].lines).toEqual([
					"sell exchange NC1 ASK → CI1 VWAP 30D on Milliways (KW-020c)",
					// ticker lines keep their prices, a missing planet its id
					"RAT buy price 100 → — on ZZ-999z",
				])
			);
		});

		it("keeps other params as they are", async () => {
			expect(
				await theirText(line("name", { from: "A_30D", to: "B" }))
			).toBe("Name A_30D → B");
			expect(await theirText(line("corphq_on"))).toBe("Corp HQ on");
			expect(
				await theirText(
					line("added", { label: "FRM", amount: 3 }, "building:FRM")
				)
			).toBe("FRM added (3)");
		});
	});

	describe("sides", () => {
		it("lists theirs then mine, an empty side says so", async () => {
			await openDialog({
				changes: {
					theirs: [line("corphq_off")],
					mine: [],
					both: [],
				},
			});

			expect(sides()).toEqual([
				{ title: "Changed in the other tab", lines: ["Corp HQ off"] },
				{ title: "Your changes", lines: ["No changes"] },
			]);
		});

		it("highlights areas changed on both sides", async () => {
			await openDialog({
				changes: {
					theirs: [
						line("cogc", { from: "---", to: "METALLURGY" }),
						line("corphq_on", {}, "corphq"),
					],
					mine: [line("cogc", { from: "---", to: "PIONEERS" })],
					both: ["cogc"],
				},
			});

			expect(sides()).toEqual([
				{
					title: "Changed in the other tab",
					lines: [
						"COGC None → METAL (changed in both tabs)",
						"Corp HQ on",
					],
				},
				{
					title: "Your changes",
					lines: ["COGC None → PIO (changed in both tabs)"],
				},
			]);
			const [cogc, corphq] = modal().findAll("h3 + ul li");
			expect(cogc.classes()).toContain("text-negative");
			expect(corphq.classes()).not.toContain("text-negative");
		});

		it("collapses a long side, a single extra line is shown", async () => {
			const lines = (n: number) =>
				Array.from({ length: n }, (_, i) =>
					line("removed", { label: `B${i}` }, `building:B${i}`)
				);
			await openDialog({
				changes: { theirs: lines(11), mine: lines(9), both: [] },
			});

			const [theirs, mine] = sides();
			expect(theirs.lines).toEqual([
				...lines(8).map((l) => `${l.params.label} removed`),
				"and 3 more",
			]);
			expect(mine.lines).toEqual(
				lines(9).map((l) => `${l.params.label} removed`)
			);
		});
	});

	describe("state", () => {
		it("is hidden until asked and hides once chosen", async () => {
			const conflict = useSaveConflict();
			const { component } = await mountComponent(
				SaveConflictDialog,
				{ conflict },
				{ messages: { save_conflict, game } }
			);
			const show = () => component.findComponent(NModal).props("show");

			expect(show()).toBe(false);
			expect(modal().exists()).toBe(false);

			void conflict.ask({ deleted: false, options: ["overwrite"] });
			await flushPromises();
			expect(show()).toBe(true);
			expect(modal().text()).toContain("Saved in another tab");

			conflict.choose(null);
			await flushPromises();
			expect(show()).toBe(false);
		});

		it("says it is loading, then lists the changes", async () => {
			let resolve: (changes: IChanges) => void = () => {};
			await openDialog({
				loadChanges: () => new Promise((r) => (resolve = r)),
			});

			expect(modal().text()).toContain("Loading the saved version…");
			expect(sides()).toEqual([]);

			resolve({ theirs: [], mine: [line("corphq_on")], both: [] });
			await flushPromises();
			expect(modal().text()).not.toContain("Loading");
			expect(sides()[1].lines).toEqual(["Corp HQ on"]);
		});

		it("says when the saved version couldn't be loaded", async () => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			await openDialog({
				loadChanges: async () => {
					throw new Error("offline");
				},
			});

			expect(modal().text()).toContain(
				"The saved version couldn't be loaded."
			);
			expect(sides()).toEqual([]);
		});

		it("explains each option, the first one recommended", async () => {
			const { wrapper } = await openDialog({
				options: ["overwrite", "reload"],
			});

			const help = modal()
				.findAll("ul.pt-4 li")
				.map((li) => li.text().replace(/\s+/g, " "));
			expect(help).toEqual([
				"Overwrite: Replaces the other version with yours.",
				"Reload: Drops your edits and loads the saved version.",
			]);
			// close first, then the options last to first, the first primary
			expect(
				wrapper
					.findAllComponents(PButton)
					.map((b) => [b.text(), b.props("type")])
			).toEqual([
				["Keep editing", "secondary"],
				["Reload", "secondary"],
				["Overwrite", "primary"],
			]);
		});

		it("tells a deleted plan apart, not a failed load", async () => {
			await openDialog({ deleted: true, options: ["save_as_new"] });

			const text = modal().text();
			expect(text).toContain("Deleted in another tab");
			expect(text).toContain(
				"This was deleted in another tab or device."
			);
			expect(text).toContain(
				"Save as new plan: Creates a new plan with your edits."
			);
			expect(text).not.toContain("Saved in another tab");
			expect(text).not.toContain("couldn't be loaded");
		});
	});

	describe("choosing", () => {
		it.each(["save_as_new", "overwrite", "reload"] as const)(
			"%s resolves with that option",
			async (option) => {
				const { answer, conflict } = await openDialog();
				const labels = {
					save_as_new: "Save as new plan",
					overwrite: "Overwrite",
					reload: "Reload",
				};

				await button(labels[option])!.trigger("click");
				await expect(answer).resolves.toBe(option);
				expect(conflict.show.value).toBe(false);
			}
		);

		it("keep editing resolves null", async () => {
			const { answer } = await openDialog();

			await button("Keep editing")!.trigger("click");
			await expect(answer).resolves.toBeNull();
		});

		it("closing the modal resolves null", async () => {
			const { component, answer } = await openDialog();

			component.findComponent(NModal).vm.$emit("update:show", false);
			await expect(answer).resolves.toBeNull();
		});
	});
});
