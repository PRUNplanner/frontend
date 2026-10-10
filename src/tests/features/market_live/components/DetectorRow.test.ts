import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import DetectorRow from "@/features/market_live/components/DetectorRow.vue";
import TargetEditor from "@/features/market_live/components/TargetEditor.vue";
import PButton from "@/ui/components/PButton.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";
import market_live from "@/locales/en_US/market_live.json";

// Types & Interfaces
import type { Detector } from "@/features/market_live/cxDetectors.types";

const PRICE: Detector = {
	field: "price",
	operator: "gt",
	target: { type: "static", value: 100 },
};
const TICKER: Detector = {
	field: "material_ticker",
	operator: "matches",
	target: { type: "static", value: "RAT" },
};

async function mountRow(modelValue: Detector = PRICE) {
	const mounted = await mountComponent(
		DetectorRow,
		{ modelValue },
		{ messages: { market_live } }
	);
	const lastDetector = () =>
		mounted.component.emitted("update:modelValue")?.at(-1)?.[0] as
			Detector | undefined;
	return { ...mounted, lastDetector };
}

const selects = (wrapper: VueWrapper) => {
	const [field, operator] = wrapper.findAllComponents(PSelect);
	return { field, operator };
};

async function select(select: VueWrapper, value: string) {
	select.vm.$emit("update:value", value);
	await flushPromises();
}

const values = (select: VueWrapper) =>
	(select.props() as { options: { value: string }[] }).options.map(
		(o) => o.value
	);

describe("DetectorRow", () => {
	it("offers every field and the field's operators", async () => {
		const { wrapper } = await mountRow();
		const { field, operator } = selects(wrapper);

		expect(values(field)).toHaveLength(23);
		expect(
			(field.props("options") as { label: string; value: string }[]).at(0)
		).toEqual({ label: "Ticker", value: "material_ticker" });
		expect(field.text()).toContain("Price");

		expect(operator.props("options")).toEqual([
			{ label: "GT", value: "gt" },
			{ label: "LT", value: "lt" },
			{ label: "EQ", value: "eq" },
			{ label: "NEQ", value: "neq" },
		]);
		expect(operator.text()).toContain("GT");
	});

	it("configures the target for the field type", async () => {
		const { wrapper } = await mountRow(TICKER);

		expect(values(selects(wrapper).operator)).toEqual(["matches"]);
		expect(wrapper.findComponent(TargetEditor).props()).toMatchObject({
			modelValue: TICKER.target,
			operator: "matches",
			fieldType: "string",
		});
	});

	it("emits the detector with a changed operator", async () => {
		const { wrapper, lastDetector } = await mountRow();

		await select(selects(wrapper).operator, "neq");

		expect(lastDetector()).toEqual({ ...PRICE, operator: "neq" });
	});

	it("keeps operator and target for a field of the same type", async () => {
		const { wrapper, lastDetector } = await mountRow();

		await select(selects(wrapper).field, "spread_pct");

		expect(lastDetector()).toEqual({ ...PRICE, field: "spread_pct" });
	});

	it("resets operator and target for a field of another type", async () => {
		const { wrapper, lastDetector } = await mountRow();

		// "gt" and 100 mean nothing for a ticker
		await select(selects(wrapper).field, "material_ticker");
		expect(lastDetector()).toEqual({
			field: "material_ticker",
			operator: "matches",
			target: { type: "static", value: "" },
		});

		const { wrapper: ticker, lastDetector: lastTicker } =
			await mountRow(TICKER);
		await select(selects(ticker).field, "ask");
		expect(lastTicker()).toEqual({
			field: "ask",
			operator: "gt",
			target: { type: "static", value: 0 },
		});
	});

	it("emits the detector with a changed target", async () => {
		const { wrapper, lastDetector } = await mountRow();

		wrapper
			.findComponent(TargetEditor)
			.vm.$emit("update:modelValue", { type: "previous_pct", offset: 5 });
		await flushPromises();

		expect(lastDetector()).toEqual({
			...PRICE,
			target: { type: "previous_pct", offset: 5 },
		});
	});

	it("follows a new model value", async () => {
		const { wrapper, setProps } = await mountRow();

		await setProps({ modelValue: TICKER });

		expect(values(selects(wrapper).operator)).toEqual(["matches"]);
		expect(wrapper.findComponent(TargetEditor).props("fieldType")).toBe(
			"string"
		);
	});

	it("asks its group to remove it", async () => {
		const { wrapper, component } = await mountRow();

		await wrapper.findComponent(PButton).trigger("click");

		expect(component.emitted("remove")).toHaveLength(1);
		expect(component.emitted("update:modelValue")).toBeUndefined();
	});
});
