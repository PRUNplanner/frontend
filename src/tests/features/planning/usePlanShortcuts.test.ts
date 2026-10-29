import { describe, it, expect, beforeEach, vi } from "vitest";
import { computed, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { usePlanShortcuts } from "@/features/planning/usePlanShortcuts";
import { useUserStore } from "@/stores/userStore";
import { calcDebug } from "@/lib/debugMode";
import { mountComposable } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanViewProps,
} from "@/features/planning/planView.types";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));

const pinia = createPinia();
const canUndo = ref(true);
const undo = vi.fn();
const redo = vi.fn();
const save = vi.fn();
const openSaveAsModal = vi.fn();
const canSave = ref(true);

function press(key: string, init: KeyboardEventInit = {}, target?: Element) {
	const e = new KeyboardEvent("keydown", {
		key,
		ctrlKey: true,
		bubbles: true,
		cancelable: true,
		...init,
	});
	(target ?? window).dispatchEvent(e);
	return e;
}

async function mountShortcuts(props: Partial<IPlanViewProps> = {}) {
	const calculation = {
		canUndo,
		canRedo: ref(true),
		undo,
		redo,
	} as unknown as IPlanCalculation;
	return mountComposable(
		() =>
			usePlanShortcuts(calculation, props as IPlanViewProps, {
				canSave: computed(() => canSave.value),
				save,
				openSaveAsModal,
			}),
		{ pinia }
	);
}

describe("usePlanShortcuts", () => {
	beforeEach(() => {
		setActivePinia(pinia);
		vi.clearAllMocks();
		canSave.value = true;
		canUndo.value = true;
		calcDebug.value = false;
	});

	it("saves on Ctrl+S, never opening the browser's dialog", async () => {
		await mountShortcuts();
		const e = press("s");
		expect(e.defaultPrevented).toBe(true);
		expect(save).toHaveBeenCalledWith("shortcut");

		canSave.value = false;
		expect(
			press("S", { metaKey: true, ctrlKey: false }).defaultPrevented
		).toBe(true);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it("opens Save as on a shared plan, only when logged in", async () => {
		await mountShortcuts({ shared: true });
		press("s");
		expect(openSaveAsModal).not.toHaveBeenCalled();

		useUserStore().$patch({ accessToken: "a", refreshToken: "r" });
		press("s");
		expect(openSaveAsModal).toHaveBeenCalledTimes(1);
		expect(save).not.toHaveBeenCalled();
	});

	it("undoes and redoes, tracked, but not in text fields or disabled", async () => {
		await mountShortcuts();
		press("z");
		press("z", { shiftKey: true });
		expect(undo).toHaveBeenCalledTimes(1);
		expect(redo).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("plan:undo", {
			trigger: "shortcut",
		});
		expect(trackEvent).toHaveBeenCalledWith("plan:redo", {
			trigger: "shortcut",
		});

		const input = document.createElement("input");
		document.body.append(input);
		expect(press("z", {}, input).defaultPrevented).toBe(false);
		input.remove();
		expect(undo).toHaveBeenCalledTimes(1);
	});

	it("tracks an undo only when there is one", async () => {
		const { result } = await mountShortcuts();
		canUndo.value = false;
		result.trackedUndo("button");
		expect(undo).toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("toggles calculation debug with Ctrl+` only in debug mode", async () => {
		const { result } = await mountShortcuts();
		press("`", { code: "Backquote" });
		expect(result.refShowCalcDebug.value).toBe(false);

		calcDebug.value = true;
		press("`", { code: "Backquote" });
		expect(result.refShowCalcDebug.value).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("debug:calc_open", {
			source: "shortcut",
		});
	});

	it("ignores keys without Ctrl/Cmd and stops listening on unmount", async () => {
		const { wrapper } = await mountShortcuts({ disabled: true });
		press("s", { ctrlKey: false });
		press("z");
		expect(save).not.toHaveBeenCalled();
		expect(undo).not.toHaveBeenCalled();

		wrapper.unmount();
		press("s");
		expect(save).not.toHaveBeenCalled();
	});
});
