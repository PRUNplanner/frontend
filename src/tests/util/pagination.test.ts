import { describe, expect, it } from "vitest";
import type { VNode } from "vue";

import { tablePagination } from "@/util/pagination";

const info = { startIndex: 0, endIndex: 49, pageSize: 50, itemCount: 200 };

describe("tablePagination", () => {
	const pagination = tablePagination(50);

	it("keeps the page size", () => {
		expect(pagination.pageSize).toBe(50);
	});

	it("renders page items as buttons marking the current page", () => {
		const active = pagination.label!({
			type: "page",
			node: 2,
			active: true,
		}) as VNode;
		const other = pagination.label!({
			type: "page",
			node: 3,
			active: false,
		}) as VNode;
		expect(active.type).toBe("button");
		expect(active.props).toMatchObject({
			type: "button",
			"aria-current": "page",
		});
		expect(active.props!["aria-label"]).toBeTruthy();
		expect(other.props!["aria-current"]).toBeUndefined();
	});

	it("disables previous on the first and next on the last page", () => {
		const first = { ...info, page: 1, pageCount: 4 };
		const last = { ...info, page: 4, pageCount: 4 };
		expect((pagination.prev!(first) as VNode).props!.disabled).toBe(true);
		expect((pagination.next!(first) as VNode).props!.disabled).toBe(false);
		expect((pagination.prev!(last) as VNode).props!.disabled).toBe(false);
		expect((pagination.next!(last) as VNode).props!.disabled).toBe(true);
	});
});
