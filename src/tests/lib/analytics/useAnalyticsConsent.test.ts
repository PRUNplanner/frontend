import { describe, it, expect, vi, beforeEach } from "vitest";

import { memoryStorage } from "@/tests/memoryStorage";

const STORAGE_KEY = "prunplanner_analytics_consent";

// module state is read once on import, so each case loads a fresh copy
async function load() {
	vi.resetModules();
	const { useAnalyticsConsent } = await import(
		"@/lib/analytics/useAnalyticsConsent"
	);
	return useAnalyticsConsent();
}

describe("useAnalyticsConsent", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", memoryStorage());
	});

	it("is not asked without a stored choice", async () => {
		const { consent, isDNT } = await load();

		expect(consent.value).toBeNull();
		expect(isDNT).toBe(false);
	});

	it.each(["granted", "denied"])("reads a stored %s", async (value) => {
		localStorage.setItem(STORAGE_KEY, value);

		expect((await load()).consent.value).toBe(value);
	});

	it("ignores an unknown stored value", async () => {
		localStorage.setItem(STORAGE_KEY, "maybe");

		expect((await load()).consent.value).toBeNull();
	});

	it("stores the choice", async () => {
		const { consent, grant, deny } = await load();

		grant();
		expect(consent.value).toBe("granted");
		expect(localStorage.getItem(STORAGE_KEY)).toBe("granted");

		deny();
		expect(consent.value).toBe("denied");
		expect(localStorage.getItem(STORAGE_KEY)).toBe("denied");
	});

	it.each([
		["Do-Not-Track", { doNotTrack: "1" }],
		["Global Privacy Control", { globalPrivacyControl: true }],
	])("is denied with %s, whatever is stored", async (_name, signal) => {
		localStorage.setItem(STORAGE_KEY, "granted");
		vi.stubGlobal("navigator", signal);

		const { consent, isDNT, grant } = await load();
		expect(isDNT).toBe(true);
		expect(consent.value).toBe("denied");

		grant();
		expect(consent.value).toBe("denied");
	});

	it("works when storage is blocked", async () => {
		const blocked = () => {
			throw new Error("blocked");
		};
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });

		const { consent, grant } = await load();
		expect(consent.value).toBeNull();

		// kept for this page load
		grant();
		expect(consent.value).toBe("granted");
	});
});
