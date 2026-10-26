import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import QueryCacheView from "@/views/QueryCacheView.vue";
import { PButton, PCheckbox } from "@/ui";
import { calcDebug, setCalcDebug } from "@/lib/debugMode";
import { i18n } from "@/lib/i18n";
import { toCacheKey } from "@/lib/query_cache/cacheKeys";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IQueryState } from "@/lib/query_cache/queryCache.types";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);

vi.mock("@/lib/debugMode", async () => {
	const { ref } = await import("vue");
	return { calcDebug: ref(false), setCalcDebug: vi.fn() };
});

const STAMP = Date.UTC(2026, 0, 15, 12, 30);

function entryState(
	overrides: Partial<IQueryState<unknown, unknown>> = {}
): IQueryState<unknown, unknown> {
	return {
		definitionName: "GetPlanet",
		params: null,
		data: null,
		loading: false,
		error: null,
		timestamp: 0,
		autoRefetch: false,
		...overrides,
	} as IQueryState<unknown, unknown>;
}

let pinia: Pinia;

/** key → table cells of that row */
function rows(wrapper: Awaited<ReturnType<typeof mountComponent>>["wrapper"]) {
	return wrapper.findAll("tbody tr").map((tr) => tr.findAll("td"));
}

beforeEach(() => {
	pinia = createPinia();
	setActivePinia(pinia);
	calcDebug.value = false;
	vi.mocked(setCalcDebug).mockClear();
});

afterEach(() => {
	i18n.global.locale.value = "en_US";
});

describe("QueryCacheView", () => {
	describe("cache table", () => {
		it("says so when nothing is cached", async () => {
			const { wrapper } = await mountComponent(
				QueryCacheView,
				{},
				{ pinia }
			);

			const body = rows(wrapper);
			expect(body).toHaveLength(1);
			expect(body[0][0].text()).toBe("No queries in cache.");
			expect(body[0][0].attributes("colspan")).toBe("9");
		});

		it("lists a plain entry with placeholders", async () => {
			const key = toCacheKey(["a", 1]);
			useQueryStore().cacheState[key] = entryState();
			const { wrapper } = await mountComponent(
				QueryCacheView,
				{},
				{ pinia }
			);

			const [cells] = rows(wrapper);
			expect(cells.map((c) => c.text())).toEqual([
				key,
				"no", // loading
				"—", // error
				"—", // timestamp
				"", // expire ms
				"—", // expire at
				"no", // refetch
				"4", // length of "null"
				"Invalidate",
			]);
			expect(wrapper.text()).not.toContain("No queries in cache.");
		});

		it("shows loading, error, times, refetch and the data size", async () => {
			const key = toCacheKey(["b", 2]);
			const data = { name: "x" };
			useQueryStore().cacheState[key] = entryState({
				loading: true,
				error: new Error("request failed"),
				timestamp: STAMP,
				expireTime: 60_000,
				autoRefetch: true,
				data,
			});
			const { wrapper } = await mountComponent(
				QueryCacheView,
				{},
				{ pinia }
			);

			const [cells] = rows(wrapper);
			expect(cells[0].text()).toBe(key);
			expect(cells[1].text()).toBe("yes");
			expect(cells[2].text()).toBe("request failed");
			expect(cells[3].text()).toBe(new Date(STAMP).toLocaleString());
			expect(cells[4].text()).toBe("60000");
			expect(cells[5].text()).toBe(
				new Date(STAMP + 60_000).toLocaleString()
			);
			expect(cells[6].text()).toBe("yes");
			expect(cells[7].text()).toBe(
				String(JSON.stringify(data, null, 2).length)
			);
		});

		it("lists every entry, one row each", async () => {
			const store = useQueryStore();
			store.cacheState[toCacheKey(["a"])] = entryState();
			store.cacheState[toCacheKey(["b"])] = entryState();
			const { wrapper } = await mountComponent(
				QueryCacheView,
				{},
				{ pinia }
			);

			expect(rows(wrapper).map((c) => c[0].text())).toEqual([
				toCacheKey(["a"]),
				toCacheKey(["b"]),
			]);
		});

		it("invalidates one entry without refetching it", async () => {
			const store = useQueryStore();
			const keep = toCacheKey(["keep"]);
			const drop = toCacheKey(["drop"]);
			store.cacheState[keep] = entryState();
			store.cacheState[drop] = entryState();
			const invalidate = vi.spyOn(store, "invalidateKey");
			const { wrapper } = await mountComponent(
				QueryCacheView,
				{},
				{ pinia }
			);

			const dropRow = rows(wrapper).find((c) => c[0].text() === drop)!;
			await dropRow[8].find("button").trigger("click");

			expect(invalidate).toHaveBeenCalledExactlyOnceWith(["drop"], {
				skipRefetch: true,
			});
			await vi.waitFor(() =>
				expect(rows(wrapper).map((c) => c[0].text())).toEqual([keep])
			);
		});
	});

	describe("translations", () => {
		it("toggles the key mode and back to en_US", async () => {
			const { wrapper } = await mountComponent(
				QueryCacheView,
				{},
				{ pinia }
			);
			const toggle = wrapper.findComponent(PButton);

			await toggle.trigger("click");
			expect(i18n.global.locale.value).toBe("keymode");

			await toggle.trigger("click");
			expect(i18n.global.locale.value).toBe("en_US");
		});
	});

	describe("calculation debug", () => {
		it("shows the current state", async () => {
			calcDebug.value = true;
			const { wrapper } = await mountComponent(
				QueryCacheView,
				{},
				{ pinia }
			);

			expect(wrapper.findComponent(PCheckbox).props("checked")).toBe(
				true
			);
		});

		it.each([
			[false, true],
			[true, false],
		])(
			"switching from %s to %s switches debug",
			async (before, after) => {
				calcDebug.value = before;
				const { wrapper } = await mountComponent(
					QueryCacheView,
					{},
					{ pinia }
				);

				await wrapper.find("input[type=checkbox]").setValue(after);

				expect(setCalcDebug).toHaveBeenCalledExactlyOnceWith(after);
			}
		);
	});

	it("sets its title", async () => {
		await mountComponent(QueryCacheView);

		expect(head.useHead).toHaveBeenCalledWith({ title: "Query cache" });
	});
});
