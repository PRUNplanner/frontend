import { afterEach, describe, expect, it } from "vitest";
import {
	DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
} from "@vue/test-utils";
import { createI18n } from "vue-i18n";

import PConfirmHost from "@/ui/components/PConfirmHost.vue";
import { useConfirm } from "@/ui/useConfirm";

enableAutoUnmount(afterEach);

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });
const body = () => new DOMWrapper(document.body);
const OPTIONS = {
	title: "Delete CX?",
	content: "All preferences go too.",
	positiveText: "Delete",
	negativeText: "Cancel",
};

// mounts the host and asks; resolves with the answer
async function ask() {
	mount(PConfirmHost, { global: { plugins: [i18n] } });
	const answer = useConfirm()(OPTIONS);
	await flushPromises();
	return answer;
}

function button(text: string) {
	return body()
		.findAll("[role=dialog] button")
		.find((b) => b.text() === text)!;
}

describe("useConfirm", () => {
	it("shows the question and resolves true on the positive button", async () => {
		const answer = ask();
		await flushPromises();
		const dialog = body().find("[role=dialog]");
		expect(dialog.find("h2").text()).toBe("Delete CX?");
		expect(dialog.text()).toContain("All preferences go too.");

		await button("Delete").trigger("click");
		expect(await answer).toBe(true);
		await flushPromises();
		expect(body().find("[role=dialog]").exists()).toBe(false);
	});

	it("resolves false on Cancel and on Esc", async () => {
		const cancelled = ask();
		await flushPromises();
		await button("Cancel").trigger("click");
		expect(await cancelled).toBe(false);

		const escaped = useConfirm()(OPTIONS);
		await flushPromises();
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
		);
		expect(await escaped).toBe(false);
	});

	it("answers an open question false when a new one comes", async () => {
		const first = ask();
		await flushPromises();
		const second = useConfirm()(OPTIONS);

		expect(await first).toBe(false);
		await flushPromises();
		await button("Delete").trigger("click");
		expect(await second).toBe(true);
	});
});
