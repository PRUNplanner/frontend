import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useEmpireProfits } from "@/features/empire/useEmpireProfits";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";

const EMPIRE = "e1";

describe("useEmpireProfits", () => {
	beforeEach(() => setActivePinia(createPinia()));

	function cachePlans(): void {
		const key = getQueryDefinition("GetEmpirePlans").key({
			empireUuid: EMPIRE,
		});
		const store = useQueryStore();
		const original = store.peekQueryState.bind(store);
		store.peekQueryState = ((k: unknown) =>
			JSON.stringify(k) === JSON.stringify(key)
				? { data: [] }
				: original(k as never)) as typeof store.peekQueryState;
	}

	it("gives profits and profit per area only while the plans are cached", () => {
		const { setProfits, cachedProfits, cachedProfitPerArea } =
			useEmpireProfits();
		setProfits(EMPIRE, { p1: 100 }, 12.5);

		expect(cachedProfits(EMPIRE)).toBeUndefined();
		expect(cachedProfitPerArea(EMPIRE)).toBeUndefined();

		cachePlans();
		expect(cachedProfits(EMPIRE)).toEqual({ p1: 100 });
		expect(cachedProfitPerArea(EMPIRE)).toBe(12.5);
	});

	it("keeps the last profit per area when none is given", () => {
		const { setProfits, cachedProfitPerArea } = useEmpireProfits();
		setProfits(EMPIRE, { p1: 100 }, 4);
		setProfits(EMPIRE, { p1: 200 });
		cachePlans();

		expect(cachedProfitPerArea(EMPIRE)).toBe(4);
	});
});
