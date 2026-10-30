import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PButtonGroup from "@/ui/components/PButtonGroup.vue";
import { buttonGroupConfig } from "@/ui/styles";

describe("PButtonGroup", () => {
	it("joins its buttons in a row", () => {
		const wrapper = mount(PButtonGroup, {
			slots: { default: "<button>A</button><button>B</button>" },
		});

		expect(wrapper.attributes("class")).toContain(
			buttonGroupConfig.horizontal
		);
		expect(wrapper.findAll("button")).toHaveLength(2);
	});

	it("stacks them when vertical", () => {
		const wrapper = mount(PButtonGroup, { props: { vertical: true } });

		expect(wrapper.attributes("class")).toContain(
			buttonGroupConfig.vertical
		);
	});
});
