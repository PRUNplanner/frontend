import { describe, it, expect } from "vitest";

import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";

async function typeInto(text: string) {
	const emitted: unknown[] = [];
	const { wrapper } = await mountComponent(PInputNumber, {
		value: 20,
		decimals: true,
		"onUpdate:value": (v: unknown) => emitted.push(v),
	});
	await wrapper.find("input").setValue(text);
	return emitted;
}

describe("PInputNumber", () => {
	it.each(["-", ".", "-."])("emits nothing for a partial %s", async (text) => {
		expect(await typeInto(text)).toEqual([]);
	});

	it("emits null when cleared", async () => {
		expect(await typeInto("")).toEqual([null]);
	});

	it("emits the number", async () => {
		expect(await typeInto("-1.5")).toEqual([-1.5]);
	});
});
