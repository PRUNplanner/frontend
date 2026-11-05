import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import HelpMarkdown from "@/features/help/components/HelpMarkdown.vue";

describe("HelpMarkdown", () => {
	it("renders markdown without script, handlers or javascript: links", () => {
		const wrapper = mount(HelpMarkdown, {
			props: {
				markdown:
					'# Help\n\n<img src="x" onerror="alert(1)">\n\n<script>alert(2)</script>\n\n[a](javascript:alert(3))',
			},
		});

		expect(wrapper.find("h1").text()).toBe("Help");
		expect(wrapper.html()).not.toMatch(/onerror|<script|javascript:/i);
	});
});
