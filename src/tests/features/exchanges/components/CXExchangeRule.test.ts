import { describe, it, expect, vi } from "vitest";

import CXExchangeRule from "@/features/exchanges/components/CXExchangeRule.vue";
import { PButton, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { CXDataExchangeOption } from "@/features/api/schemas/cxData.schemas";
import type { VueWrapper } from "@vue/test-utils";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

async function mountRule(
	rules: CXDataExchangeOption[],
	props: Record<string, unknown> = {}
) {
	const emitted: CXDataExchangeOption[][] = [];
	const mounted = await mountComponent(CXExchangeRule, {
		rules,
		...props,
		"onUpdate:rules": async (value: CXDataExchangeOption[]) => {
			emitted.push(value);
			await mounted.setProps({ rules: value });
		},
	});
	const button = (text: string) =>
		mounted.wrapper
			.findAllComponents(PButton)
			.find((b) => b.text().trim() === text)!;
	const click = async (text: string) => {
		await button(text).trigger("click");
		await mounted.setProps({});
	};
	return { ...mounted, emitted, button, click };
}

const last = (emitted: CXDataExchangeOption[][]) => emitted.at(-1);
const pressed = (w: VueWrapper) => w.attributes("aria-pressed");

describe("CXExchangeRule", () => {
	it("applies the presets on the scope's exchange", async () => {
		const rule = await mountRule([{ type: "BOTH", exchange: "IC1_7D" }]);

		await rule.click("exchanges.rule.preset_trade_now");
		expect(last(rule.emitted)).toEqual([
			{ type: "BUY", exchange: "IC1_ASK" },
			{ type: "SELL", exchange: "IC1_BID" },
		]);
		await rule.click("exchanges.rule.preset_average");
		expect(last(rule.emitted)).toEqual([
			{ type: "BOTH", exchange: "IC1_30D" },
		]);
		expect(trackEvent).toHaveBeenCalledWith("exchange:preset", {
			preset: "average",
			scope: "all",
		});
	});

	it("presets fall back to the all-planets exchange, then NC1", async () => {
		const planet = await mountRule([], {
			isPlanet: true,
			inherited: [{ type: "BOTH", exchange: "AI1_30D" }],
		});
		await planet.click("exchanges.rule.preset_average");
		expect(last(planet.emitted)).toEqual([
			{ type: "BOTH", exchange: "AI1_30D" },
		]);

		const empty = await mountRule([]);
		await empty.click("exchanges.rule.preset_trade_now");
		expect(last(empty.emitted)).toEqual([
			{ type: "BUY", exchange: "NC1_ASK" },
			{ type: "SELL", exchange: "NC1_BID" },
		]);
	});

	it("disables Trade now for Universe", async () => {
		const rule = await mountRule([
			{ type: "BOTH", exchange: "UNIVERSE_7D" },
		]);
		expect(
			rule.button("exchanges.rule.preset_trade_now").props("disabled")
		).toBe(true);
	});

	it("offers Universe only the VWAPs and switches Ask to VWAP 30D", async () => {
		const rule = await mountRule([{ type: "BOTH", exchange: "NC1_ASK" }]);
		await rule.click("exchanges.labels.universe");
		expect(last(rule.emitted)).toEqual([
			{ type: "BOTH", exchange: "UNIVERSE_30D" },
		]);
		const basis = rule.wrapper.findComponent(PSelect);
		expect(
			(basis.props("options") as { value: string }[]).map((o) => o.value)
		).toEqual(["7D", "30D"]);
	});

	it("changes exchange and basis of one side", async () => {
		const rule = await mountRule([
			{ type: "BUY", exchange: "NC1_ASK" },
			{ type: "SELL", exchange: "NC1_BID" },
		]);
		expect(pressed(rule.button("exchanges.rule.mode.separate"))).toBe(
			"true"
		);

		const selects = rule.wrapper.findAllComponents(PSelect);
		selects[1].vm.$emit("update:value", "7D");
		await rule.setProps({});
		expect(last(rule.emitted)).toEqual([
			{ type: "BUY", exchange: "NC1_ASK" },
			{ type: "SELL", exchange: "NC1_7D" },
		]);

		// "Not set" clears one side only
		const notSet = rule.wrapper
			.findAllComponents(PButton)
			.filter((b) => b.text().trim() === "exchanges.rule.not_set");
		await notSet[0].trigger("click");
		await rule.setProps({});
		expect(last(rule.emitted)).toEqual([
			{ type: "SELL", exchange: "NC1_7D" },
		]);
	});

	it("never stores BOTH with BUY or SELL across mode switches", async () => {
		const rule = await mountRule([{ type: "BOTH", exchange: "CI1_ASK" }], {
			isPlanet: true,
		});
		for (const mode of [
			"separate",
			"same",
			"separate",
			"inherit",
			"same",
		]) {
			await rule.click(`exchanges.rule.mode.${mode}`);
			const types = (last(rule.emitted) ?? []).map((o) => o.type);
			expect(types.includes("BOTH") && types.length > 1).toBe(false);
		}
	});

	it("'Use all-planets rule' removes the planet's exchange rules", async () => {
		const rule = await mountRule([{ type: "BOTH", exchange: "CI1_ASK" }], {
			isPlanet: true,
			inherited: [{ type: "BOTH", exchange: "NC1_30D" }],
		});
		await rule.click("exchanges.rule.mode.inherit");
		expect(last(rule.emitted)).toEqual([]);
		expect(rule.wrapper.text()).toContain("exchanges.rule.inherited");
	});
});
