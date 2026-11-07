import { describe, expect, it } from "vitest";

// Util
import { phoneFromWide } from "@/features/planning/layout/phoneLayout";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { packLayout } from "@/features/planning/layout/packLayout";
import { presetLayout } from "@/features/planning/layout/presets";
import { PHONE_EDIT_WIDTH } from "@/features/planning/layout/planLayout.constants";
import {
	prng,
	randomLayout,
} from "@/tests/features/planning/layout/layout.fixtures";

describe("phoneFromWide", () => {
	it("is a two-column grid with Wide's phone columns, in its order", () => {
		const wide = presetLayout("standard");
		const phone = phoneFromWide(wide);
		expect(phone.cols).toBe(2);
		const stacked = packLayout(wide, PHONE_EDIT_WIDTH).items;
		const placed = packLayout(phone, PHONE_EDIT_WIDTH).items;
		for (const it of wide.items) {
			expect(placed[it.id].left).toBeCloseTo(stacked[it.id].left);
			expect(placed[it.id].width).toBeCloseTo(stacked[it.id].width);
		}
		const order = (items: typeof placed) =>
			Object.keys(items).sort(
				(a, b) =>
					Number(items[b].region === "band") -
						Number(items[a].region === "band") ||
					items[a].top - items[b].top ||
					items[a].left - items[b].left
			);
		expect(phone.items.map((i) => i.id)).toEqual(order(stacked));
	});

	it("keeps elements, tabs and pins, drops following", () => {
		const wide = normaliseLayout({
			cols: 12,
			items: [
				{ id: "a", els: ["production"], x: 0, w: 8, y: 0 },
				{ id: "b", els: ["planet"], x: 8, w: 4, y: 0, follow: true },
				{
					id: "c",
					els: ["kpi-profit", "kpi-payback"],
					x: 0,
					w: 4,
					y: 1,
					pin: true,
				},
			],
		});
		const phone = phoneFromWide(wide);
		expect(phone.items.map((i) => i.id)).toEqual(["c", "a", "b"]);
		expect(phone.items[0]).toMatchObject({
			pin: true,
			els: ["kpi-profit", "kpi-payback"],
		});
		expect(phone.items.some((i) => i.follow)).toBe(false);
	});

	it("is a valid phone layout for random wide ones", () => {
		const rnd = prng(7);
		for (let n = 0; n < 50; n++) {
			const phone = phoneFromWide(randomLayout(rnd));
			expect(normaliseLayout(phone, "phone")).toEqual(phone);
		}
	});
});
