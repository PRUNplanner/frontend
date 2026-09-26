import { describe, it, expect } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";

import RuleGroup from "@/features/market_live/components/RuleGroup.vue";
import DetectorRow from "@/features/market_live/components/DetectorRow.vue";
import PButton from "@/ui/components/PButton.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	Detector,
	RuleGroup as RuleGroupType,
} from "@/features/market_live/cxDetectors.types";

const detector = (
	field: Detector["field"],
	value: number,
	operator: Detector["operator"] = "gt"
): Detector => ({ field, operator, target: { type: "static", value } });

const PRICE = detector("price", 100);
const DEMAND = detector("demand", 5, "lt");
const SUPPLY = detector("supply", 7);

// price > 100 AND (demand < 5 OR supply > 7)
function tree(): RuleGroupType {
	return {
		operator: "AND",
		conditions: [
			PRICE,
			{ operator: "OR", conditions: [DEMAND, SUPPLY] },
		],
	};
}

async function mountGroup(group: RuleGroupType = tree()) {
	const mounted = await mountComponent(RuleGroup, { group });
	/** last group emitted by the top level */
	const lastGroup = () =>
		mounted.component.emitted("update:group")?.at(-1)?.[0] as
			| RuleGroupType
			| undefined;
	return { ...mounted, lastGroup };
}

/** header button of a group, top level first */
async function click(group: VueWrapper, text: string) {
	const button = group
		.findAllComponents(PButton)
		.find((b) => b.text() === text);
	expect(button).toBeDefined();
	await button!.trigger("click");
	await flushPromises();
}

const btn = (key: string) => `market_live.components.rule_builder.buttons.${key}`;

describe("RuleGroup", () => {
	it("renders the tree recursively", async () => {
		const { wrapper } = await mountGroup();

		expect(wrapper.findAllComponents(RuleGroup)).toHaveLength(2);
		expect(
			wrapper.findAllComponents(DetectorRow).map((d) => d.props("modelValue"))
		).toEqual([PRICE, DEMAND, SUPPLY]);
	});

	it("highlights the group's operator and switches it", async () => {
		const { wrapper, lastGroup } = await mountGroup();

		const types = (group: VueWrapper) =>
			group
				.findAllComponents(PButton)
				.filter((b) => ["AND", "OR"].includes(b.text()))
				.map((b) => [b.text(), b.props("type")]);
		expect(types(wrapper.findAllComponents(RuleGroup).at(1)!)).toEqual([
			["AND", "secondary"],
			["OR", "primary"],
		]);

		await click(wrapper, "OR");
		expect(lastGroup()).toEqual({ ...tree(), operator: "OR" });
	});

	it("appends a default condition", async () => {
		const { wrapper, lastGroup } = await mountGroup();

		await click(wrapper, btn("add_condition"));

		expect(lastGroup()!.conditions).toEqual([
			...tree().conditions,
			{ field: "demand", operator: "eq", target: { type: "static", value: 0 } },
		]);
	});

	it("appends an empty AND group", async () => {
		const { wrapper, lastGroup } = await mountGroup();

		await click(wrapper, btn("add_group"));

		expect(lastGroup()!.conditions.at(-1)).toEqual({
			operator: "AND",
			conditions: [],
		});
		expect(lastGroup()!.conditions).toHaveLength(3);
	});

	it("asks its parent to remove it", async () => {
		const { wrapper, component } = await mountGroup();

		await click(wrapper, btn("remove"));

		expect(component.emitted("remove")).toHaveLength(1);
		expect(component.emitted("update:group")).toBeUndefined();
	});

	it("replaces an updated condition", async () => {
		const { wrapper, lastGroup } = await mountGroup();

		const changed = detector("price", 250);
		wrapper
			.findAllComponents(DetectorRow)
			.at(0)!
			.vm.$emit("update:modelValue", changed);
		await flushPromises();

		expect(lastGroup()).toEqual({
			...tree(),
			conditions: [changed, tree().conditions[1]],
		});
	});

	it("removes a condition by index", async () => {
		const { wrapper, lastGroup } = await mountGroup();

		wrapper.findAllComponents(DetectorRow).at(0)!.vm.$emit("remove");
		await flushPromises();

		expect(lastGroup()).toEqual({
			operator: "AND",
			conditions: [tree().conditions[1]],
		});
	});

	it("bubbles a nested edit up as the whole tree", async () => {
		const { wrapper, lastGroup } = await mountGroup();

		// supply > 7 becomes supply < 7 inside the OR group
		wrapper
			.findAllComponents(DetectorRow)
			.at(2)!
			.findAllComponents(PSelect)
			.at(1)!
			.vm.$emit("update:value", "lt");
		await flushPromises();

		expect(lastGroup()).toEqual({
			operator: "AND",
			conditions: [
				PRICE,
				{
					operator: "OR",
					conditions: [DEMAND, detector("supply", 7, "lt")],
				},
			],
		});
	});

	it("bubbles nested adds and removes up", async () => {
		const { wrapper, lastGroup } = await mountGroup();
		const nested = wrapper.findAllComponents(RuleGroup).at(1)!;

		await click(nested, "AND");
		expect(lastGroup()!.conditions[1]).toEqual({
			operator: "AND",
			conditions: [DEMAND, SUPPLY],
		});

		await click(nested, btn("add_group"));
		expect(
			(lastGroup()!.conditions[1] as RuleGroupType).conditions.at(-1)
		).toEqual({ operator: "AND", conditions: [] });

		await click(nested, btn("remove"));
		expect(lastGroup()).toEqual({ operator: "AND", conditions: [PRICE] });
	});

	it("leaves the passed tree untouched", async () => {
		const group = tree();
		const { wrapper } = await mountGroup(group);

		await click(wrapper, btn("add_condition"));
		wrapper.findAllComponents(DetectorRow).at(1)!.vm.$emit("remove");
		await flushPromises();

		expect(group).toEqual(tree());
	});

	it("shows the empty state and unknown conditions", async () => {
		const { wrapper } = await mountGroup({ operator: "AND", conditions: [] });
		expect(wrapper.text()).toContain(
			"market_live.components.rule_builder.empty"
		);

		const { wrapper: broken } = await mountGroup({
			operator: "AND",
			// @ts-expect-error neither detector nor group
			conditions: [{ foo: 1 }],
		});
		expect(broken.text()).toContain(
			"market_live.components.rule_builder.error"
		);
		expect(broken.text()).not.toContain(
			"market_live.components.rule_builder.empty"
		);
	});
});
