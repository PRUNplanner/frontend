import { afterEach, describe, it, expect } from "vitest";

import { i18n } from "@/lib/i18n";
import { XITSTATIONWAREHOUSES } from "@/features/xit/xitConstants";

describe("xitConstants", async () => {
	afterEach(() => {
		i18n.global.locale.value = "en_US";
	});

	it("XITSTATIONWAREHOUSES must have all warehouses + configure", async () => {
		expect(XITSTATIONWAREHOUSES.length).toBe(7);
	});

	it("labels 'Configure on Execution' in the locale, the value stays", () => {
		const [configure] = XITSTATIONWAREHOUSES;
		expect(configure).toMatchObject({
			label: "Configure on Execution",
			value: "Configure on Execution",
		});

		i18n.global.mergeLocaleMessage("de_DE", {
			xit: { form: { configure_on_execution: "Bei Ausführung wählen" } },
		});
		i18n.global.locale.value = "de_DE";
		expect(configure.label).toBe("Bei Ausführung wählen");
		expect(configure.value).toBe("Configure on Execution");
	});
});
