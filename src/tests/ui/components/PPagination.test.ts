import { afterEach, describe, expect, it } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

import { createI18n } from "vue-i18n";

import PPagination from "@/ui/components/PPagination.vue";

enableAutoUnmount(afterEach);

function mountPagination(pageCount: number, start = 1) {
	const page = ref(start);
	const i18n = createI18n({
		legacy: false,
		locale: "en_US",
		messages: {
			en_US: {
				common: {
					ui: {
						pagination: {
							previous: "Previous page",
							next: "Next page",
							page: "Page {page}",
							more: "More pages",
						},
					},
				},
			},
		},
	});
	const wrapper = mount(
		defineComponent({
			setup: () => () =>
				h(PPagination, {
					page: page.value,
					pageCount,
					"onUpdate:page": (p: number) => (page.value = p),
				}),
		}),
		{ global: { plugins: [i18n] } }
	);
	const labels = () =>
		wrapper.findAll("button").map((b) => b.text() || b.attributes("aria-label"));
	return { wrapper, page, labels };
}

describe("PPagination", () => {
	it("shows every page up to nine, the current one marked", () => {
		const { wrapper, labels } = mountPagination(3, 2);
		expect(labels()).toEqual(["Previous page", "1", "2", "3", "Next page"]);
		const current = wrapper.find('[aria-current="page"]');
		expect(current.text()).toBe("2");
		expect(current.attributes("aria-label")).toBe("Page 2");
	});

	it("disables previous on the first and next on the last page", async () => {
		const { wrapper, page } = mountPagination(2);
		const [prev, , , next] = wrapper.findAll("button");
		expect(prev.attributes("disabled")).toBeDefined();
		expect(next.attributes("disabled")).toBeUndefined();
		await next.trigger("click");
		expect(page.value).toBe(2);
		expect(wrapper.findAll("button")[3].attributes("disabled")).toBeDefined();
		await wrapper.findAll("button")[0].trigger("click");
		expect(page.value).toBe(1);
	});

	it("folds long ranges into … jumps", async () => {
		const { wrapper, page, labels } = mountPagination(20, 10);
		expect(labels()).toEqual(["Previous page", "1", "…", "8", "9", "10", "11", "12", "…", "20", "Next page"]);
		expect(wrapper.findAll('[aria-label="More pages"]')).toHaveLength(2);
		// the right … jumps past the window
		await wrapper.findAll('[aria-label="More pages"]')[1].trigger("click");
		expect(page.value).toBe(13);

		expect(mountPagination(20, 1).labels()).toEqual(["Previous page", "1", "2", "3", "4", "5", "6", "7", "…", "20", "Next page"]);
		expect(mountPagination(20, 20).labels()).toEqual(["Previous page", "1", "…", "14", "15", "16", "17", "18", "19", "20", "Next page"]);
	});
});
