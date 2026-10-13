import { afterEach, describe, expect, it } from "vitest";
import {
	DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
} from "@vue/test-utils";
import { createI18n } from "vue-i18n";

import PConfirmHost from "@/ui/components/PConfirmHost.vue";
import { settleConfirm, useConfirm } from "@/ui/useConfirm";

enableAutoUnmount(afterEach);
afterEach(() => settleConfirm(false));

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });
const body = () => new DOMWrapper(document.body);

describe("PConfirmHost", () => {
	it("asks in a 446 px modal with a destructive positive button", async () => {
		mount(PConfirmHost, { global: { plugins: [i18n] }, attachTo: document.body });
		void useConfirm()({
			title: "Delete plan?",
			content: "It can't be restored.",
			positiveText: "Delete",
			negativeText: "Cancel",
		});
		await flushPromises();
		const dialog = body().find<HTMLElement>("[role=dialog]");
		const buttons = dialog.findAll("button").filter((b) => b.text());

		expect(dialog.element.style.width).toBe("446px");
		expect(dialog.text()).toContain("It can't be restored.");
		expect(buttons.map((b) => b.text())).toEqual(["Cancel", "Delete"]);
		expect(buttons[1].classes()).toContain("bg-negative");
	});
});
