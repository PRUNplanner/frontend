import { expect, it, vi } from "vitest";

import PlanLoadView from "@/views/PlanLoadView.vue";
import { mountComponent } from "@/tests/mountComponent";

// apart from this file's own: nothing else imports the two chunks, so their
// factories run only once PlanLoadView starts loading them
const imported = vi.hoisted(() => [] as string[]);
const stub = (name: string) => {
	imported.push(name);
	return { __esModule: true, default: { name, render: () => null } };
};

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock("@unhead/vue", () => ({ useHead: vi.fn() }));
vi.mock("@/router", () => ({ default: { replace: vi.fn() } }));
// the plan data never arrives
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () => ({
	__esModule: true,
	default: { name: "WrapperPlanningDataLoader", render: () => null },
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	stub("WrapperGameDataLoader")
);
vi.mock("@/views/PlanView.vue", () => stub("PlanView"));

it("loads the game data and plan view chunks before the plan data is in", async () => {
	await mountComponent(PlanLoadView);

	expect(imported.sort()).toEqual(["PlanView", "WrapperGameDataLoader"]);
});
