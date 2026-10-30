import { effectScope } from "vue";
import { describe, it, expect } from "vitest";

import { useRunProgress } from "@/util/runProgress";

describe("useRunProgress", () => {
	it("counts the items of a run", () => {
		const { progress, start } = useRunProgress();
		const run = start(3);
		run.step();
		run.step(2);
		expect(progress.value).toEqual({ current: 3, total: 3 });
	});

	it("a start without total keeps the progress", () => {
		const { progress, start } = useRunProgress();
		start(2).step();
		start();
		expect(progress.value).toEqual({ current: 1, total: 2 });
	});

	it("a newer run supersedes an older one", async () => {
		const { progress, start } = useRunProgress();
		const older = start(5);
		const newer = start(2);

		expect(older.isCurrent()).toBe(false);
		expect(await older.yield()).toBe(false);
		older.step();
		expect(progress.value).toEqual({ current: 0, total: 2 });

		expect(newer.isCurrent()).toBe(true);
		expect(await newer.yield()).toBe(true);
	});

	it("cancel drops the run in flight", () => {
		const { start, cancel } = useRunProgress();
		const run = start(1);
		cancel();
		expect(run.isCurrent()).toBe(false);
	});

	it("stops its runs when the owning scope is disposed", () => {
		const scope = effectScope();
		const run = scope.run(() => useRunProgress().start(1))!;
		expect(run.isCurrent()).toBe(true);
		scope.stop();
		expect(run.isCurrent()).toBe(false);
	});
});
