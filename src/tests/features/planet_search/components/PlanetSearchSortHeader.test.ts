import { describe, it, expect } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import PlanetSearchSortHeader from "@/features/planet_search/components/PlanetSearchSortHeader.vue";
import { mountComponent } from "@/tests/mountComponent";

describe("PlanetSearchSortHeader", () => {
	it("click sorts alone, shift+click adds a tiebreaker, ranks show", async () => {
		const sorts = [{ key: "ref:cx:NC1", dir: "asc" as const }];
		const { component, setProps } = await mountComponent(
			PlanetSearchSortHeader,
			{ sorts, sortKey: "mat:FEO", firstDir: "desc", label: "FEO" }
		);
		const header = component as VueWrapper;

		await header.find("button").trigger("click");
		expect(header.emitted("sort")![0]).toEqual([
			[{ key: "mat:FEO", dir: "desc" }],
		]);

		await header.find("button").trigger("click", { shiftKey: true });
		expect(header.emitted("sort")![1]).toEqual([
			[...sorts, { key: "mat:FEO", dir: "desc" }],
		]);

		await setProps({ sorts: [...sorts, { key: "mat:FEO", dir: "desc" }] });
		expect(header.find("sup").text()).toBe("2");
		expect(header.text()).toContain("▼");
	});
});
