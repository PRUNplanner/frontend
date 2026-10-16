import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { usePlanningStore } from "@/stores/planningStore";
import { useExchangeEdit } from "@/features/exchanges/useExchangeEdit";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";

const CX1 = {
	uuid: "cx-1",
	cx_name: "Home",
	modified_at: "v1",
	empires: [],
	cx_data: {
		cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
		cx_planets: [],
		ticker_empire: [],
		ticker_planets: [],
	},
} as CX;

describe("useExchangeEdit", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		usePlanningStore().setCXs([CX1]);
	});

	it("counts changed scopes and the name, and discards them", () => {
		const edit = useExchangeEdit();
		edit.load("cx-1");
		expect(edit.changeCount.value).toBe(0);

		edit.data.value.cx_empire[0].exchange = "AI1_30D";
		edit.data.value.cx_planets.push({
			planet: "A",
			preferences: [{ type: "BUY", exchange: "NC1_ASK" }],
		});
		edit.name.value = "Renamed";
		expect(edit.changeCount.value).toBe(3);

		edit.discard();
		expect(edit.changeCount.value).toBe(0);
		expect(edit.name.value).toBe("Home");
	});

	it("never edits the store's CX", () => {
		const edit = useExchangeEdit();
		edit.load("cx-1");

		edit.data.value.cx_empire.length = 0;

		expect(usePlanningStore().cxs["cx-1"].cx_data.cx_empire).toHaveLength(
			1
		);
		expect(edit.loaded.value?.cx_data.cx_empire).toHaveLength(1);
	});
});
