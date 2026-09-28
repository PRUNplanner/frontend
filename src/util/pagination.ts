import { h, type VNodeChild } from "vue";
import type { PaginationProps } from "naive-ui";
import type { Composer } from "vue-i18n";
import { ChevronLeftSharp, ChevronRightSharp } from "@vicons/material";

import { i18n } from "@/lib/i18n";

const { t } = i18n.global as unknown as Composer;

// naive-ui handles the click on the item div; the button inside makes it
// reachable by keyboard and gives it a name (click bubbles up)
function itemButton(
	label: string,
	content: VNodeChild,
	extra: Record<string, unknown> = {}
) {
	return h(
		"button",
		{
			type: "button",
			class: "n-pagination-button",
			"aria-label": label,
			...extra,
		},
		[content]
	);
}

/**
 * Pagination for XNDataTable whose items are real buttons
 *
 * @author jplacht
 *
 * @param {number} pageSize Rows per page
 * @returns {PaginationProps} Value for the table's `pagination` prop
 */
export function tablePagination(pageSize: number): PaginationProps {
	return {
		pageSize,
		label: (info) =>
			info.type === "page"
				? itemButton(
						t("common.ui.pagination.page", { page: info.node }),
						info.node,
						{ "aria-current": info.active ? "page" : undefined }
					)
				: itemButton(t("common.ui.pagination.more"), info.node),
		prev: ({ page }) =>
			itemButton(
				t("common.ui.pagination.previous"),
				h(ChevronLeftSharp, { class: "w-4 h-4" }),
				{ disabled: page <= 1 }
			),
		next: ({ page, pageCount }) =>
			itemButton(
				t("common.ui.pagination.next"),
				h(ChevronRightSharp, { class: "w-4 h-4" }),
				{ disabled: page >= pageCount }
			),
	};
}
