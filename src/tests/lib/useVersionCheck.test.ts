import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useVersionCheck } from "@/lib/useVersionCheck";

describe("useVersionCheck", () => {
	const LOCAL_KEY = "prunplanner_version";
	const { currentVersion, updateAvailable } = useVersionCheck(10_000);

	// mock localstorage
	beforeEach(() => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
		});

		vi.stubEnv("DEV", false);
		vi.useFakeTimers();

		currentVersion.value = null;
		updateAvailable.value = false;
	});

	// mock fetch
	vi.stubGlobal("fetch", vi.fn());

	afterEach(() => vi.restoreAllMocks());

	it("sets updateAvailable true if no version in localStorage", async () => {
		// localStorage.getItem returns null (first visit)
		(localStorage.getItem as any).mockReturnValue(null);

		// Mock fetch returning a version
		(fetch as any).mockResolvedValue({
			json: async () => ({ version: "1.0.0" }),
		});

		const { currentVersion, updateAvailable, checkVersion } =
			useVersionCheck(10_000);

		await checkVersion();

		expect(currentVersion.value).toBe("1.0.0");
		expect(updateAvailable.value).toBe(true);
		expect(localStorage.getItem).toHaveBeenCalledWith(LOCAL_KEY);
	});

	it("does not set updateAvailable if localStorage matches latest", async () => {
		(localStorage.getItem as any).mockReturnValue("1.0.0");
		(fetch as any).mockResolvedValue({
			json: async () => ({ version: "1.0.0" }),
		});

		const { updateAvailable, checkVersion } = useVersionCheck(1_000);
		await checkVersion();

		expect(updateAvailable.value).toBe(false);
	});

	it("logs warning if fetch fails", async () => {
		(fetch as any).mockRejectedValue(new Error("Network error"));
		// Spy on console.warn
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const { checkVersion } = useVersionCheck();
		await checkVersion();

		expect(warnSpy).toHaveBeenCalledWith(
			"Version check failed",
			expect.any(Error)
		);

		warnSpy.mockRestore();
	});

	it("sets updateAvailable true if version differs", async () => {
		(localStorage.getItem as any).mockReturnValue("1.0.0");
		(fetch as any).mockResolvedValue({
			json: async () => ({ version: "1.1.0" }),
		});

		const { updateAvailable, checkVersion } = useVersionCheck(1_000);
		await checkVersion();

		expect(updateAvailable.value).toBe(true);
	});

	it("markUpdated updates localStorage and clears updateAvailable", async () => {
		(fetch as any).mockResolvedValue({
			json: async () => ({ version: "2.0.0" }),
		});

		const { updateAvailable, markUpdated } = useVersionCheck(10_000);
		updateAvailable.value = true;

		await markUpdated();

		expect(localStorage.setItem).toHaveBeenCalledWith(LOCAL_KEY, "2.0.0");
		expect(updateAvailable.value).toBe(false);
	});

	it("startWatch", async () => {
		const { startWatch, updateAvailable } = useVersionCheck(1_000);
		startWatch();

		expect(updateAvailable.value).toBeFalsy();
	});
});
